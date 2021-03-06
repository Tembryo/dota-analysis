import logging
import sys
import csv
import datetime
import math
import json
import bisect
import numpy as np
import scipy.sparse
#import cProfile

def createParameters():
    # set variables that determine how the data is analysed - need to include all parameters
    parameters = {}
    parameters["version"] = "0.1.00"
    parameters["datetime"] = {}
    parameters["datetime"]["date"] = str(datetime.date.today())
    parameters["datetime"]["time"] = str(datetime.datetime.now().time())
    parameters["namespace"] = {}
    parameters["namespace"]["hero_namespace"] = 100
    parameters["namespace"]["kills_namespace"] = 10000
    parameters["namespace"]["normal_namespace"] = 11000
    parameters["namespace"]["fights_namespace"] = 15000
    parameters["namespace"]["creep_spawn_namespace"] = 20000
    parameters["namespace"]["creep_death_namespace"] = 30000
    parameters["namespace"]["camera_namespace"] = 40000

    parameters["general"] = {}
    parameters["general"]["num_players"] = 10
    parameters["general"]["passive_GPM"] = 100
    parameters["map"] = {}
    parameters["map"]["xmin"] = -8200
    parameters["map"]["xmax"] = 8000
    parameters["map"]["ymin"] = -8200
    parameters["map"]["ymax"] = 8000
    parameters["map"]["num_box"] = 32
    parameters["pregame_time_shift"] = 60
    # function specific parameters

    parameters["graphAttacks"] = {}
    parameters["graphAttacks"]["damage_threshold"] = 50

    parameters["processFights"] = {}
    parameters["processFights"]["initiation_window"] = 1
    parameters["processFights"]["alpha"] = 500
    parameters["processFights"]["kappa"] = 0.15
    parameters["processFights"]["time_threshold"] = 2
    parameters["processFights"]["similarity_threshold"] = 0.15

    parameters["processCreepDeaths"] = {}
    parameters["processCreepDeaths"]["responsibility_distance"] = 1000

    parameters["formAdjacencyMatrix"] = {}
    parameters["formAdjacencyMatrix"]["distance_threshold"] = 300 #300 was default
    parameters["formAdjacencyMatrix"]["radius"] = 1500
    parameters["formAdjacencyMatrix"]["w_space1"] = 0.02
    parameters["formAdjacencyMatrix"]["w_space2"] = 0.3 #0.3 was default
    parameters["formAdjacencyMatrix"]["w_time"] = 80 #80 worked well

    parameters["cameraEvaluation"] = {}
    parameters["cameraEvaluation"]["jump_threshold"] = 1500
    parameters["cameraEvaluation"]["self_range"] = 1500

    parameters["evaluatefightCoordination"] = {}
    parameters["evaluatefightCoordination"]["time_delta"] = 0.1
    parameters["evaluatefightCoordination"]["decay_rate"] = 2

    parameters["makeResults"] = {}
    parameters["makeResults"]["sample_rate_position"] = 0.5
    parameters["makeResults"]["sample_rate_gold_exp"] = 0.1

    return parameters

def transformHeroName(name):
    #transform dota_npc_hero_name_of_hero into name_of_hero
    hero_name_list = name.split("_")
    hero_name_list = hero_name_list[3:] # remove the unnecessary dota_npc_hero part
    return "_".join(hero_name_list) # join the strings back together

def transformTime(match,t_string):
    return float(t_string) - match["times"]["match_start_time"]

def findTimeTick(match,array_of_times,time):
    #find leftmost tick greater than or equal to x
    i = bisect.bisect_left(array_of_times,time)
    if i != len(array_of_times):
        return i
    raise ValueError

def lookupHeroPosition(match,hero,time):
    #find the [x,y] coordinates for a hero at a specified time
    i = findTimeTick(match,match["raw"]["trajectories"]["time"],time)
    return  match["raw"]["trajectories"][hero]["position"][i]

def loadFiles(match_id, match_directory):
    #load in the raw data from the csv files
    match = {}

    match["parameters"] = createParameters()

    match["header"] = {
            "id": match_id,
            "draft": {},
            "length": 0,
            "teams": {}, 
            "winner": None, 
        }

    match["raw"] = {
        "damage_events": [],
        "gold_events": [],
        "exp_events": [],
        "overhead_alert_events": [],
        "death_events": [],
        "spawn_rows": [],
        "death_rows": [],
        "unit_selection_rows": [],
        "visibility_rows": [],
        "creep_positions": [],
        "trajectories": {
            "time": []
        }
    }

    match["header"]["teams"] = {
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

    match["times"] = {
        "pregame_start_time": 0,
        "match_start_time": 0,
        "match_end_time": 0,
        "total_match_time": 0
    }

    header_input_filename = match_directory+"/header.csv"
    with open(header_input_filename,'rb') as f:
        for i, row in enumerate(f):
            row = row.strip().split(",")
            if row[0].upper() == "TEAM_TAG_RADIANT":
                if row[1] == " ":
                    match["header"]["teams"][0]["name"] = "empty"
                else:            
                    match["header"]["teams"][0]["name"] = row[1]
            elif row[0].upper() == "TEAM_TAG_DIRE":
                if row[1] == " ":
                    match["header"]["teams"][1]["name"] = "empty"
                else:            
                    match["header"]["teams"][1]["name"] = row[1]
            elif row[0].upper() == "PLAYER":
                # form new player dictionary
                new_player = {}     
                player_index = int(row[1])   
                player_name_list = row[2].split( )
                player_name = "".join(player_name_list)
                hero_name = transformHeroName(row[4])
                new_player["name"] = player_name
                new_player["steam_id"] = row[3]
                new_player["hero"] = hero_name
                match["players"][player_index] = new_player
                # form new hero dictionary
                new_hero = {}
                new_hero["player_index"] = player_index
                new_hero["entity_id"] = match["parameters"]["namespace"]["hero_namespace"] + player_index
                if int(row[5]) == 2:
                    new_hero["side"] = "radiant"
                elif int(row[5]) == 3:
                    new_hero["side"] = "dire"
                match["heroes"][hero_name] = new_hero
            elif row[0] == "WINNER":
                match["header"]["winner"] = row[1].strip()

    for hero in match["heroes"]:
        match["raw"]["trajectories"][hero] = {
           "position": [],
            "camera": [],
            "mouse": [],
            "hp": [],
            "mana": []
        }

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
                match["times"]["match_end_time"] = math.floor(float(row[0]))
           
    match["times"]["total_match_time"] = match["times"]["match_end_time"] - match["times"]["match_start_time"] 
    match["header"]["length"] = match["times"]["total_match_time"]

    match["player_index_by_handle"] = {}
    #extract events and shift timestamps
    with open(events_input_filename,'rb') as f:
        for i, row in enumerate(f):
            row = row.strip().split(",")
            absolute_time = float(row[0])
            if absolute_time <= match["times"]["match_end_time"]:
                row[0] = transformTime(match,row[0])
                if row[1] == "DOTA_COMBATLOG_GOLD":
                    row[4] = int(row[4])
                    match["raw"]["gold_events"].append(row)
                elif row[1] == "DOTA_COMBATLOG_XP":
                    row[3] = int(row[3])
                    match["raw"]["exp_events"].append(row) 
                elif row[1] == "OVERHEAD_ALERT_GOLD" or row[1] == "OVERHEAD_ALERT_DENY":
                    match["raw"]["overhead_alert_events"].append(row)
                elif row[1]=="DOTA_COMBATLOG_DAMAGE" and row[2]!="null":
                    row[5] = float(row[5])
                    match["raw"]["damage_events"].append(row)
                elif row[1] == "DOTA_COMBATLOG_DEATH":
                    match["raw"]["death_events"].append(row)
                elif row[1] == "PLAYER_ENT":
                    row[2] = int(row[2])
                    row[3] = int(row[3])
                    match["player_index_by_handle"][row[3]] = row[2]

    trajectories_input_filename = match_directory+"/trajectories.csv"
    with open(trajectories_input_filename,'rb') as file:
        reader = csv.DictReader(file)    
        for i, row in enumerate(reader):
            absolute_time = float(row["time"])
            if (absolute_time >= match["times"]["pregame_start_time"]) and (absolute_time <= match["times"]["match_end_time"]):
                t = transformTime(match, row["time"])
                match["raw"]["trajectories"]["time"].append(t)
                for hero in match["heroes"]:
                    index = match["heroes"][hero]["player_index"]
                    v_position = [float(row["{}X".format(index)]),float(row["{}Y".format(index)])]
                    v_cam = [float(row["{}CamX".format(index)]),float(row["{}CamY".format(index)])]
                    v_mouse = [float(row["{}MouseX".format(index)]),float(row["{}MouseX".format(index)])]
                    hp = [float(row["{}HP".format(index)])]
                    mana = [float(row["{}Mana".format(index)])]

                    match["raw"]["trajectories"][hero]["position"].append(v_position)
                    match["raw"]["trajectories"][hero]["camera"].append(v_cam)
                    match["raw"]["trajectories"][hero]["mouse"].append(v_mouse)
                    match["raw"]["trajectories"][hero]["hp"].append(hp)
                    match["raw"]["trajectories"][hero]["mana"].append(mana)

    entities_input_filename = match_directory+"/ents.csv"
    with open(entities_input_filename, 'rb') as csvfile:
        entity_reader = csv.reader(csvfile)
        for i, row in enumerate(entity_reader):
            absolute_time = float(row[0])
            #the time filtering is different in this case as otherwise can miss spawns
            if absolute_time <= match["times"]["match_end_time"]:
                row[0] = transformTime(match,row[0])
                if row[1]=="DEATH":

                    match["raw"]["death_rows"].append(row)
                elif row[1]=="SPAWN":
                    row[4] = float(row[4])
                    row[5] = float(row[5])
                    match["raw"]["spawn_rows"].append(row)
                elif row[1]=="PLAYER_CHANGE_SELECTION":
                    row[2] = int(row[2])
                    match["raw"]["unit_selection_rows"].append(row)
                elif row[1]=="HERO_VISIBILITY":
                    row[4] = int(row[4])
                    match["raw"]["visibility_rows"].append(row)
    return match

def makeUnits(match):
    # instantiate the units and their attributes
    match["entities"] = {}
    for hero in match["heroes"]:
        match["entities"][match["heroes"][hero]["entity_id"]] = {
                "unit":hero,
                "side": match["heroes"][hero]["side"],
                "control":match["heroes"][hero]["player_index"],
                "position":[],
                "visibility": None,
                "kills": 0,
                "deaths": 0,
                "entity_handle": 0 #in-game identifier
            }

def processHeroVisibility(match):
    # find times during match when heros are visible to enemies
    for hero in match["heroes"]:
        match["entities"][match["heroes"][hero]["entity_id"]]["visibility"] = {"format":"changelist", "samples":[]}

    for row in match["raw"]["visibility_rows"]:
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
        visible_to_enemy = (row[4] & (1 << enemy_visibility_bit)) >> enemy_visibility_bit
        match["entities"][match["heroes"][hero]["entity_id"]]["visibility"]["samples"].append({"t": row[0], "v": [visible_to_enemy]})

def processHeroDeaths(match):
    # extract the events where heroes died 
    match["hero_deaths"] = []

    for row in match["raw"]["death_events"]:  
        # for each row check if a death occurred
        killer = row[3]
        deceased = row[2]
        # now check if it was a hero that died
        if deceased.startswith("npc_dota_hero_"):
            # look up which side the hero was on
            deceased_name = transformHeroName(deceased)
            # if killer was another hero transform the name (it may have been a tower)
            if killer.startswith("npc_dota_hero_"):
                killer_name = transformHeroName(killer)
            else:
                killer_name = killer
            # is this to filter out illusions? not clear
            if not deceased_name in match["heroes"]:
                logging.info("bad deceased name" + deceased)
                continue
            side = match["heroes"][deceased_name]["side"]
            # now form a dictionary that will be stored as an event 
            death_time = row[0]
            new_death = {"time": death_time,"team":side,"deceased":deceased_name,"killer":killer_name}
            # put kill event in the events dictionary
            match["hero_deaths"].append(new_death)

def processHeroPosition(match):
    # extract the [x,y] coordinates for each hero and collect into trajectories 
    hero_spawns = {}
    hero_deaths = {}
    hero_lives = {}

    for hero in match["heroes"]: 
        hero_spawns[hero] = []
        hero_deaths[hero] = []
        hero_lives[hero] = []

    for spawn_row in match["raw"]["spawn_rows"]:
        if spawn_row[2].startswith("npc_dota_hero_"):
            if "ingame-entity" not in match["heroes"][transformHeroName(spawn_row[2])]:
                match["heroes"][transformHeroName(spawn_row[2])]["ingame-entity"] = spawn_row[3]
            #filter illusions
            if spawn_row[3] == match["heroes"][transformHeroName(spawn_row[2])]["ingame-entity"]:
                hero_spawns[transformHeroName(spawn_row[2])].append(spawn_row[0])

    for death_row in match["raw"]["death_rows"]:
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
                end = match["raw"]["trajectories"]["time"][-1]
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

    max_time = max(match["raw"]["trajectories"]["time"])

    for hero in match["heroes"]:
        for life in hero_lives[hero]:
            start_index = findTimeTick(match,match["raw"]["trajectories"]["time"],min(life["start"],max_time))
            end_index = findTimeTick(match,match["raw"]["trajectories"]["time"],min(life["end"],max_time))

            samples_list =[]
            i = start_index
            while i <= end_index:
                samples_list.append({
                    "t":match["raw"]["trajectories"]["time"][i],
                    "v":match["raw"]["trajectories"][hero]["position"][i]
                    })
                i += 1

            stored = {
                "time-start": life["start"],
                "time-end": life["end"],
                "timeseries":{"format":"samples","samples":samples_list}
                }

            match["entities"][match["heroes"][hero]["entity_id"]]["position"].append(stored)

def processGoldXP(match):
    # calculates radiant and dire gold/exp and individual hero gold/exp
    match["timeseries"] = {}

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

    for row in match["raw"]["exp_events"]:
        hero_name = transformHeroName(row[2]) #receiver
        if not hero_name in match["heroes"]:
            continue
        exp_amount = row[3]
        hero_exp[hero_name] += exp_amount
        side = match["heroes"][hero_name]["side"]
        if side == "radiant":
            radiant_exp_total += exp_amount
        elif side == "dire":
            dire_exp_total += exp_amount
        exp.append({"t":row[0],"v":radiant_exp_total - dire_exp_total})

    for row in match["raw"]["gold_events"]:
        hero_name = transformHeroName(row[2]) #receiver
        if not hero_name in match["heroes"]:
            print hero_name
            continue
        gold_amount = row[4]
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
        else:
            logging.info("was expecting 'receives' or 'looses' but got" + row[3])
            continue
        gold.append({"t":row[0],"v":radiant_gold_total - dire_gold_total})

    for hero in match["heroes"]:
        match["entities"][match["heroes"][hero]["entity_id"]]["GPM"] = math.floor(60*hero_gold[hero]/match["times"]["total_match_time"] + match["parameters"]["general"]["passive_GPM"])
        match["entities"][match["heroes"][hero]["entity_id"]]["XPM"] = math.floor(60*hero_exp[hero]/match["times"]["total_match_time"])

    match["timeseries"] = {"gold-advantage":{"format":"samples","samples":gold},"exp-advantage":{"format":"samples","samples":exp}}

def processCameraControl(match):
    # extract which units players select and for how long from the unit_selection_rows
    match["camera_control"] = []

    last_selection = {}
    for player_index in match["players"]:
        last_selection[player_index] = {"unit":None, "t":0}

    for row in match["raw"]["unit_selection_rows"]:
        if not row[2] in last_selection:
            continue
        if last_selection[row[2]]["unit"] is not None and last_selection[row[2]]["unit"] != "":
            event = {
                    "type": "unit-selection",
                    "time-start": last_selection[row[2]]["t"],
                    "time-end": row[0],
                    "player_index": row[2],
                    "unit": last_selection[row[2]]["unit"]
                    }
            match["camera_control"].append(event)
        last_selection[row[2]]["t"] = row[0]
        last_selection[row[2]]["unit"] = row[4]

def processHeroAttacks(match):
    # extract hero to hero attacks
    match["attack_list"] = []
    max_time = max(match["raw"]["trajectories"]["time"])
    for row in match["raw"]["damage_events"]:
        if row[0] < max_time:
            attacker = row[2]
            victim = row[3]
            # filter out attacks involving enties other than heroes
            if attacker.startswith("npc_dota_hero_") and victim.startswith("npc_dota_hero_"):
                attacker = transformHeroName(attacker)
                victim = transformHeroName(victim)
                #filter out illusions and damage instances where heroes damage themselves (e.g., Pudge rot)
                if attacker not in match["heroes"] or victim not in match["heroes"] or attacker == victim:
                    continue
                attack_method = row[4]
                if (attack_method == " ") or (attack_method == ""):
                    attack_method = "melee"
                else:
                    attack_method = attack_method.split()
                    attack_method = attack_method[1]
                    attack_method = attack_method[len(attacker)+1:]
                attack = {
                        "attacker": attacker,
                        "victim": victim,
                        "damage": row[5],
                        "health_delta": row[6],
                        "time": row[0],
                        "attack_method": attack_method,
                        "position": match["raw"]["trajectories"][attacker]["position"][findTimeTick(match,match["raw"]["trajectories"]["time"],row[0])]
                        }
                match["attack_list"].append(attack)

def fightDistMetric(attack1,attack2,radius,w_space1,w_space2,w_time):

    r = math.sqrt((attack1["position"][0]-attack2["position"][0])**2+(attack1["position"][1]-attack2["position"][1])**2)

    if r < radius:
        w_space = w_space1
    else:
        w_space = w_space2

    dist = w_space*r + w_time*(abs(attack1["time"]-attack2["time"])) 
    return dist

def formAdjacencyMatrix(match):
    n = len(match["attack_list"])
    A = np.zeros(shape = (n,n))
    D = np.zeros(shape = (n,n))

    time_threshold = match["parameters"]["formAdjacencyMatrix"]["distance_threshold"]/match["parameters"]["formAdjacencyMatrix"]["w_time"]

    for i in range(0,n):
        for j in range(i+1,n):
            if match["attack_list"][j]["time"]-match["attack_list"][i]["time"] > time_threshold:
                break
            else:            
                d = fightDistMetric(match["attack_list"][i],match["attack_list"][j],match["parameters"]["formAdjacencyMatrix"]["radius"],match["parameters"]["formAdjacencyMatrix"]["w_space1"],match["parameters"]["formAdjacencyMatrix"]["w_space2"],match["parameters"]["formAdjacencyMatrix"]["w_time"])
                if d < match["parameters"]["formAdjacencyMatrix"]["distance_threshold"]:
                    A[i,j] = 1
                    A[j,i] = 1

    return A

def processFights(match): 
    #return a list of fights 
    match["fight_list"] = []

    A = formAdjacencyMatrix(match) #this function needs to be improved later
    n_components, labels = scipy.sparse.csgraph.connected_components(A, directed=False, return_labels=True)

    gold_time = []
    for row in match["raw"]["gold_events"]:
        gold_time.append(row[0])

    exp_time = []
    for row in match["raw"]["exp_events"]:
        exp_time.append(row[0])

    #for each fight make a list of attacks
    for i in range(0,n_components):
        attack_sequence = [j for j, k in enumerate(labels) if k == i ]
        damage_dealt_radiant = 0
        damage_dealt_dire = 0
        heroes_involved = set([])
        heroes_killed = set([])
        position_x = []
        position_y = []
        radiant_initiation_damage = 0
        dire_initiation_damage = 0
        time_start = match["attack_list"][attack_sequence[0]]["time"]
        time_end = match["attack_list"][attack_sequence[-1]]["time"]
        radiant_gold_gained = 0
        dire_gold_gained = 0
        radiant_exp_gained = 0
        dire_exp_gained = 0

        for attack_index in attack_sequence:
            attack = match["attack_list"][attack_index]
            if match["heroes"][attack["attacker"]]["side"] == "radiant":
                damage_dealt_radiant += attack["damage"]
            elif match["heroes"][attack["attacker"]]["side"] == "dire":
                damage_dealt_dire += attack["damage"]
            heroes_involved = heroes_involved.union([match["heroes"][attack["attacker"]]["entity_id"],match["heroes"][attack["victim"]]["entity_id"]])
            position_x.append(attack["position"][0])
            position_y.append(attack["position"][1])
            # calculate a measure of which team initiated the fight
            if attack["time"] - time_start < match["parameters"]["processFights"]["initiation_window"]:
                if match["heroes"][attack["attacker"]]["side"] == "radiant":
                    radiant_initiation_damage += attack["damage"]
                elif match["heroes"][attack["attacker"]]["side"] == "dire":
                    dire_initiation_damage += attack["damage"]

        mean_position = [np.mean(position_x),np.mean(position_y)]   
        #+1 for 100% radiant and -1 for 100% dire
        side_indicator = (radiant_initiation_damage-dire_initiation_damage)/(dire_initiation_damage+radiant_initiation_damage)

        # find which heroes were killed during the fight
        for death in match["hero_deaths"]:
            if match["heroes"][death["deceased"]]["entity_id"] in heroes_involved and death["time"] >= time_start and death["time"] <= time_end:
                heroes_killed = heroes_killed.union([match["heroes"][death["deceased"]]["entity_id"]])

        if len(heroes_killed) > 0:

            #calculate amount of gold and exp exchanged during fight
            start_index = findTimeTick(match,gold_time,min(time_start,gold_time[-1]))
            end_index = findTimeTick(match,gold_time,min(time_end,gold_time[-1]))

            for i in range(start_index,end_index):
                row = match["raw"]["gold_events"][i]
                hero_name = transformHeroName(row[2]) #receiver
                if match["heroes"][hero_name]["entity_id"] in heroes_involved:
                    gold_amount = row[4]
                    side = match["heroes"][hero_name]["side"]
                    if row[3] == "receives":
                        if side == "radiant":
                            radiant_gold_gained += gold_amount
                        elif side == "dire":
                            dire_gold_gained += gold_amount
                    elif row[3] == "looses":
                        if side == "radiant":
                            radiant_gold_gained -= gold_amount
                        elif side == "dire":
                            dire_gold_gained -= gold_amount

            start_index = findTimeTick(match,exp_time,min(time_start,exp_time[-1]))
            end_index = findTimeTick(match,exp_time,min(time_end,exp_time[-1]))

            for i in range(start_index,end_index):
                row = match["raw"]["exp_events"][i]
                hero_name = transformHeroName(row[2]) 
                if match["heroes"][hero_name]["entity_id"] in heroes_involved:
                    exp_amount = row[3]
                    side = match["heroes"][hero_name]["side"]
                    if side == "radiant":
                        radiant_exp_gained += exp_amount
                    elif side == "dire":
                        dire_exp_gained += exp_amount

        readable_time_start =  str(int(math.floor(time_start/60))) + ":" +  str(int(time_start % 60))
        readable_time_end =  str(int(math.floor(time_end/60))) + ":" +  str(int(time_end % 60))

        fight = {
                "attack_sequence": attack_sequence,
                "damage_dealt_radiant": damage_dealt_radiant,
                "damage_dealt_dire": damage_dealt_dire,
                "time_start": time_start,
                "time_end": time_end,
                "readable_time_start": readable_time_start,
                "readable_time_end": readable_time_end,
                "heroes_involved": heroes_involved,
                "heroes_killed": list(heroes_killed),
                "mean_position": mean_position,
                "initiation_side": side_indicator,
                "radiant_gold_gained": radiant_gold_gained,
                "dire_gold_gained": dire_gold_gained,
                "radiant_exp_gained": radiant_exp_gained,
                "dire_exp_gained": dire_exp_gained
        }

        # apply a crude filter to the fights
        damage_threshold = match["parameters"]["processFights"]["alpha"] + match["parameters"]["processFights"]["kappa"]*fight["time_start"]
        if ((len(fight["heroes_killed"]) > 0) or ((fight["damage_dealt_radiant"] + fight["damage_dealt_dire"] > damage_threshold)  and (fight["time_end"] - fight["time_start"] > match["parameters"]["processFights"]["time_threshold"]))) and len(heroes_involved) > 1:
            fight["heroes_involved"] = list(fight["heroes_involved"])
            match["fight_list"].append(fight)

        # check the similarity between each fight in the fight list and merge fights if they are above the similarity threshold

        i = 0
        j = 1
        while i < (len(match["fight_list"]) - 1):
            similarity_score = checkFightSimilarity(match,i,j)
            if similarity_score > match["parameters"]["processFights"]["similarity_threshold"]:
                print "merging fights: " + str(i) + " , " + str(j)
                fight = mergeFights(match,i,j)
                match["fight_list"][i] = fight
                del match["fight_list"][j]
            else: 
                j += 1
            if j >= (len(match["fight_list"]) - 1):
                i = i + 1
                j = i + 1

   


def checkFightSimilarity(match,index_i,index_j):
    # given two fights check how similar they are based on heroes involved and minimum distance between attack clusters
    similarity_score = 0
    a = 0.005
    fight_A = match["fight_list"][index_i]
    fight_B = match["fight_list"][index_j]

    # find the minimum distance between the attacks in the separate fight clusters
    D_min = 3*match["parameters"]["formAdjacencyMatrix"]["distance_threshold"] #will represent the minimum distance between attacks in the two fights clusters
    for i in fight_A["attack_sequence"]:
        for j in fight_B["attack_sequence"]:
            d = fightDistMetric(match["attack_list"][i],match["attack_list"][j],match["parameters"]["formAdjacencyMatrix"]["radius"],match["parameters"]["formAdjacencyMatrix"]["w_space1"],match["parameters"]["formAdjacencyMatrix"]["w_space2"],match["parameters"]["formAdjacencyMatrix"]["w_time"])
            D_min = min(D_min,d)

    heroes_involved_A = set(fight_A["heroes_involved"])
    heroes_involved_B = set(fight_B["heroes_involved"])
    heroes_involved_both = heroes_involved_A.intersection(heroes_involved_B)

    if len(heroes_involved_both) > 0:
        similarity_score = 1/(1 + math.exp(a*(D_min - match["parameters"]["formAdjacencyMatrix"]["distance_threshold"])))

    return similarity_score

def mergeFights(match,index_i,index_j):

    fight_A = match["fight_list"][index_i]
    fight_B = match["fight_list"][index_j]
    #given two fights merge them into one
    attack_sequence_A = set(fight_A["attack_sequence"])
    attack_sequence_B = set(fight_B["attack_sequence"])
    attack_sequence = list(attack_sequence_A.union(attack_sequence_B))

    heroes_involved_A = set(fight_A["heroes_involved"])
    heroes_involved_B = set(fight_B["heroes_involved"])
    heroes_involved = list(heroes_involved_A.union(heroes_involved_B))

    heroes_killed_A = set(fight_A["heroes_killed"])
    heroes_killed_B = set(fight_B["heroes_killed"])
    heroes_killed = list(heroes_killed_A.union(heroes_killed_B))

    # recalculate the initiation side for the merged attack sequence
    time_start = min(fight_A["time_start"],fight_B["time_start"])
    time_end = max(fight_A["time_end"],fight_B["time_end"])

    readable_time_start =  str(int(math.floor(time_start/60))) + ":" +  str(int(time_start % 60))
    readable_time_end =  str(int(math.floor(time_end/60))) + ":" +  str(int(time_end % 60))

    radiant_initiation_damage = 0
    dire_initiation_damage = 0
    position_x = []
    position_y = []
    for attack_index in attack_sequence:
        attack = match["attack_list"][attack_index]
        position_x.append(attack["position"][0])
        position_y.append(attack["position"][1])
        # calculate a measure of which team initiated the fight
        if attack["time"] - time_start < match["parameters"]["processFights"]["initiation_window"]:
            if match["heroes"][attack["attacker"]]["side"] == "radiant":
                radiant_initiation_damage += attack["damage"]
            elif match["heroes"][attack["attacker"]]["side"] == "dire":
                dire_initiation_damage += attack["damage"]
    mean_position = [np.mean(position_x),np.mean(position_y)]   
    side_indicator = (radiant_initiation_damage-dire_initiation_damage)/(dire_initiation_damage+radiant_initiation_damage)

    fight = {
        "attack_sequence": attack_sequence,
        "damage_dealt_radiant": fight_A["damage_dealt_radiant"] + fight_B["damage_dealt_radiant"],
        "damage_dealt_dire": fight_A["damage_dealt_dire"] + fight_B["damage_dealt_dire"],
        "time_start": time_start,
        "time_end": time_end,
        "readable_time_start": readable_time_start,
        "readable_time_end": readable_time_end,
        "heroes_involved": heroes_involved,
        "heroes_killed": heroes_killed,
        "mean_position": mean_position,
        "initiation_side": side_indicator,
        "radiant_gold_gained": fight_A["radiant_gold_gained"] + fight_B["radiant_gold_gained"],
        "dire_gold_gained": fight_A["dire_gold_gained"] + fight_B["dire_gold_gained"],
        "radiant_exp_gained": fight_A["radiant_exp_gained"] + fight_B["radiant_exp_gained"],
        "dire_exp_gained": fight_A["dire_exp_gained"] + fight_B["dire_exp_gained"]
    }

    return fight

def processCreepSpawns(match):
    # extract the creep spawns from spawn_rows
    match["creep_spawns"] = []
    locations = [
        {"x": -6575,    "y": -4104,   "name": "top"}, #radiant
        {"x": -4896,    "y": -4384,   "name": "mid"}, #radiant
        {"x": -3648,    "y": -6112,   "name": "bot"}, #radiant
        {"x": 3168,     "y": 5792,    "name": "top"}, #dire
        {"x": 4096,     "y": 3583,    "name": "mid"}, #dire 
        {"x": 6275,     "y": 3645,    "name": "bot"}  #dire
    ]
    #for each row find the location of where the spawns are occuring
    for row in match["raw"]["spawn_rows"]:
        if row[2].startswith("npc_dota_creep_"): 
            location = "unknown"
            min_d = 500
            for l in locations:
                x = row[4]
                y = row[5]
                d = math.sqrt((x - l["x"])**2 + (y - l["y"])**2)
                if d < min_d:
                    min_d = d
                    location = l["name"]
            creep_spawn = {
                "location": location,
                "position": [row[4],row[5]],
                "time": row[0]
            }    
            match["creep_spawns"].append(creep_spawn) 

def processCreepDeaths(match):
    # extract the creep death events from the death_rows 
    match["creep_deaths"] = []
    entity_handle_to_event_map = {}

    for row in match["raw"]["overhead_alert_events"]:
        if row[1] == "OVERHEAD_ALERT_GOLD":
            entity_handle_to_event_map[row[4]] = {"death_type": "last-hit","killer_handle": row[5]}
        elif row[1] == "OVERHEAD_ALERT_DENY":
            entity_handle_to_event_map[row[4]] = {"death_type": "denied", "killer_handle": row[5]}

    max_time = max(match["raw"]["trajectories"]["time"])        

    for row in match["raw"]["death_rows"]:
        if row[2].startswith("npc_dota_creep_"):
            if row[0] < max_time:
                creep_position = [float(row[5]),float(row[6])]
                time = row[0]
                creep_team_id = int(row[4])
                entity_handle = row[3]
                death_type = "none"
                killed_by = "none"

                if creep_team_id == 2:
                    creep_side = "radiant"
                elif creep_team_id == 3:
                    creep_side = "dire"
                else: 
                    creep_side = "neutral"

                contested_by = []
                responsible_for = []

                for hero in match["heroes"]:
                    hero_position = lookupHeroPosition(match,hero,time)
                    d = math.sqrt((hero_position[0] - creep_position[0])**2 + (hero_position[1] - creep_position[1])**2)
                    if d < match["parameters"]["processCreepDeaths"]["responsibility_distance"]:
                        if match["heroes"][hero]["side"] == creep_side:
                            contested_by.append(match["heroes"][hero]["entity_id"])
                        else:
                            responsible_for.append(match["heroes"][hero]["entity_id"])

                #if there is an overhead alert event associated with the death of that creep
                if entity_handle in entity_handle_to_event_map:
                    #lookup who last hit or denied it (may not be a hero, e.g., dota_creep_ranged or hero illusion).
                    killer_handle = entity_handle_to_event_map[entity_handle]["killer_handle"]
                    if killer_handle in match["player_index_by_handle"]:
                        player_index = match["player_index_by_handle"][killer_handle]
                        killed_by =  match["heroes"][match["players"][player_index]["hero"]]["entity_id"]
                        death_type = entity_handle_to_event_map[entity_handle]["death_type"]

                creep_death = {
                "time": time,
                "creep_type": row[2],
                "entity_handle": entity_handle,
                "creep_team_id": int(row[4]),
                "position": creep_position,
                "death_type": death_type,
                "killed_by": killed_by,
                "responsible_for": responsible_for,
                "contested_by": contested_by
                }
                match["creep_deaths"].append(creep_death)

def makeStats(match):
    # instantiate the stats variables that will be filled in by subsequent evaluation functions
    match["stats"] = {
        "match-stats": {},
        "player-stats": {}
    }

    match["stats"]["match-stats"]["winner"] = match["header"]["winner"]
    match["stats"]["match-stats"]["duration"] = match["times"]["match_end_time"] - match["times"]["match_start_time"]
    match["stats"]["match-stats"]["duration-all"] = match["times"]["match_end_time"] - match["times"]["pregame_start_time"]
    match["stats"]["match-stats"]["creeps-killed"] = 0
    match["stats"]["match-stats"]["creeps-lasthit"] = 0
    match["stats"]["match-stats"]["creeps-denied"] = 0
    match["stats"]["match-stats"]["creeps-missed"] = 0
    match["stats"]["match-stats"]["total-num-of-fights"] = 0

    for player_index in match["players"]:
        match["stats"]["player-stats"][player_index] = {
                #general
                "steam-id": match["players"][player_index]["steam_id"],
                "hero": match["players"][player_index]["hero"],

                #mechanics
                "n-checks": 0,
                "total-check-duration": 0,
                "average-check-duration": 0,
                "num-camera-jumps": 0,
                "avg_camera_movement": 0,
                "percentSelf": 0,
                "percentFar": 0,

                #fighting
                "num-of-kills": 0,
                "num-of-deaths": 0,
                "solo-kills": 0,
                "solo-deaths": 0,
                "team-kills": 0,
                "team-deaths": 0,
                "num-of-fights": 0,
                "total-melee-damage": 0,
                "total-spell-damage": 0,
                "fight-melee-damage": 0,
                "fight-spell-damage": 0,
                "initiation_score": 0,
                "average-fight-movement-speed": 0,
                "fight-coordination": 0,

                #farming
                "GPM": 0,
                "XPM": 0,
                "num-creeps-last-hit": 0,
                "num-creeps-denied": 0,
                "num-lane-creeps-lasthit": 0,
                "num-neutral-creeps-lasthit": 0,
                "lasthit-free": 0,
                "lasthit-contested": 0,
                "contested-total": 0,
                "missed-contested": 0,
                "missed-free": 0,

                #movement
                "time-visible": 0,
                "time-visible-first10": 0,
                "average_distance": 0,
                "distance_std_dev": 0,
                "percentMove": 0,
            
                #objectives
                "tower-damage": 0,
                "rax-damage": 0                
            }

def evaluateVisibility(match):
    # evaluate the amount of time players are visible to the enemy overall and specifically in the first 10 mins
    for player_id in match["players"]:
        last_visibility_change = None
        hero_entity_id = match["heroes"][match["players"][player_id]["hero"]]["entity_id"]
        for change in match["entities"][hero_entity_id]["visibility"]["samples"]:
            if change["v"][0] == 0 and last_visibility_change is not None:
                match["stats"]["player-stats"][player_id]["time-visible"] += change["t"] - last_visibility_change
                #track vis in first 10min separately
                start_beg = max(0, last_visibility_change)
                stop_beg = min(change["t"], 600)
                match["stats"]["player-stats"][player_id]["time-visible-first10"] += max(0, stop_beg - start_beg)                      
            last_visibility_change = change["t"]

def evaluateCameraControl(match):
    # evaluate the number of checks and average check duration of each player 
    for event in match["camera_control"]:
        match["stats"]["player-stats"][event["player_index"]]["n-checks"] += 1
        match["stats"]["player-stats"][event["player_index"]]["total-check-duration"] += event["time-end"] - event["time-start"]

    for player_index in match["players"]:
        if match["stats"]["player-stats"][player_index]["n-checks"] != 0:
            match["stats"]["player-stats"][player_index]["average-check-duration"] =  match["stats"]["player-stats"][player_index]["total-check-duration"]/match["stats"]["player-stats"][player_index]["n-checks"]

    for hero in match["heroes"]:

        last_cam = []
        last_distance = 0
        last_time = 0
        last_self = True

        total_camera_movement = 0
        average_hero_distance = 0
        average_hero_distance_n = 0
        average_hero_distance_M2 = 0
        jumps = []

        time_self = 0
        time_far = 0
        time_moving = 0
        time_total = 0

        for i in xrange(len(match["raw"]["trajectories"][hero]["position"])):
            time = match["raw"]["trajectories"]["time"][i]
            pos = match["raw"]["trajectories"][hero]["position"][i]
            cam = match["raw"]["trajectories"][hero]["camera"][i]
            relative = [pos[0] - cam[0], pos[1] - cam[1]]
            distance = math.sqrt(relative[0]**2 + relative[1]**2)

            hero_distance_delta = (distance - average_hero_distance)
            average_hero_distance_n += 1
            average_hero_distance += hero_distance_delta /(average_hero_distance_n)
            average_hero_distance_M2 += hero_distance_delta*(distance - average_hero_distance)

            if i == 0:
                last_cam = cam
                last_distance = distance
                last_time = time
                continue

            camera_delta = [cam[0] - last_cam[0], cam[1] - last_cam[1]]
            delta_length = math.sqrt(camera_delta[0]**2 + camera_delta[1]**2)        
            total_camera_movement += delta_length

            if delta_length > match["parameters"]["cameraEvaluation"]["jump_threshold"]:
                jumps.append((match["raw"]["trajectories"]["time"][i], camera_delta))
            
            delta_time = time - last_time
            time_total += delta_time

            if delta_length > 1:
                time_moving += delta_time
            else:
                if distance < match["parameters"]["cameraEvaluation"]["self_range"]:
                    time_self += delta_time
                else:
                    time_far += delta_time

            last_cam = cam
            last_distance = distance
            last_time = time

        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["avg_camera_movement"] = total_camera_movement/time_total
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["average_distance"] = average_hero_distance
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["distance_std_dev"] = math.sqrt(average_hero_distance_M2/average_hero_distance_n)
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["num-camera-jumps"] = len(jumps)
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["percentMove"] = time_moving/time_total
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["percentSelf"] = time_self/time_total
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["percentFar"] = time_far/time_total

def evaluateHeroDeaths(match):
    # evaluate the number of kills and deaths of each player (note that the killer might be a tower)
    for death in match["hero_deaths"]:
        if death["killer"] in match["heroes"]:
            match["stats"]["player-stats"][match["heroes"][death["killer"]]["player_index"]]["num-of-kills"] += 1
        if death["deceased"] not in match["heroes"]:
            logging.info("bad deceased name" + death["deceased"])
            continue
        match["stats"]["player-stats"][match["heroes"][death["deceased"]]["player_index"]]["num-of-deaths"] += 1

def evaluateHeroGoldExp(match):
    # evaluate the GPM and XPM for each hero
    for hero in match["heroes"]:
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["GPM"] = match["entities"][match["heroes"][hero]["entity_id"]]["GPM"]
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["XPM"] = match["entities"][match["heroes"][hero]["entity_id"]]["XPM"]

def evaluateFightDamage(match):
    # evaluate the total amount of melee and spell based damage done by each hero across all fights
    for fight in match["fight_list"]:
        for attack_index in fight["attack_sequence"]:
            attack = match["attack_list"][attack_index]
            player_index = match["heroes"][attack["attacker"]]["player_index"]
            if attack["attack_method"] == "melee":
                match["stats"]["player-stats"][player_index]["fight-melee-damage"] += attack["damage"]
            else:
                match["stats"]["player-stats"][player_index]["fight-spell-damage"] += attack["damage"]

def evaluateHeroDamage(match):
    # evaluate the total amount of melee and spell based damage done by each hero over the entire attack list - so including harassment
    for attack in match["attack_list"]:
        player_index = match["heroes"][attack["attacker"]]["player_index"]
        if attack["attack_method"] == "melee":
            match["stats"]["player-stats"][player_index]["total-melee-damage"] += attack["damage"]
        else:
            match["stats"]["player-stats"][player_index]["total-spell-damage"] += attack["damage"]


def evaluateBasicFightStats(match):
    # evaluate whether players get solo/team kills/deaths
    for fight in match["fight_list"]:
        for hero_id in fight["heroes_involved"]:
            match["stats"]["player-stats"][match["entities"][hero_id]["control"]]["num-of-fights"] += 1
        # did a hero get killed in this fight?
        if len(fight["heroes_killed"]) != 0:
            if len(fight["heroes_involved"]) == 2:
                # 1 vs 1 fight
                killed = fight["heroes_killed"]
                match["stats"]["player-stats"][match["entities"][killed[0]]["control"]]["solo-deaths"] += 1
                killer = [x for x in fight["heroes_involved"] if x != killed[0]]
                match["stats"]["player-stats"][match["entities"][killer[0]]["control"]]["solo-kills"] += 1
            elif len(fight["heroes_involved"]) > 2:
                #team fight
                for hero_id in fight["heroes_killed"]:
                    match["stats"]["player-stats"][match["entities"][hero_id]["control"]]["team-deaths"] += 1 
            else:
                logging.info("bad number of heroes involved in fight: fight['heroes_involved'] < 2") 

    match["stats"]["match-stats"]["total-num-of-fights"] = len(match["fight_list"])

    # look up the total number of kills and subtract the solo kills to get the team kills for each player
    for hero in match["heroes"]:
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["team-kills"] =  match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["num-of-kills"] - match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["solo-kills"]

def normalize(v):
    #function for normalizing an array
    norm = np.linalg.norm(v)
    if norm == 0: 
       return v
    return v/norm

def evaluateFightCoordination(match):
    #set bin size (seconds) for fight timeline
    n_steps = int(math.floor(1/match["parameters"]["evaluatefightCoordination"]["time_delta"]))
    coordination_coeffs = {}
    for player_index in match["players"]:
        coordination_coeffs[player_index] = 0

    for fight in match["fight_list"]:
        if len(fight["heroes_involved"]) > 2:
            fight_length = fight["time_end"]- fight["time_start"]
            n = math.floor(fight_length/match["parameters"]["evaluatefightCoordination"]["time_delta"]) + n_steps
            #separate involved list into radiant and dire involved
            radiant_involved = [x for x in fight["heroes_involved"] if x < 105]
            dire_involved = [x for x in fight["heroes_involved"] if x >= 105]
            #make dictionaries to store the arrays of attack signal
            radiant_attack_signals = {}
            for radiant_hero in radiant_involved:
                radiant_attack_signals[radiant_hero] = {}
                for dire_hero in dire_involved:
                    radiant_attack_signals[radiant_hero][dire_hero] = np.zeros(n)
            #same for dire
            dire_attack_signals = {}
            for dire_hero in dire_involved:
                dire_attack_signals[dire_hero] = {}
                for radiant_hero in radiant_involved:
                    dire_attack_signals[dire_hero][radiant_hero] = np.zeros(n)
            #loop over all attacks in fight assigning them to correct signal
            for attack_index in fight["attack_sequence"]:
                attack = match["attack_list"][attack_index]
                attacker_id = match["heroes"][attack["attacker"]]["entity_id"]
                victim_id = match["heroes"][attack["victim"]]["entity_id"]
                if attacker_id < 105 and victim_id >= 105:
                    start_index = math.floor((attack["time"]-fight["time_start"])/match["parameters"]["evaluatefightCoordination"]["time_delta"])
                    for i in range(0,n_steps):
                        radiant_attack_signals[attacker_id][victim_id][start_index + i] = attack["damage"]*math.exp(-i*match["parameters"]["evaluatefightCoordination"]["time_delta"]*match["parameters"]["evaluatefightCoordination"]["decay_rate"])
                elif attacker_id >= 105 and victim_id < 105:
                    start_index = math.floor((attack["time"]-fight["time_start"])/match["parameters"]["evaluatefightCoordination"]["time_delta"])
                    for i in range(0,n_steps):
                        dire_attack_signals[attacker_id][victim_id][start_index + i] = attack["damage"]*math.exp(-i*match["parameters"]["evaluatefightCoordination"]["time_delta"]*match["parameters"]["evaluatefightCoordination"]["decay_rate"])
                else:
                    continue
            #normalise each vector
            for radiant_hero in radiant_involved:
                for dire_hero in dire_involved:
                    radiant_attack_signals[radiant_hero][dire_hero] = normalize(radiant_attack_signals[radiant_hero][dire_hero])
            for dire_hero in dire_involved:
                for radiant_hero in radiant_involved:
                    dire_attack_signals[dire_hero][radiant_hero] = normalize(dire_attack_signals[dire_hero][radiant_hero])
            #make vectors for whole radiant team
            radiant_attack_signals["team"] = {}
            for dire_hero in dire_involved:
                radiant_attack_signals["team"][dire_hero] = np.zeros(n)   
            for dire_hero in dire_involved:
                for radiant_hero in radiant_involved:
                    radiant_attack_signals["team"][dire_hero] = radiant_attack_signals["team"][dire_hero] + radiant_attack_signals[radiant_hero][dire_hero]
            for dire_hero in dire_involved:
                radiant_attack_signals["team"][dire_hero] = normalize(radiant_attack_signals["team"][dire_hero])
            #same for dire
            dire_attack_signals["team"] = {}
            for radiant_hero in radiant_involved:
                dire_attack_signals["team"][radiant_hero] = np.zeros(n)   
            for radiant_hero in radiant_involved:
                for dire_hero in dire_involved:
                    dire_attack_signals["team"][radiant_hero] = dire_attack_signals["team"][radiant_hero] + dire_attack_signals[dire_hero][radiant_hero]
            for radiant_hero in radiant_involved:
                dire_attack_signals["team"][radiant_hero] = normalize(dire_attack_signals["team"][radiant_hero])
            #form matrix of signals for radiant team
            R = np.zeros((len(radiant_involved),n*len(dire_involved)))
            for i in range(0,len(radiant_involved)):
                for j in range(0,len(dire_involved)):
                    R[i,j*n:(j+1)*n] = radiant_attack_signals[radiant_involved[i]][dire_involved[j]]
            #form matrix of signals for dire team
            D = np.zeros((len(dire_involved),n*len(radiant_involved)))
            for i in range(0,len(dire_involved)):
                for j in range(0,len(radiant_involved)):
                    D[i,j*n:(j+1)*n] = dire_attack_signals[dire_involved[i]][radiant_involved[j]]
            #form vector of signals for radiant team
            p = np.zeros(n*len(dire_involved))
            for i in range(0,len(dire_involved)):
                p[i*n:(i+1)*n] = radiant_attack_signals["team"][dire_involved[i]]
            #form vector of signals for dire team
            q = np.zeros(n*len(radiant_involved))
            for i in range(0,len(radiant_involved)):
                q[i*n:(i+1)*n] = dire_attack_signals["team"][radiant_involved[i]]
            #multiply Dq and Dq to get coordination coefficients for each hero
            v = np.dot(R,p)
            for i in range(0,len(radiant_involved)):
                coordination_coeffs[match["entities"][radiant_involved[i]]["control"]] = v[i]
            w = np.dot(D,q)
            for i in range(0,len(dire_involved)):
                coordination_coeffs[match["entities"][dire_involved[i]]["control"]] = w[i]

        for player_index in match["players"]:
            match["stats"]["player-stats"][player_index]["fight-coordination"] = np.average(coordination_coeffs[player_index])

def evaluateFightMovementSpeed(match):
    #calculates the average speed a player/hero moves at during a fight
    total_fight_time = {}
    total_distance_traveled = {}
    for player_id in match["players"]:
        total_fight_time[player_id] = 0
        total_distance_traveled[player_id] = 0

    max_time = max(match["raw"]["trajectories"]["time"])

    for fight in match["fight_list"]:
        start_index = findTimeTick(match, match["raw"]["trajectories"]["time"], min(fight["time_start"],max_time))
        end_index = findTimeTick(match, match["raw"]["trajectories"]["time"], min(fight["time_end"],max_time))
        for hero_id in fight["heroes_involved"]:
            total_fight_time[match["entities"][hero_id]["control"]] += fight["time_end"] - fight["time_start"]
            i = start_index
            while i <= end_index - 1:
                total_distance_traveled[match["entities"][hero_id]["control"]] += math.sqrt((match["raw"]["trajectories"][match["entities"][hero_id]["unit"]]["position"][i][0] - match["raw"]["trajectories"][match["entities"][hero_id]["unit"]]["position"][i+1][0])**2 + (match["raw"]["trajectories"][match["entities"][hero_id]["unit"]]["position"][i][1] - match["raw"]["trajectories"][match["entities"][hero_id]["unit"]]["position"][i+1][1])**2)
                i +=1
    
    for player_id in match["players"]:
        match["stats"]["player-stats"][player_id]["average-fight-movement-speed"] = total_distance_traveled[player_id]/total_fight_time[player_id] 

def evaluateFightInitiation(match):
    # evaluate whether players tend to win the fights they initiate (in terms of gold/exp exchanged)
    for fight in match["fight_list"]:
        total_gold_exp_tranfer = abs(fight["radiant_gold_gained"]) + abs(fight["dire_gold_gained"]) + abs(fight["radiant_exp_gained"]) + abs(fight["dire_exp_gained"])
        if total_gold_exp_tranfer != 0:
            initiation_score = fight["initiation_side"]*((fight["radiant_gold_gained"] - fight["dire_gold_gained"] + fight["radiant_exp_gained"] - fight["dire_exp_gained"])/total_gold_exp_tranfer) 
            for hero_id in fight["heroes_involved"]:
                match["stats"]["player-stats"][match["entities"][hero_id]["control"]]["initiation_score"] += initiation_score

def evaluateLastHits(match):
    # evaluate the number of creeps last-hit, denied and missed 
    creeps_lasthit = 0
    creeps_denied = 0
    creeps_missed = 0

    creep_types = ["lane","neutral"]

    for creep_death in match["creep_deaths"]:
        #print ""
        #print creep_death

        creep_type = creep_death["creep_type"].split("_")
        creep_type = creep_type[3]
        if creep_death["death_type"] == "last-hit":
            match["stats"]["player-stats"][match["entities"][creep_death["killed_by"]]["control"]]["num-creeps-last-hit"] += 1
            creeps_lasthit += 1
            if creep_type == "lane" or creep_type == "siege":
                match["stats"]["player-stats"][match["entities"][creep_death["killed_by"]]["control"]]["num-lane-creeps-lasthit"] += 1
            elif creep_type == "neutral":
                match["stats"]["player-stats"][match["entities"][creep_death["killed_by"]]["control"]]["num-neutral-creeps-lasthit"] += 1
            if len(creep_death["contested_by"]) == 0:
                match["stats"]["player-stats"][match["entities"][creep_death["killed_by"]]["control"]]["lasthit-free"] += 1
            else:
                match["stats"]["player-stats"][match["entities"][creep_death["killed_by"]]["control"]]["lasthit-contested"] += 1
                for contestant in creep_death["contested_by"]:
                    match["stats"]["player-stats"][match["entities"][contestant]["control"]]["contested-total"] += 1
        elif creep_death["death_type"] == "denied":
            match["stats"]["player-stats"][match["entities"][creep_death["killed_by"]]["control"]]["num-creeps-denied"] += 1
            creeps_denied += 1
            for responsible in creep_death["responsible_for"]:
                match["stats"]["player-stats"][match["entities"][responsible]["control"]]["missed-contested"] += 1
            for contestant in creep_death["contested_by"]:
                match["stats"]["player-stats"][match["entities"][contestant]["control"]]["contested-total"] += 1
        elif creep_death["death_type"] == "none":
            creeps_missed += 1
            if len(creep_death["contested_by"]) == 0:
                for responsible in creep_death["responsible_for"]:
                    match["stats"]["player-stats"][match["entities"][responsible]["control"]]["missed-free"] += 1
            else:
                for responsible in creep_death["responsible_for"]:
                    match["stats"]["player-stats"][match["entities"][responsible]["control"]]["missed-contested"] += 1
                for contestant in creep_death["contested_by"]:
                    match["stats"]["player-stats"][match["entities"][contestant]["control"]]["contested-total"] += 1

    match["stats"]["match-stats"]["creeps-lasthit"] = creeps_lasthit
    match["stats"]["match-stats"]["creeps-denied"] = creeps_denied
    match["stats"]["match-stats"]["creeps-missed"] = creeps_missed
    match["stats"]["match-stats"]["creeps-killed"] = len(match["creep_deaths"])

def evaluateObjectives(match):
    # evaluate the features for the Objectives attribute
    evaluateBuildingDamage(match)

def evaluateBuildingDamage(match):
    # for each hero evaluate the amount of damage they do to enemy towers and rax
    for row in match["raw"]["damage_events"]:
        attacker = transformHeroName(row[2])
        victim = transformHeroName(row[3]) 
        if attacker in match["heroes"] and "tower" in victim:
            match["stats"]["player-stats"][match["heroes"][attacker]["player_index"]]["tower-damage"] += row[5]
        elif attacker in match["heroes"] and "rax" in victim:
            match["stats"]["player-stats"][match["heroes"][attacker]["player_index"]]["rax-damage"] += row[5]

def iterateEventList(match,array,event_type,namespace):
    for i, item in enumerate(array):
        item["type"] = event_type
        match["results"]["events"][namespace + i] = item

def makeResults(match):
    # sample the data and place into the match["results"]
    match["results"] = {}
    match["results"]["header"] = match["header"]
    match["results"]["events"] = {}

    iterateEventList(match,match["hero_deaths"],"kill",match["parameters"]["namespace"]["kills_namespace"])
    iterateEventList(match,match["creep_spawns"],"creep_spawn",match["parameters"]["namespace"]["creep_spawn_namespace"])
    iterateEventList(match,match["creep_deaths"],"creep_death",match["parameters"]["namespace"]["creep_death_namespace"])
    iterateEventList(match,match["fight_list"],"fight",match["parameters"]["namespace"]["fights_namespace"])

    # sample the timeseries by deleting points
    for entity in match["entities"]:
        for i in range(0,len(match["entities"][entity]["position"])):
            previous_time = match["entities"][entity]["position"][i]["timeseries"]["samples"][0]["t"]
            j = 0
            while j < len(match["entities"][entity]["position"][i]["timeseries"]["samples"]):
                if match["entities"][entity]["position"][i]["timeseries"]["samples"][j]["t"] - previous_time < 1/match["parameters"]["makeResults"]["sample_rate_position"]:
                    del match["entities"][entity]["position"][i]["timeseries"]["samples"][j]
                else:
                    previous_time =  match["entities"][entity]["position"][i]["timeseries"]["samples"][j]["t"]
                    j += 1

    match["results"]["entites"] = match["entities"]

    #sample the gold and exp timeseries
    previous_time = match["timeseries"]["gold-advantage"]["samples"][0]["t"]
    j = 0
    while j < len(match["timeseries"]["gold-advantage"]["samples"]):
        if match["timeseries"]["gold-advantage"]["samples"][j]["t"] - previous_time < 1/match["parameters"]["makeResults"]["sample_rate_gold_exp"]:
            del match["timeseries"]["gold-advantage"]["samples"][j]
        else:
            previous_time = match["timeseries"]["gold-advantage"]["samples"][j]["t"]
            j += 1

    previous_time = match["timeseries"]["exp-advantage"]["samples"][0]["t"]
    j = 0
    while j < len(match["timeseries"]["exp-advantage"]["samples"]):
        if match["timeseries"]["exp-advantage"]["samples"][j]["t"] - previous_time < 1/match["parameters"]["makeResults"]["sample_rate_gold_exp"]:
            del match["timeseries"]["exp-advantage"]["samples"][j]
        else:
            previous_time = match["timeseries"]["exp-advantage"]["samples"][j]["t"]
            j += 1

    match["results"]["timeseries"] = match["timeseries"]

def evaluateMechanics(match):
    # evaluate different skills for the Mechanics attribute
    evaluateCameraControl(match)

def evaluateFighting(match):
    # evaluate different skills for the Fighting attribute
    evaluateBasicFightStats(match)
    evaluateFightMovementSpeed(match)
    evaluateFightCoordination(match)
    evaluateFightMovementSpeed(match)
    evaluateFightDamage(match)
    evaluateFightInitiation(match)
    evaluateHeroDamage(match)

def evaluateFarming(match):
    # evaluate different skills for the Farming attribute
    evaluateLastHits(match)
    evaluateHeroGoldExp(match)

def evaluateMovement(match):
    # evaluate different skills for the Movement attribute
    evaluateVisibility(match)

def writeToJson(filename,dictionary):
    # given a filename and a dictionary write the dictionary to a JSON file named filename.json
    my_file = open(filename,'wb')
    my_file.write(json.dumps(dictionary, sort_keys=True,indent=4, separators=(',', ': ')))    
    my_file.close()

def process(match):
    # extract information from the raw data, create events/entities that we recognise in the game 
    makeUnits(match)
    processHeroVisibility(match)
    processHeroDeaths(match)
    processHeroPosition(match)
    processGoldXP(match)
    processCameraControl(match)
    processHeroAttacks(match)
    processFights(match)
    processCreepSpawns(match)
    processCreepDeaths(match)

def computeStats(match):
    # compute the statistics that will be used as features in the machine learning model
    makeStats(match)
    evaluateHeroDeaths(match)

    evaluateMechanics(match)
    evaluateFighting(match)
    evaluateFarming(match)
    evaluateMovement(match)
    evaluateObjectives(match)

def main():
    match_id = sys.argv[1]
    match_directory = sys.argv[2]
    analysis_filename = sys.argv[3]
    header_filename = sys.argv[4]
    stats_filename = sys.argv[5]

    match = loadFiles(match_id, match_directory)
    process(match)
    computeStats(match)
    makeResults(match)

    writeToJson(analysis_filename,match["results"]) 
    writeToJson(header_filename,match["results"]["header"])
    writeToJson(stats_filename,match["stats"]) 
    #delete intermediate/input files
    #shutil.rmtree(match_directory)

if __name__ == "__main__":
    #cProfile.run('main()')
    main()