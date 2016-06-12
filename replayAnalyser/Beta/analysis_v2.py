import logging
import sys
import csv
import datetime
import math
import json
import bisect

def createParameters():
    # variables that determine how the data is analysed - need to include all parameters
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
    hero_name_list = name.split("_")
    hero_name_list = hero_name_list[3:] # remove the unnecessary dota_npc_hero part
    return "_".join(hero_name_list) # join the strings back together

def transformTime(match, t_string):
    return float(t_string) - match["match_start_time"]


def findTimeTick(match, time):
    #Find leftmost tick greater than or equal to x
    i = bisect.bisect_left(match["trajectories"]["time"], time)
    if i != len(match["trajectories"]["time"]):
        return i
    raise ValueError

def loadFiles(match_id, match_directory):
    match = {}
    match["result"] = {
        "header": {},
        "entities": {},
        "events": {},
        "timeseries": {}
    }
    match["stats"] = {
        "match-stats": {},
        "player-stats": {}
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

    match["heroes"] = {}
    match["id_2_side"] = {}

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
                # extract the player's name
                new_player = {}        
                player_name_string = row[2]
                player_name_list = player_name_string.split( )
                player_name = "".join(player_name_list)
                new_player["name"] = player_name
                new_player["steam_id"] = row[3]
                # form the heroes dictionary
                hero_name = transformHeroName(row[4])
                new_player["hero"] = hero_name
                match["result"]["header"]["players"][player_index] = new_player

                new_hero = {}
                new_hero["player_index"] = player_index
                entity_id = match["parameters"]["namespace"]["hero_namespace"] + player_index
                new_hero["entity_id"] = entity_id
                if int(row[5]) == 2:
                    new_hero["side"] = "radiant"
                    match["id_2_side"][entity_id] = "radiant"
                elif int(row[5]) == 3:
                    new_hero["side"] = "dire"
                    match["id_2_side"][entity_id] = "dire"
                match["heroes"][hero_name] = new_hero
            elif row[0] == "WINNER":
                match["result"]["header"]["winner"] = row[1].strip()

    match["events"] = []
    match["goldexp_events"] = []
    match["damage_events"] = []
    match["player_id_by_handle"] = {}

    events_input_filename = match_directory+"/events.csv"
    with open(events_input_filename,'rb') as f:
        for i, row in enumerate(f):
            row = row.strip().split(",")
            match["events"].append(row)
            if i == 0:
                first_timestamp = math.floor(float(row[0]))
            if row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "5":
                match["match_start_time"] = math.floor(float(row[0]))
            elif row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "4":
                match["pregame_start_time"] = math.floor(float(row[0]))
            elif row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "6":
                match["match_end_time"]  = math.floor(float(row[0]))
                #extract the events required for our analysis and store as a element in the array match.goldexp_events
            elif row[1] == "DOTA_COMBATLOG_GOLD" or row[1] == "DOTA_COMBATLOG_XP" or row[1] == "OVERHEAD_ALERT_GOLD" or row[1] == "OVERHEAD_ALERT_DENY" or row[1] == "DOTA_COMBATLOG_DEATH":
                match["goldexp_events"].append(row)
            elif row[1] == "PLAYER_ENT":
                match["player_id_by_handle"][row[3]] = row[2]
            elif row[1]=="DOTA_COMBATLOG_DAMAGE" and row[2]!="null":
                match["damage_events"].append(row)

        match["total_match_time"] = match["match_end_time"] - match["match_start_time"] 

    match["result"]["header"]["length"] = match["total_match_time"]

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
            if (absolute_time >= match["pregame_start_time"]) and (absolute_time <= match["match_end_time"]):
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

    match["spawn_rows"] = []
    match["death_rows"] = []
    match["unit_selection_rows"] = []
    match["visibility_rows"] = []
    match["creep_positions"] = {}

    entities_input_filename = match_directory+"/ents.csv"
    with open(entities_input_filename, 'rb') as csvfile:
        entity_reader = csv.reader(csvfile)
        for i, row in enumerate(entity_reader):
            if row[1]=="DEATH":
                match["death_rows"].append(row)
            elif row[1]=="SPAWN":
                match["spawn_rows"].append(row)
            elif row[1]=="PLAYER_CHANGE_SELECTION":
                match["unit_selection_rows"].append(row)
            elif row[1]=="HERO_VISIBILITY":
                match["visibility_rows"].append(row)

    return match

def process(match):
    processUnits(match)
    processVisibility(match)

    processKills(match)
    processPosition(match)

def processUnits(match):
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

def processVisibility(match):
    for hero in match["heroes"]:
        match["result"]["entities"][match["heroes"][hero]["entity_id"]]["visibility"] = {"format":"changelist", "samples":[]}

    for row in match["visibility_rows"]:
        enemy_visibility_bit = 0
        hero = transformHeroName(row[2])
        if not hero in match["heroes"]:
            continue
        if match["heroes"][hero]["side"] == "radiant":
            enemy_visibility_bit = 3
        elif match["heroes"][hero]["side"] == "dire":
            enemy_visibility_bit = 2
        else:
            pass#print "unknown team"
        visible_to_enemy = (int(row[4]) & (1<<enemy_visibility_bit) ) >> enemy_visibility_bit
        time = transformTime(match, row[0])
        match["result"]["entities"][match["heroes"][hero]["entity_id"]]["visibility"]["samples"].append({"t": time, "v": [visible_to_enemy]})

def processPosition(match):
    current_spawn = {}
    for hero in match["heroes"]: 
        current_spawn[hero] = None

    hero_spawns = []
    for spawn_row in match["spawn_rows"]:
        if spawn_row[2].startswith("npc_dota_hero_"):
            if "ingame-entity" not in match["heroes"][transformHeroName(spawn_row[2])]:
                match["heroes"][transformHeroName(spawn_row[2])]["ingame-entity"] = spawn_row[3]
            #filter illusions
            if spawn_row[3] == match["heroes"][transformHeroName(spawn_row[2])]["ingame-entity"]:
                hero_spawns.append((transformTime(match,spawn_row[0]), transformHeroName(spawn_row[2])))

    hero_deaths = []
    for death_row in match["death_rows"]:
        if death_row[2].startswith("npc_dota_hero_"):
            #filter illusions
            if spawn_row[3] == match["heroes"][transformHeroName(spawn_row[2])]["ingame-entity"]:
                hero_deaths.append((transformTime(match,death_row[0]), transformHeroName(death_row[2])))

    next_spawn = 0
    next_death = 0
    trajectories = []
    while next_spawn < len(hero_spawns) or next_death < len(hero_deaths):
        if current_spawn[hero_spawns[next_spawn][1]] is None:
            print "spawn {}".format(hero_spawns[next_spawn][1])
            current_spawn[hero_spawns[next_spawn][1]] = hero_spawns[next_spawn][0]
            next_spawn += 1
            continue
        elif current_spawn[hero_deaths[next_death][1]] is not None:
            print "death {}".format(hero_deaths[next_death][1])
            trajectories.append({"start": current_spawn[hero_deaths[next_death][1]], "end": hero_deaths[next_death][0], "hero": hero_deaths[next_death][1]})
            current_spawn[hero_deaths[next_death][1]] = None
            next_death += 1
        else:
            print "bad case, {} {} {} {} {}".format(next_spawn, next_death, current_spawn, hero_spawns[next_spawn][1], hero_deaths[next_death][1])
            break

    #close trajectories for living heroes
    for hero in current_spawn:
        if current_spawn[hero] is not None:
            trajectories.append({"start": current_spawn[hero], "end": match["match_end_time"], "hero": hero})

    #insert into result
    for trajectory in trajectories:
        start_index = findTimeTick(match, trajectory["start"])
        end_index = findTimeTick(match, trajectory["end"])

        samples_list =[]
        i = start_index
        while i <= end_index:
            if i % match["parameters"]["heroPositions"]["sample_step_size"] == 0 or i == end_index:
                samples_list.append({
                    "t":match["trajectories"]["time"][i],
                    "v":match["trajectories"][trajectory["hero"]]["position"][i]
                    })
            i += 1


        stored = {
            "time-start": trajectory["start"],
            "time-end": trajectory["end"],
            "timeseries":{"format":"samples","samples":samples_list}
            }

        match["result"]["entities"][ match["heroes"][trajectory["hero"]]["entity_id"] ]["position"].append(stored)

def processKills(match):
        
    killNum  = 0
    for row in match["events"]:
        # for each row check if a death occurred
        if row[1]=="DOTA_COMBATLOG_DEATH":
            killer = row[3]
            deceased = row[2]
            # now check if it was a hero that died
            if deceased.split("_")[2] == "hero":
                # look up which side the hero was on
                killer_name = transformHeroName(killer)
                deceased_name = transformHeroName(deceased)
                if not deceased_name in match["heroes"]:
                    logging.info("bad deceased name"+deceased)
                    continue
                side = match["heroes"][deceased_name]["side"]
                # now form a dictionary 
                id_num = match["parameters"]["namespace"]["kills_namespace"]+killNum
                death_time = transformTime(match, row[0])
                new_event = {"type":"kill","time": death_time,"team":side}
                # put kill event in the events dictionary
                match["result"]["events"][str(id_num)] = new_event
                #add kill to the killers total
                if killer_name in match["heroes"]:
                    match["result"]["entities"][match["heroes"][killer_name]["entity_id"]]["kills"] += 1
                match["result"]["entities"][match["heroes"][deceased_name]["entity_id"]]["deaths"] += 1

                killNum += 1


def main():
    match_id = sys.argv[1]
    match_directory = sys.argv[2]
    analysis_filename = sys.argv[3]
    header_filename = sys.argv[4]
    stats_filename = sys.argv[5]
    logging.basicConfig(filename=analysis_filename+'.log',level=logging.DEBUG)

    match = loadFiles(match_id, match_directory)
    process(match)

    #write output
    analysisfile = open(analysis_filename,'wb')
    analysisfile.write(json.dumps(match["result"], sort_keys=True,indent=4, separators=(',', ': ')))    
    analysisfile.close()
    headerfile = open(header_filename,'wb')
    headerfile.write(json.dumps(match["result"]["header"], sort_keys=True,indent=4, separators=(',', ': ')))    
    headerfile.close()
    statsfile = open(stats_filename,'wb')
    statsfile.write(json.dumps(match["stats"], sort_keys=True,indent=4, separators=(',', ': ')))    
    statsfile.close()

    #delete intermediate/input files
    #shutil.rmtree(match_directory)

if __name__ == "__main__":
    #cProfile.run('main()')
    main()