import logging
import sys
import csv
import datetime
import math
import json
import bisect
import cProfile

def createParameters():
    # set variables that determine how the data is analysed - need to include all parameters
    parameters = {}
    parameters["version"] = "0.0.05"
    parameters["datetime"] = {}
    parameters["datetime"]["date"] = str(datetime.date.today())
    parameters["datetime"]["time"] = str(datetime.datetime.now().time())
    parameters["namespace"] = {}
    parameters["namespace"]["hero_namespace"] = 100
    parameters["namespace"]["kills_namespace"] = 10000
    parameters["namespace"]["normal_namespace"] = 11000
    parameters["namespace"]["fights_namespace"] = 15000
    parameters["namespace"]["creeps_namespace"] = 20000
    parameters["namespace"]["camera_namespace"] = 30000

    parameters["general"] = {}
    parameters["general"]["num_players"] = 10
    parameters["map"] = {}
    parameters["map"]["xmin"] = -8200
    parameters["map"]["xmax"] = 8000
    parameters["map"]["ymin"] = -8200
    parameters["map"]["ymax"] = 8000
    parameters["map"]["num_box"] = 32
    parameters["pregame_time_shift"] = 60
    # function specific parameters

    parameters["heroPositions"] = {}
    parameters["heroPositions"]["sample_step_size"] = 150
    parameters["heroPositions"]["sample_step_size_hifi"] = 1

    parameters["heroTrajectories"] = {}
    parameters["heroTrajectories"]["delta"] = 1000
    parameters["heroTrajectories"]["min_timespan"] = 3

    parameters["goldXPInfo"] = {}
    parameters["goldXPInfo"]["bin_size"] = 2

    parameters["makeAttackList"] = {}
    parameters["makeAttackList"]["bin_size"] = 1 

    parameters["graphAttacks"] = {}
    parameters["graphAttacks"]["damage_threshold"] = 50

    parameters["formAdjacencyMatrix"] = {}
    parameters["formAdjacencyMatrix"]["distance_threshold"] = 300
    parameters["formAdjacencyMatrix"]["radius"] = 1500
    parameters["formAdjacencyMatrix"]["w_space1"] = 0.02
    parameters["formAdjacencyMatrix"]["w_space2"] = 0.3
    parameters["formAdjacencyMatrix"]["w_time"] = 80

    parameters["initiationDamage"] = {}
    parameters["initiationDamage"]["initiation_window"] = 1 #time window in seconds that we consider to be when initiating

    parameters["fightEvaluation"] = {}
    parameters["fightEvaluation"]["alpha"] = 150
    parameters["fightEvaluation"]["kappa"] = 0.15
    parameters["fightEvaluation"]["time_threshold"] = 2

    parameters["cameraEvaluation"] = {}
    parameters["cameraEvaluation"]["jump_threshold"] = 1500
    parameters["cameraEvaluation"]["self_range"] = 1500

    return parameters

def transformHeroName(name):
    #transform dota_npc_hero_name_of_hero into name_of_hero
    hero_name_list = name.split("_")
    hero_name_list = hero_name_list[3:] # remove the unnecessary dota_npc_hero part
    return "_".join(hero_name_list) # join the strings back together

def transformTime(match, t_string):
    return float(t_string) - match["times"]["match_start_time"]

def findTimeTick(match, time):
    #Find leftmost tick greater than or equal to x
    i = bisect.bisect_left(match["trajectories"]["time"], time)
    if i != len(match["trajectories"]["time"]):
        return i
    raise ValueError

def loadFiles(match_id, match_directory):
    #load in the raw data from the csv files
    match = {}
    match["result"] = {
        "header": {},
        "entities": {},
        "events": {},
        "timeseries": {}
    }

    match["parameters"] = createParameters()
    
    match["result"]["header"] = {
            "id": match_id,
            "draft": {},
            "length": 0,
            "teams": {}, 
            "winner": None, 
            "players": {},
            "parameters": match["parameters"]
        }

    match["result"]["header"]["teams"] = {
        0:{
            "side":"radiant",
            "name":"empty",
            "short":"empty"},
        1:{
            "side":"dire",
            "name":"empty",
            "short":"empty"}
    }

    match["players"] = {}
    match["heroes"] = {}  

    header_input_filename = match_directory+"/header.csv"
    with open(header_input_filename,'rb') as f:
        for i, row in enumerate(f):
            row = row.split(",")
            if row[0].upper() == "TEAM_TAG_RADIANT":
                if row[1] == " ":
                    match["result"]["header"]["teams"][0]["name"] = "empty"
                else:            
                    match["result"]["header"]["teams"][0]["name"] = row[1]
            elif row[0].upper() == "TEAM_TAG_DIRE":
                if row[1] == " ":
                    match["result"]["header"]["teams"][1]["name"] = "empty"
                else:            
                    match["result"]["header"]["teams"][1]["name"] = row[1]
            elif row[0].upper() == "PLAYER":
                player_index = int(row[1])
                new_player = {}        
                player_name_string = row[2]
                player_name_list = player_name_string.split( )
                player_name = "".join(player_name_list)
                new_player["name"] = player_name
                new_player["steam_id"] = row[3]
                # form the heroes dictionary
                hero_name = transformHeroName(row[4])
                new_player["hero"] = hero_name
                match["players"][player_index] = new_player
                match["result"]["header"]["players"][player_index] = new_player

                new_hero = {}
                new_hero["player_index"] = player_index
                entity_id = match["parameters"]["namespace"]["hero_namespace"] + player_index
                new_hero["entity_id"] = entity_id
                if int(row[5]) == 2:
                    new_hero["side"] = "radiant"
                elif int(row[5]) == 3:
                    new_hero["side"] = "dire"
                match["heroes"][hero_name] = new_hero
            elif row[0] == "WINNER":
                match["result"]["header"]["winner"] = row[1].strip()

    match["times"] = {}
    match["times"]["match_start_time"] = 0
    match["times"]["pregame_start_time"] = 0
    match["times"]["match_end_time"] = 0
    match["times"]["total_match_time"] = 0

    #extract absolute times at which the match starts and ends
    events_input_filename = match_directory + "/events.csv"
    with open(events_input_filename,'rb') as f:
        for i, row in enumerate(f):
            row = row.strip().split(",")
            if i == 0:
                first_timestamp = math.floor(float(row[0]))
            if row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "5":
                match["times"]["match_start_time"] = math.floor(float(row[0]))
            elif row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "4":
                match["times"]["pregame_start_time"] = math.floor(float(row[0]))
            elif row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "6":
                match["times"]["match_end_time"]  = math.floor(float(row[0]))
           
    match["times"]["total_match_time"] = match["times"]["match_end_time"] - match["times"]["match_start_time"] 
    match["result"]["header"]["length"] = match["times"]["total_match_time"]

    match["events"] = {}
    match["events"]["match-events"] = []
    match["events"]["gold_exp_events"] = []
    match["events"]["damage_events"] = []

    #extract events and shift timestamps
    with open(events_input_filename,'rb') as f:
        for i, row in enumerate(f):
            row = row.strip().split(",")
            absolute_time = float(row[0])
            if (absolute_time >= match["times"]["pregame_start_time"]) and (absolute_time <= match["times"]["match_end_time"]):
                row[0] = transformTime(match,row[0])
                match["events"]["match-events"].append(row)
                if row[1] == "DOTA_COMBATLOG_GOLD" or row[1] == "DOTA_COMBATLOG_XP" or row[1] == "OVERHEAD_ALERT_GOLD" or row[1] == "OVERHEAD_ALERT_DENY" or row[1] == "DOTA_COMBATLOG_DEATH":
                    match["events"]["gold_exp_events"].append(row)
                elif row[1]=="DOTA_COMBATLOG_DAMAGE" and row[2]!="null":
                    match["events"]["damage_events"].append(row)

    match["trajectories"] = {
        "time" : []
    }

    for hero in match["heroes"]:
        match["trajectories"][hero] = {
           "position": [],
            "camera": [],
            "mouse": [],
            "hp": [],
            "mana": []
        }

    trajectories_input_filename = match_directory+"/trajectories.csv"
    with open(trajectories_input_filename,'rb') as file:
        reader = csv.DictReader(file)    
        for i, row in enumerate(reader):
            absolute_time = float(row["time"])
            if (absolute_time >= match["times"]["pregame_start_time"]) and (absolute_time <= match["times"]["match_end_time"]):
                t = transformTime(match, row["time"])
                match["trajectories"]["time"].append(t)
                for hero in match["heroes"]:
                    index = match["heroes"][hero]["player_index"]
                    v_position = [float(row["{}X".format(index)]),float(row["{}Y".format(index)])]
                    v_cam = [float(row["{}CamX".format(index)]),float(row["{}CamY".format(index)])]
                    v_mouse = [float(row["{}MouseX".format(index)]),float(row["{}MouseX".format(index)])]
                    hp = [float(row["{}HP".format(index)])]
                    mana = [float(row["{}Mana".format(index)])]

                    match["trajectories"][hero]["position"].append(v_position)
                    match["trajectories"][hero]["camera"].append(v_cam)
                    match["trajectories"][hero]["mouse"].append(v_mouse)
                    match["trajectories"][hero]["hp"].append(hp)
                    match["trajectories"][hero]["mana"].append(mana)

    match["entities"] = {}
    match["entities"]["death_rows"] = []
    match["entities"]["spawn_rows"] = []
    match["entities"]["unit_selection_rows"] = []
    match["entities"]["visibility_rows"] = []
    match["entities"]["creep_positions"] = {}

    entities_input_filename = match_directory+"/ents.csv"
    with open(entities_input_filename, 'rb') as csvfile:
        entity_reader = csv.reader(csvfile)
        for i, row in enumerate(entity_reader):
            absolute_time = float(row[0])
            #the time filtering is different in this case as otherwise can miss spawns
            if absolute_time <= match["times"]["match_end_time"]:
                row[0] = transformTime(match,row[0])
                if row[1]=="DEATH":
                    match["entities"]["death_rows"].append(row)
                elif row[1]=="SPAWN":
                    match["entities"]["spawn_rows"].append(row)
                elif row[1]=="PLAYER_CHANGE_SELECTION":
                    match["entities"]["unit_selection_rows"].append(row)
                elif row[1]=="HERO_VISIBILITY":
                    match["entities"]["visibility_rows"].append(row)
    return match

def makeUnits(match):
    # instantiate the units and their attributes
    for hero in match["heroes"]:
        match["result"]["entities"][match["heroes"][hero]["entity_id"]] = {
                "unit":hero,
                "team": match["heroes"][hero]["side"],
                "control":match["heroes"][hero]["player_index"],
                "position":[],
                "visibility": None,
                "kills": 0,
                "deaths": 0
            }

def processHeroVisibility(match):
    # find times during match when heros are visible to enemies
    for hero in match["heroes"]:
        match["result"]["entities"][match["heroes"][hero]["entity_id"]]["visibility"] = {"format":"changelist", "samples":[]}

    for row in match["entities"]["visibility_rows"]:
        enemy_visibility_bit = 0
        hero = transformHeroName(row[2])
        if not hero in match["heroes"]:
            continue
        if match["heroes"][hero]["side"] == "radiant":
            enemy_visibility_bit = 3
        elif match["heroes"][hero]["side"] == "dire":
            enemy_visibility_bit = 2
        else:
            pass
        visible_to_enemy = (int(row[4]) & (1 << enemy_visibility_bit)) >> enemy_visibility_bit
        match["result"]["entities"][match["heroes"][hero]["entity_id"]]["visibility"]["samples"].append({"t": row[0], "v": [visible_to_enemy]})

def processHeroKills(match):
    # find the number of kills and deaths for each player
    killNum  = 0
    for row in match["events"]["match-events"]:
        # for each row check if a death occurred
        if row[1] == "DOTA_COMBATLOG_DEATH":
            killer = row[3]
            deceased = row[2]
            # now check if it was a hero that died
            if deceased.split("_")[2] == "hero":
                # look up which side the hero was on
                killer_name = transformHeroName(killer)
                deceased_name = transformHeroName(deceased)
                if not deceased_name in match["heroes"]:
                    logging.info("bad deceased name" + deceased)
                    continue
                side = match["heroes"][deceased_name]["side"]
                # now form a dictionary that will be stored as an event 
                id_num = match["parameters"]["namespace"]["kills_namespace"]+killNum
                death_time = row[0]
                new_event = {"type":"kill","time": death_time,"team":side,"deceased":deceased_name,"killer":killer_name}
                # put kill event in the events dictionary
                match["result"]["events"][str(id_num)] = new_event
                #add kill to the killers total
                if killer_name in match["heroes"]:
                    match["result"]["entities"][match["heroes"][killer_name]["entity_id"]]["kills"] += 1
                match["result"]["entities"][match["heroes"][deceased_name]["entity_id"]]["deaths"] += 1
                killNum += 1

def processHeroPosition(match):
    # extract the [x,y] coordinates for each hero and collect into trajectories 
    hero_spawns = {}
    hero_deaths = {}
    hero_lives = {}
    for hero in match["heroes"]: 
        hero_spawns[hero] = []
        hero_deaths[hero] = []
        hero_lives[hero] = []

    for spawn_row in match["entities"]["spawn_rows"]:
        if spawn_row[2].startswith("npc_dota_hero_"):
            if "ingame-entity" not in match["heroes"][transformHeroName(spawn_row[2])]:
                match["heroes"][transformHeroName(spawn_row[2])]["ingame-entity"] = spawn_row[3]
            #filter illusions
            if spawn_row[3] == match["heroes"][transformHeroName(spawn_row[2])]["ingame-entity"]:
                hero_spawns[transformHeroName(spawn_row[2])].append(spawn_row[0])

    for death_row in match["entities"]["death_rows"]:
        if death_row[2].startswith("npc_dota_hero_"):
            #filter illusions
            if death_row[3] == match["heroes"][transformHeroName(death_row[2])]["ingame-entity"]:
                hero_deaths[transformHeroName(death_row[2])].append(death_row[0])

    for hero in match["heroes"]:
        for i in range(0,len(hero_spawns[hero])):
            start = hero_spawns[hero][i]
            if i < len(hero_deaths[hero]):
                end = hero_deaths[hero][i]                
            elif i == len(hero_deaths[hero]):
                #complete life for heros that are alive at the end of the match
                end = match["trajectories"]["time"][-1]
            else:
                print hero_spawns[hero]
                print hero_deaths[hero]
                raise Exception("hero dies n times and spawns n+2 or more times")
            if start > end:
                print hero
                print hero_spawns[hero]
                print hero_deaths[hero]
                raise Exception("hero dies before they spawn!")
            else:
                hero_lives[hero].append({"start":start,"end":end })

    for hero in match["heroes"]:
        for life in hero_lives[hero]:
            start_index = findTimeTick(match, life["start"])
            end_index = findTimeTick(match, life["end"])

            samples_list =[]
            i = start_index
            while i <= end_index:
                if i % match["parameters"]["heroPositions"]["sample_step_size"] == 0 or i == end_index:
                    samples_list.append({
                        "t":match["trajectories"]["time"][i],
                        "v":match["trajectories"][hero]["position"][i]
                        })
                i += 1

            stored = {
                "time-start": life["start"],
                "time-end": life["end"],
                "timeseries":{"format":"samples","samples":samples_list}
                }

            match["result"]["entities"][ match["heroes"][hero]["entity_id"]]["position"].append(stored)

def processGoldXP(match):
    # calculates radiant and dire gold/exp and individual hero gold/exp
    hero_gold = {}
    hero_exp = {}
    for hero in match["heroes"]:
        hero_gold[hero] = 0    
        hero_exp[hero] = 0

    gold = []
    exp = []

    radiant_gold_total = 0
    dire_gold_total = 0
    radiant_exp_total = 0
    dire_exp_total = 0

    for row in match["events"]["gold_exp_events"]:
        if row[1] == "DOTA_COMBATLOG_XP":
            hero_name = transformHeroName(row[2]) #receiver
            if not hero_name in match["heroes"]:
                continue
            exp_amount = int(float(row[3]))
            hero_exp[hero_name] += exp_amount
            side = match["heroes"][hero_name]["side"]
            if side == "radiant":
                radiant_exp_total += exp_amount
            elif side == "dire":
                dire_exp_total += exp_amount
            exp.append({"t":row[0],"v":radiant_exp_total - dire_exp_total})
        elif row[1] == "DOTA_COMBATLOG_GOLD":
            hero_name = transformHeroName(row[2]) #receiver
            if not hero_name in match["heroes"]:
                continue
            gold_amount = int(float(row[4]))
            side = match["heroes"][hero_name]["side"]
            if row[3] == "receives":
                hero_gold[hero_name] += gold_amount
                if side == "radiant":
                    radiant_gold_total += gold_amount
                elif side == "dire":
                    dire_gold_total += gold_amount
            elif row[3] == "looses":
                hero_gold[hero_name] -= gold_amount
                if side == "radiant":
                    radiant_gold_total -= gold_amount
                elif side == "dire":
                    dire_gold_total -= gold_amount
            gold.append({"t":row[0],"v":radiant_gold_total - dire_gold_total})

    for hero in match["heroes"]:
        match["result"]["entities"][match["heroes"][hero]["entity_id"]]["GPM"] = math.floor(60*hero_gold[hero]/match["times"]["total_match_time"])
        match["result"]["entities"][match["heroes"][hero]["entity_id"]]["XPM"] = math.floor(60*hero_exp[hero]/match["times"]["total_match_time"])

    match["result"]["timeseries"] = {"gold-advantage":{"format":"samples","samples":gold},"exp-advantage":{"format":"samples","samples":exp}}

def processCameraControl(match):
    # extract which units players select and for how long from the unit_selection_rows
    last_selection = {}
    for player in match["players"]:
        last_selection[str(player)] = {"unit":None, "t":0}

    camera_event_counter = 0
    for row in match["entities"]["unit_selection_rows"]:
        if not row[2] in last_selection:
            continue
        if last_selection[row[2]]["unit"] is not None and last_selection[row[2]]["unit"] != "":
            event_id = match["parameters"]["namespace"]["camera_namespace"] + camera_event_counter
            event = {
                    "type": "unit-selection",
                    "time-start": last_selection[row[2]]["t"],
                    "time-end":row[0],
                    "player": int(row[2]),
                    "unit": last_selection[row[2]]["unit"]
                    }
            match["result"]["events"][str(event_id)] = event
            camera_event_counter += 1
        last_selection[row[2]]["t"] = row[0]
        last_selection[row[2]]["unit"] = row[4]

def makeStats(match):
    # instantiate the stats variables that will be filled in by subsequent evaluation functions
    match["stats"] = {
        "match-stats": {},
        "player-stats": {}
    }

    match["stats"]["match-stats"]["winner"] = match["result"]["header"]["winner"]
    match["stats"]["match-stats"]["duration"] = match["times"]["total_match_time"]
    match["stats"]["match-stats"]["duration-all"] = match["times"]["match_end_time"] - match["times"]["pregame_start_time"]
    match["stats"]["match-stats"]["creeps-killed"] = 0
    match["stats"]["match-stats"]["creeps-lasthit"] = 0

    for player in match["players"]:
        match["stats"]["player-stats"][player] = {
                "kills": 0,
                "deaths": 0,
                "n-checks": 0,
                "average-check-duration": 0
            }

def evaluateCameraControl(match):
    # evaluate the number of checks and average check duration of each player 
    for event_id in match["result"]["events"]:
        event = match["result"]["events"][str(event_id)]
        if event["type"] == "unit-selection":
            match["stats"]["player-stats"][event["player"]]["n-checks"] += 1
            match["stats"]["player-stats"][event["player"]]["average-check-duration"] += ((event["time-end"] - event["time-start"]) - match["stats"]["player-stats"][event["player"]]["average-check-duration"])/ match["stats"]["player-stats"][event["player"]]["n-checks"]

def process(match):
    # extract information from the raw data to create events that will be used in the visualisation
    makeUnits(match)
    processHeroVisibility(match)
    processHeroKills(match)
    processHeroPosition(match)
    processGoldXP(match)
    processCameraControl(match)
    

def computeStats(match):
    # compute the statistics that will be used as features in the machine learning model
    makeStats(match)
    evaluateCameraControl(match)

def writeToJson(filename,dictionary):
    # given a filename and a dictionary write the dictionary to a JSON file named filename.json
    my_file = open(filename,'wb')
    my_file.write(json.dumps(dictionary, sort_keys=True,indent=4, separators=(',', ': ')))    
    my_file.close()

def main():
    match_id = sys.argv[1]
    match_directory = sys.argv[2]
    analysis_filename = sys.argv[3]
    header_filename = sys.argv[4]
    stats_filename = sys.argv[5]

    match = loadFiles(match_id, match_directory)

    process(match)
    computeStats(match)

    writeToJson(analysis_filename,match["result"])
    writeToJson(header_filename,match["result"]["header"])
    writeToJson(stats_filename,match["stats"])
    
    #delete intermediate/input files
    #shutil.rmtree(match_directory)

if __name__ == "__main__":
    cProfile.run('main()')
    main()