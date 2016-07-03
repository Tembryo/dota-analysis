import logging
import sys
import csv
import datetime
import math
import json
import bisect
import numpy as np
import scipy.sparse
import matplotlib.pyplot as plt
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
    parameters["namespace"]["buildings_namespace"] = 50000


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
    parameters["processFights"]["hp_change_threshold"] = 0.8
    parameters["processFights"]["hp_min_threshold"] = 100

    parameters["processCreepDeaths"] = {}
    parameters["processCreepDeaths"]["experience_range"] = 1300 

    parameters["formAdjacencyMatrix"] = {}
    parameters["formAdjacencyMatrix"]["edge_threshold"] = 1 
    parameters["formAdjacencyMatrix"]["time_threshold"] = 30

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

def readableTime(time):
    m, s = divmod(time, 60)
    return "%02d:%02d" %  (m, s)

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

def normalize(v):
    #function for normalizing an array
    norm = np.linalg.norm(v)
    if norm == 0: 
       return v
    return v/norm

def dist_nD(P,A,B):
    #Calculates the distance from the point ``P`` to the line given by the points ``A`` and ``B``.
    pa = P - A
    ba = B - A
    t = np.dot(pa,ba)/np.dot(ba,ba)
    d = np.linalg.norm(pa - t * ba)
    return d

def rdp(M,epsilon,dist):
    """
    Pure Python implementation of the Ramer-Douglas-Peucker algorithm.

    :copyright: (c) 2014 Fabian Hirschmann <fabian@hirschmann.email>
    :license: MIT, see LICENSE.txt for more details.
    """
    dmax = 0.0
    index = -1

    for i in xrange(1, M.shape[0]):
        d = dist(M[i], M[0], M[-1])

        if d > dmax:
            index = i
            dmax = d

    if dmax > epsilon:
        r1 = rdp(M[:index + 1], epsilon, dist)
        r2 = rdp(M[index:], epsilon, dist)

        return np.vstack((r1[:-1], r2))
    else:
        return np.vstack((M[0], M[-1]))

def makeAreaMatrix(match):
    #associate area labels to boxes in a 32 by 32 grid where box (0,0) has its origin at xmin,ymin
    Num_Box =32

    radiant_base = [[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],\
    [1,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8],[1,9],[1,10],\
    [2,2],[2,3],[2,4],[2,5],[2,6],[2,7],[2,8],[2,9],[2,10],\
    [3,2],[3,3],[3,4],[3,5],[3,6],[3,7],[3,8],[3,9],[3,10],\
    [4,2],[4,3],[4,4],[4,5],[4,6],[4,7],[4,8],[4,9],[4,10],\
    [5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9],[5,10],\
    [6,2],[6,3],[6,4],[6,5],[6,6],[6,7],[6,8],[6,9],\
    [7,2],[7,3],[7,4],[7,5],[7,6],[7,7],[7,8],\
    [8,2],[8,3],[8,4],[8,5],[8,6],[8,7],[9,2]]

    top_one = [[1,11],[1,12],[1,13],[2,11],[2,12],[2,13],[3,11],[3,12],[3,13]]

    top_two = [[1,14],[1,15],[1,16],[1,17],[1,18],[1,19],[1,20],\
    [2,14],[2,15],[2,16],[2,17],[2,18],[2,19],[2,20],\
    [3,14],[3,15],[3,16],[3,17],[3,18],[3,19],[3,20]]

    top_three = [[1,21],[1,22],[1,23],[1,24],[1,25],[1,26],[1,27],[2,21],[2,22],[2,23],[2,24],[2,25],[2,26],[2,27],[2,28],\
    [3,21],[3,22],[3,23],[3,24],[3,25],[3,26],[3,27],[3,28],[3,29],[4,27],[4,28],[4,29],\
    [5,27],[5,28],[5,29]]

    top_four = [[6,27],[6,28],[6,29],[7,27],[7,28],[7,29],\
    [8,27],[8,28],[8,29],[9,27],[9,28],[9,29],[10,27],[10,28],[10,29],\
    [11,27],[11,28],[11,29],[12,27],[12,28],[12,29],[13,27],[13,28],[13,29],\
    [14,27],[14,28],[14,29]]

    top_five = [[15,27],[15,28],[15,29],[16,27],[16,28],[16,29],\
    [17,27],[17,28],[17,29],[18,27],[18,28],[18,29],[19,27],[19,28],[19,29],[20,27],[20,28],[20,29],[21,27],[21,28],[21,29]]

    mid_one = [[7,9],[7,10],[8,9],[8,10],[9,9],[9,10],[10,10]]

    mid_two = [[8,11],[9,11],[9,12],[10,11],[10,12],[10,13],[11,11],[11,12],[11,13],[11,14],\
    [12,12],[12,13],[12,14],[12,15],[13,13],[13,14]]

    mid_three = [[13,15],[13,16],[14,14],[14,15],[14,16],[14,17],[15,14],[15,15],[15,16],[15,17],[15,18],[16,15],[16,16],[16,17],\
    [17,15],[17,16]]

    mid_four =[[16,18],[17,17],[17,18],[18,17],[18,18],[18,19],[19,18],[19,19],[19,20],\
    [20,19]]

    mid_five =[[20,20],[20,21],[21,20],[21,21],[21,22],[22,21],[22,22],[22,23],[23,22]]

    bot_one =[[9,3],[9,4],[10,3],[10,4],[11,3],[11,4],[12,3],[12,4],[13,3],[13,4],\
    [14,3],[14,4]]

    bot_two =[[15,3],[15,4],[16,3],[16,4],[17,3],[17,4],[18,3],[18,4],[19,3],[19,4],\
    [20,3],[20,4],[21,3],[21,4],[22,3],[22,4],[23,3],[23,4],[24,3],[24,4],\
    [25,3],[25,4],[25,3],[25,4],[25,5]]

    bot_three =[[26,3],[26,4],[26,5],[26,6],[26,7],\
    [27,3],[27,4],[27,5],[27,6],[27,7],[27,8],[27,9],[27,10],[27,11],\
    [28,4],[28,5],[28,6],[28,7],[28,8],[28,9],[28,10],[28,11],
    [29,6],[29,7],[29,8],[29,9],[29,10],[29,11],[30,8]]

    bot_four =[[27,12],[27,13],[27,14],[27,15],[27,16],\
    [28,12],[28,13],[28,14],[28,15],[28,16],\
    [29,12],[29,13],[29,14],[29,15],[29,16]]

    bot_five =[[27,17],[27,18],[27,19],[27,20],\
    [28,17],[28,18],[28,19],[28,20],\
    [29,17],[29,18],[29,19],[29,20]]

    dire_base = [[22,24],[22,25],[22,26],[22,27],[22,28],[22,29],[22,30],\
    [23,23],[23,24],[23,25],[23,26],[23,27],[23,28],[23,29],[23,30],\
    [24,22],[24,23],[24,24],[24,25],[24,26],[24,27],[24,28],[24,29],[24,30],\
    [25,22],[25,23],[25,24],[25,25],[25,26],[25,27],[25,28],[25,29],[25,30],\
    [26,21],[26,22],[26,23],[26,24],[26,25],[26,26],[26,27],[26,28],[26,29],[26,30],\
    [27,21],[27,22],[27,23],[27,24],[27,25],[27,26],[27,27],[27,28],[27,29],[27,30],\
    [28,21],[28,22],[28,23],[28,24],[28,25],[28,26],[28,27],[28,28],[28,29],[28,30],\
    [29,21],[29,22],[29,23],[29,24],[29,25],[29,26],[29,27],[29,28],[29,29],[29,30],\
    [30,21],[30,22],[30,23],[30,24],[30,25],[30,26],[30,27],[30,28],[30,29],[30,30]]

    dire_jungle =[[5,23],[5,24],[5,25],[6,23],[6,24],[6,25],[7,23],[7,24],[7,25],\
    [8,23],[8,24],[8,25],[9,23],[9,24],[9,25],[10,23],[10,24],[10,25],\
    [11,23],[11,24],[11,25],[12,21],[12,22],[12,23],[12,24],[12,25],\
    [13,21],[13,22],[13,23],[13,24],[13,25],[14,21],[14,22],[14,23],[14,24],[14,25],\
    [15,20],[15,21],[15,22],[15,23],[15,24],[15,25],[16,20],[16,21],[16,22],[16,23],[16,24],[16,25],\
    [17,22],[17,23],[17,24],[17,25],[18,23],[18,24]]

    radiant_jungle = [[12,8],[12,9],[13,7],[13,8],[13,9],[13,10],\
    [14,6],[14,7],[14,8],[14,9],[14,10],[14,11],[15,6],[15,7],[15,8],[15,9],[15,10],[15,11],[15,12],\
    [16,6],[16,7],[16,8],[16,9],[16,10],[16,11],[16,12],\
    [17,6],[17,7],[17,8],[17,9],[17,10],[17,11],[18,6],[18,7],[18,8],[18,9],[18,10],[18,11],\
    [19,6],[19,7],[19,8],[19,9],[19,10],[20,6],[20,7],[20,8],[20,9],\
    [21,6],[21,7],[21,8],[21,9],[21,10],[22,6],[22,7],[22,8],[22,9],[22,10],\
    [23,6],[23,7],[23,8],[23,9],[24,7],[24,8],[24,9],[25,8],[25,9]]

    dire_secret = [[21,17],[22,16],[22,17],[22,18],[23,16],[23,17],[23,18],\
    [24,16],[24,17],[25,16],[25,17]]

    radiant_secret = [[5,17],[6,17],[6,18],[6,19],[6,20],[7,15],[7,16],[7,17],[7,18],[7,19],[7,20],\
    [8,14],[8,15],[8,18],[8,19],[8,20],[9,19],[9,20]]

    radiant_ancient = [[9,16],[9,17],[10,15],[10,16],[10,17],[11,16]]

    top_rune = [[10,19],[10,20],[11,18],[11,19],[11,20],[12,18],[12,19]]

    bottom_rune = [[20,12],[21,11],[21,12],[22,11],[22,12]]

    roshan = [[23,12],[23,13],[24,12],[24,13]]

    dire_ancient = [[19,14],[19,15],[20,14],[20,15],[21,14],[21,15],[22,14],[22,15],[23,14],[23,15],[24,14],[24,15]]

    match["areas"] = {"radiant ancient":radiant_ancient,"radiant secret shop":radiant_secret,"dire secret shop":dire_secret,"radiant jungle":radiant_jungle,"dire jungle":dire_jungle, "top lane one":top_one,"top lane two":top_two,"top lane three":top_three,"top lane four":top_four,"top lane five":top_five, "dire base":dire_base,"mid lane one":mid_one, "mid lane two":mid_two,"mid lane three":mid_three, "mid lane four":mid_four, "mid lane five":mid_five, "bot lane one":bot_one,"bot lane two":bot_two, "bot lane three":bot_three, "bot lane four":bot_four, "bot lane five":bot_five, "radiant base":radiant_base,"top rune":top_rune,"bottom rune":bottom_rune,"roshan":roshan,"dire ancient":dire_ancient}
    match["area_matrix"] = [["undefined" for i in range(Num_Box)] for i in range(Num_Box)] 

    for key in match["areas"]:
        for elem in match["areas"][key]:
            match["area_matrix"][Num_Box-1-elem[1]][elem[0]] = key

def assignPlayerArea(match,x,y):
    #takes in player (x,y) coordinate and returns which box of the area_matrix they are in

    xmax = match["parameters"]["map"]["xmax"]
    xmin = match["parameters"]["map"]["xmin"]
    ymax = match["parameters"]["map"]["ymax"]
    ymin = match["parameters"]["map"]["ymin"]
    num_box = match["parameters"]["map"]["num_box"]

    grid_size_x = (xmax-xmin)/num_box
    grid_size_y = (ymax-ymin)/num_box

    i = num_box - 1 - int(math.floor((y-ymin)/grid_size_y))
    j = int(math.floor((x-xmin)/grid_size_x))

    return match["area_matrix"][i][j]

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
        },
        "ability_events": [],
        "heal_events": [],
        "item_events": [],
        "ward_rows": [],
        "purchase_events": []
    }

    match["header"]["teams"] = {
        0: {
            "side":"radiant",
            "name":"empty",
            "short":"empty"},            
        1: {
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
                elif row[1]=="DOTA_COMBATLOG_DAMAGE" and row[2] != "null":
                    match["raw"]["damage_events"].append(row)
                elif row[1] == "DOTA_COMBATLOG_DEATH":
                    match["raw"]["death_events"].append(row)
                elif row[1] == "PLAYER_ENT":
                    row[2] = int(row[2])
                    row[3] = int(row[3])
                    match["player_index_by_handle"][row[3]] = row[2]
                elif row[1] == "DOTA_COMBATLOG_ABILITY":
                    match["raw"]["ability_events"].append(row)
                elif row[1] == "DOTA_COMBATLOG_HEAL":
                    match["raw"]["heal_events"].append(row)
                elif row[1] == "DOTA_COMBATLOG_ITEM":
                    match["raw"]["item_events"].append(row)
                elif row[1] == "DOTA_COMBATLOG_PURCHASE":
                    match["raw"]["purchase_events"].append(row)

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
                    hp = float(row["{}HP".format(index)])
                    mana = float(row["{}Mana".format(index)])

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
                if row[1] == "DEATH":
                    match["raw"]["death_rows"].append(row)
                elif row[1] == "SPAWN":
                    row[4] = float(row[4])
                    row[5] = float(row[5])
                    match["raw"]["spawn_rows"].append(row)
                elif row[1] == "PLAYER_CHANGE_SELECTION":
                    row[2] = int(row[2])
                    match["raw"]["unit_selection_rows"].append(row)
                elif row[1] == "HERO_VISIBILITY":
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
                "entity_handle": 0, #in-game identifier
                "abilities": [],
                "GPM": 0,
                "XPM": 0
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
            deceased_name = transformHeroName(deceased)
            # if killer was another hero transform the name (it may have been a tower)
            if killer.startswith("npc_dota_hero_"):
                killer_name = transformHeroName(killer)
            else:
                killer_name = killer
            if not deceased_name in match["heroes"]:
                logging.info("bad deceased name" + deceased)
                continue
            side = match["heroes"][deceased_name]["side"]
            # now form a dictionary that will be stored as an event 
            death_time = row[0]
            new_death = {"time": death_time,"team":side,"deceased":deceased_name,"killer":killer_name}
            # put kill event in the events dictionary
            match["hero_deaths"].append(new_death)

def processBuildingDeaths(match):
    #extract the events when buildings (Towers, Barracks) are destroyed
    match["building_deaths"] = []
    for row in match["raw"]["death_rows"]:
        if row[2].startswith("npc_dota_goodguys_tower") or row[2].startswith("npc_dota_badguys_tower") or row[2].startswith("good_rax") or row[2].startswith("bad_rax"):
            building_death = {
                "time": row[0],
                "building_type": row[2],
                "position": [float(row[5]),float(row[6])]
            }
            match["building_deaths"].append(building_death)

def processHeroPosition(match):
    # extract the [x,y] coordinates for each hero and collect into trajectories 
    hero_spawns = {}
    hero_deaths = {}
    hero_lives = {}
    match["hero_alive_status"] = {}

    for hero in match["heroes"]: 
        hero_spawns[hero] = []
        hero_deaths[hero] = []
        hero_lives[hero] = []
        match["hero_alive_status"][hero] = np.zeros((len(match["raw"]["trajectories"]["time"]),1))

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
                raise Exception("hero dies n times and spawns n+2 or more times")
            if start > end:
                raise Exception("hero dies before they spawn!")
            else:
                hero_lives[hero].append({"start":start,"end":end })

    max_time = max(match["raw"]["trajectories"]["time"])

    for hero in match["heroes"]:
        for life in hero_lives[hero]:
            start_index = findTimeTick(match,match["raw"]["trajectories"]["time"],min(life["start"],max_time))
            end_index = findTimeTick(match,match["raw"]["trajectories"]["time"],min(life["end"],max_time))

            match["hero_alive_status"][hero][start_index:end_index] = 1

            samples_list =[]
            i = start_index
            while i <= end_index:
                samples_list.append({
                    "t":match["raw"]["trajectories"]["time"][i],
                    "v":match["raw"]["trajectories"][hero]["position"][i]
                    })
                i += 1

            stored = {
                "start-index": start_index,
                "end-index": end_index,
                "time-start": life["start"],
                "time-end": life["end"],
                "timeseries": {"format":"samples","samples":samples_list}
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
                        "side": match["heroes"][attacker]["side"],
                        "victim": victim,
                        "damage": int(row[5]),
                        "health_delta": row[6],
                        "time": row[0],
                        "attack_method": attack_method,
                        "position": match["raw"]["trajectories"][victim]["position"][findTimeTick(match,match["raw"]["trajectories"]["time"],row[0])]
                        }
                match["attack_list"].append(attack)

            elif attacker.startswith("npc_dota_goodguys_tower") and victim.startswith("npc_dota_hero_"):
                attacker = transformHeroName(attacker)
                victim = transformHeroName(victim)
                #filter out illusions and damage instances where heroes damage themselves (e.g., Pudge rot)
                if attacker not in match["heroes"] or victim not in match["heroes"] or attacker == victim:
                    continue
                attack_method = "tower-attack"

                if row[4] == "":
                    damage = 0
                else:
                    damage = int(row[4])

                attack = {
                        "attacker": attacker,
                        "side": "radiant",
                        "victim": victim,
                        "damage": damage,
                        "health_delta": row[5],
                        "time": row[0],
                        "attack_method": attack_method,
                        "position": match["raw"]["trajectories"][victim]["position"][findTimeTick(match,match["raw"]["trajectories"]["time"],row[0])]
                        }
                match["attack_list"].append(attack)

            elif attacker.startswith("npc_dota_badguys_tower") and victim.startswith("npc_dota_hero_"):
                attacker = transformHeroName(attacker)
                victim = transformHeroName(victim)
                #filter out illusions and damage instances where heroes damage themselves (e.g., Pudge rot)
                if attacker not in match["heroes"] or victim not in match["heroes"] or attacker == victim:
                    continue
                attack_method = "tower-attack"
                if row[4] == "":
                    damage = 0
                else:
                    damage = int(row[4])

                attack = {
                        "attacker": attacker,
                        "side": "dire",
                        "victim": victim,
                        "damage": damage,
                        "health_delta": row[5],
                        "time": row[0],
                        "attack_method": attack_method,
                        "position": match["raw"]["trajectories"][victim]["position"][findTimeTick(match,match["raw"]["trajectories"]["time"],row[0])]
                        }
                match["attack_list"].append(attack)

def fightDistMetric(match,attack1,attack2):
    # calculate the distance between two attacks
    params = [0.002,0.2,-3.5]
    r = math.sqrt((attack1["position"][0] - attack2["position"][0]) * (attack1["position"][0] - attack2["position"][0]) + (attack1["position"][1]-attack2["position"][1]) * (attack1["position"][1]-attack2["position"][1]))
    t = (abs(attack1["time"] - attack2["time"])) 
    v1 = np.zeros([11])
    v2 = np.zeros([11])

    if attack1["attacker"].startswith("tower"):
        v1[10] = 1
    elif attack2["attacker"].startswith("tower"):
        v2[10] = 1
    else:
        v1[match["heroes"][attack1["attacker"]]["player_index"]] = 1
        v2[match["heroes"][attack2["attacker"]]["player_index"]] = 1
    v1[match["heroes"][attack1["victim"]]["player_index"]] = 1
    v2[match["heroes"][attack2["victim"]]["player_index"]] = 1

    v =  np.dot(v1,v2)

    return params[0]*r + params[1]*t + params[2]*v

def formAdjacencyMatrix(match,my_list,dist):
    # find distance between each attack in the attack list
    # dist is a distance metric function the form f(match,my_list[i],my_list[j]) i.e., it finds distance between two elements i,j in the list
    n = len(my_list)
    A = np.zeros(shape = (n,n))

    for i in range(0,n):
        for j in range(i+1,n):
            if my_list[j]["time"] - my_list[i]["time"] > match["parameters"]["formAdjacencyMatrix"]["time_threshold"]:
                break
            else:            
                p = dist(match,my_list[i],my_list[j])
                if p < 1:
                    A[i,j] = 1
    
    return A + np.transpose(A)

def processFights(match): 
    #return a list of fights 
    match["fight_list"] = []

    A = formAdjacencyMatrix(match,match["attack_list"],fightDistMetric)
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
        hp_change = {}

        for attack_index in attack_sequence:
            attack = match["attack_list"][attack_index]
            if attack["side"] == "radiant":
                damage_dealt_radiant += attack["damage"]
            elif attack["side"] == "dire":
                damage_dealt_dire += attack["damage"]
            if attack["attacker"] in match["heroes"]:
                heroes_involved = heroes_involved.union([match["heroes"][attack["attacker"]]["entity_id"],match["heroes"][attack["victim"]]["entity_id"]])
            else:
                heroes_involved = heroes_involved.union([match["heroes"][attack["victim"]]["entity_id"]])
            position_x.append(attack["position"][0])
            position_y.append(attack["position"][1])
            # calculate a measure of which team initiated the fight
            if attack["time"] - time_start < match["parameters"]["processFights"]["initiation_window"]:
                if attack["side"] == "radiant":
                    radiant_initiation_damage += attack["damage"]
                elif attack["side"] == "dire":
                    dire_initiation_damage += attack["damage"]

        mean_position = [np.mean(position_x),np.mean(position_y)]   
        if dire_initiation_damage + radiant_initiation_damage != 0:
            side_indicator = (radiant_initiation_damage - dire_initiation_damage)/(dire_initiation_damage + radiant_initiation_damage)
        else:
            side_indicator = 0

        # find which heroes were killed during the fight - this should be changed to assign death to the nearest cluster perhaps?
        for death in match["hero_deaths"]:
            if match["heroes"][death["deceased"]]["entity_id"] in heroes_involved and death["time"] >= time_start and death["time"] <= time_end:
                heroes_killed = heroes_killed.union([match["heroes"][death["deceased"]]["entity_id"]])

        if len(heroes_killed) > 0:

            #calculate amount of gold and exp exchanged during fight
            start_index = findTimeTick(match,gold_time,max(time_start,gold_time[0]))
            end_index = findTimeTick(match,gold_time,min(time_end + 1,gold_time[-1]))

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

            start_index = findTimeTick(match,exp_time,max(time_start,exp_time[0]))
            end_index = findTimeTick(match,exp_time,min(time_end + 1,exp_time[-1]))

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

        readable_time_start = readableTime(time_start)
        readable_time_end = readableTime(time_end) 

        time_start_index = findTimeTick(match,match["raw"]["trajectories"]["time"],max(time_start,match["raw"]["trajectories"]["time"][0]))
        time_end_index = findTimeTick(match,match["raw"]["trajectories"]["time"],min(time_end,match["raw"]["trajectories"]["time"][-1]))

        for hero_entity_id in heroes_involved:
            hp_change[hero_entity_id] = {}
            if time_start_index != time_end_index:
                hp_change[hero_entity_id]["hp_max"] = max(match["raw"]["trajectories"][match["entities"][hero_entity_id]["unit"]]["hp"][time_start_index:time_end_index])
                if hero_entity_id in heroes_killed:
                    hp_change[hero_entity_id]["hp_min"] = 0
                else:
                    hp_change[hero_entity_id]["hp_min"] = min(match["raw"]["trajectories"][match["entities"][hero_entity_id]["unit"]]["hp"][time_start_index:time_end_index])

        fight = {
                "attack_sequence": attack_sequence,
                "damage_dealt_radiant": damage_dealt_radiant,
                "damage_dealt_dire": damage_dealt_dire,
                "time_start": time_start,
                "time_end": time_end,
                "readable_time_start": readable_time_start,
                "readable_time_end": readable_time_end,
                "heroes_involved": list(heroes_involved),
                "heroes_killed": list(heroes_killed),
                "mean_position": mean_position,
                "initiation_side": side_indicator,
                "radiant_gold_gained": radiant_gold_gained,
                "dire_gold_gained": dire_gold_gained,
                "radiant_exp_gained": radiant_exp_gained,
                "dire_exp_gained": dire_exp_gained,
                "hp_change": hp_change
        }

        hp_min = match["parameters"]["processFights"]["hp_min_threshold"]
        hp_reduction = 0
        for hero_entity_id in hp_change:
            if not hp_change[hero_entity_id] or hp_change[hero_entity_id]["hp_max"] == 0:
                continue
            else:
                hp_reduction = max(hp_reduction,(hp_change[hero_entity_id]["hp_max"] - hp_change[hero_entity_id]["hp_min"])/hp_change[hero_entity_id]["hp_max"] )
                hp_min = min(hp_min,hp_change[hero_entity_id]["hp_min"])

        if hp_reduction > match["parameters"]["processFights"]["hp_change_threshold"] or hp_min < match["parameters"]["processFights"]["hp_min_threshold"]:
            match["fight_list"].append(fight)

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
                d = math.sqrt((x - l["x"]) * (x - l["x"]) + (y - l["y"]) * (y - l["y"]))
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
            entity_handle_to_event_map[int(row[4])] = {"death_type": "last-hit","killer_handle": int(row[5])}
        elif row[1] == "OVERHEAD_ALERT_DENY":
            entity_handle_to_event_map[int(row[4])] = {"death_type": "denied", "killer_handle": int(row[3])}

    max_time = max(match["raw"]["trajectories"]["time"])        

    for row in match["raw"]["death_rows"]:
        if row[2].startswith("npc_dota_creep_"):
            if row[0] < max_time:
                creep_position = [float(row[5]),float(row[6])]
                time = row[0]
                creep_team_id = int(row[4])
                entity_handle = int(row[3])
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
                    d = math.sqrt((hero_position[0] - creep_position[0])*(hero_position[0] - creep_position[0]) + (hero_position[1] - creep_position[1])*(hero_position[1] - creep_position[1]))
                    if d < match["parameters"]["processCreepDeaths"]["experience_range"]:
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


def farmDistMetric(match,death1,death2):
    # calculate the distance between two creep deaths
    params = [0.002,0.04,0.5]
    r = math.sqrt((death1["position"][0] - death2["position"][0])*(death1["position"][0] - death2["position"][0]) + (death1["position"][1] - death2["position"][1]) * (death1["position"][1] - death2["position"][1]))
    t = (abs(death1["time"] - death2["time"])) 

    death1_heroes_involved = set([])
    death1_heroes_involved = death1_heroes_involved.union(death1["responsible_for"],death1["contested_by"])

    death2_heroes_involved = set([])
    death2_heroes_involved = death2_heroes_involved.union(death2["responsible_for"],death2["contested_by"])

    #if the two sets are equal
    if death1_heroes_involved.issubset(death2_heroes_involved) and death2_heroes_involved.issubset(death1_heroes_involved):
        #incentivise to bring points closer together
        v = -1
    else:
        v = 1

    return params[0]*r + params[1]*t + params[2]*v

def processFarming(match):
    #extract events where heroes are farming creeps
    match["farm_events"] = []
    A = formAdjacencyMatrix(match,match["creep_deaths"],farmDistMetric)
    n_components, labels = scipy.sparse.csgraph.connected_components(A, directed=False, return_labels=True)

    #for each connected component make a list of attacks
    for i in range(0,n_components):
        death_sequence = [j for j, k in enumerate(labels) if k == i ]
        heroes_involved = set([])
        time_start = match["creep_deaths"][death_sequence[0]]["time"]
        time_end = match["creep_deaths"][death_sequence[-1]]["time"]
        readable_time_start = readableTime(time_start) 
        readable_time_end = readableTime(time_end)
        death_positions = []
        death_list = []

        for death_index in death_sequence:
            death = match["creep_deaths"][death_index]
            death_positions.append(death["position"]) 
            creeps_killed = len(death_sequence)
            if death["killed_by"] in match["entities"]:
                if match["entities"][death["killed_by"]]["unit"] in match["heroes"]:
                    heroes_involved = heroes_involved.union([death["killed_by"]],death["responsible_for"],death["contested_by"])     
        
        if len(heroes_involved) != 0 and creeps_killed > 1:       
            farm_event = {
                "time-start": time_start,
                "time-end": time_end,
                "readable-time-start": readable_time_start,
                "readable-time-end": readable_time_end,
                "heroes_involved": heroes_involved,
                "creeps-killed": creeps_killed,
                "death-positions": death_positions,
                "component": i
            }
                       
            match["farm_events"].append(farm_event)

def processHeroAbility(match):
    # process the abilities used by heroes and store them in a list
    match["ability_events"] = []
    for row in match["raw"]["ability_events"]:
        hero = transformHeroName(row[2])
        if hero not in match["heroes"]:
            continue
        ability = row[4][len(hero) + 1:]
        ability_event = {
            "time": row[0],
            "hero": hero,
            "ability": ability,
            "position": lookupHeroPosition(match,hero,row[0])
        }
        match["ability_events"].append(ability_event)
        if ability not in match["entities"][match["heroes"][hero]["entity_id"]]["abilities"]:
            match["entities"][match["heroes"][hero]["entity_id"]]["abilities"].append(ability)

def processHeroHeals(match):
    # process instances when heroes heal other heroes
    match["hero_heals"] = []
    
    for row in match["raw"]["heal_events"]:
        healer = transformHeroName(row[2])
        healed = transformHeroName(row[4])
        if healer != healed:
            if row[3].startswith("item_"):
                heal_type = "item"
                method = row[3][5:]
            elif row[3].startswith(healer):
                heal_type = "ability"
                method = row[3][len(healer)+1:]
            else:
                heal_type = "empty"
                method = "empty"

            hero_heal_event = {
                "healer": healer,
                "healed": healed,
                "time": row[0],
                "hp_before": int(row[6]),
                "hp_after": int(row[7])
            }
            match["hero_heals"].append(hero_heal_event)

def processWards(match):
    #extract ward placements (time,hero,ward type and position)
    match["ward_events"] = []

    item_times = []
    for row in match["raw"]["item_events"]:
        item_times.append(row[0])
    
    for row in match["raw"]["spawn_rows"]:
        if row[2].startswith("npc_dota_ward"):
            time_index = findTimeTick(match,item_times,row[0])
            ward_type = match["raw"]["item_events"][time_index][3][10:]
            if ward_type == "observer" or ward_type == "sentry":
                hero = transformHeroName(match["raw"]["item_events"][time_index][2])
                ward_event = { 
                    "time": row[0],
                    "hero": hero,
                    "ward_type": ward_type,
                    "position": [row[4],row[5]]
                }
                match["ward_events"].append(ward_event)

def processItemUse(match):
    #extract events where heroes use items
    match["item_events"] = []
    for row in match["raw"]["item_events"]:
        item_event = {
            "time": row[0],
            "hero": transformHeroName(row[2]),
            "item": row[3][5:]
        }
        match["item_events"].append(item_event)


def processTPScrolls(match):
    #extract events where heroes use a tp scroll 
    match["tp_events"] = []

    for row in match["raw"]["item_events"]:
        if row[3] == "item_tpscroll":
            time = row[0]
            time_index_cast = findTimeTick(match,match["raw"]["trajectories"]["time"],time)
            time_index_end = findTimeTick(match,match["raw"]["trajectories"]["time"],time + 10)
            hero = transformHeroName(row[2])
            readable_time = readableTime(time)
            end_position = None
            for index in range(time_index_cast,time_index_end):
                # find squared distance between consecutive points 
                dist_squared = ((match["raw"]["trajectories"][hero]["position"][index][0] - match["raw"]["trajectories"][hero]["position"][index - 1][0]) * (match["raw"]["trajectories"][hero]["position"][index][0] - match["raw"]["trajectories"][hero]["position"][index - 1][0]) + (match["raw"]["trajectories"][hero]["position"][index][1] - match["raw"]["trajectories"][hero]["position"][index - 1][1]) * (match["raw"]["trajectories"][hero]["position"][index][1] - match["raw"]["trajectories"][hero]["position"][index - 1][1]) )
                if dist_squared > 10000:
                    end_position = match["raw"]["trajectories"][hero]["position"][index]
                    break
     
            tp_event = {
                "time": time,
                "readable-time": readable_time,
                "hero": hero,
                "start-position": match["raw"]["trajectories"][hero]["position"][time_index_cast],
                "end-position": end_position
            }
            match["tp_events"].append(tp_event)

def processPurchases(match):
    #extract events where heroes purchase an item
    match["purchase_events"] = []
    for row in match["raw"]["purchase_events"]:
        purchase_event = {
            "time": row[0],
            "hero": transformHeroName(row[2]),
            "item": row[3][5:]
        }
        match["purchase_events"].append(purchase_event)

def processCreepEquilibrium(match):
    # will define the rolling average position of creep deaths for a window of T seconds as the equlirium point for the lane
    n = 5
    match["creep_equilibrium"] = {"top": [], "mid": [], "bot": []}
    towers = {
        "rad_tower1_top":    [-6116.9688,  1805.9062],
        "rad_tower1_mid":    [-1657.625,   -1512.5],
        "rad_tower1_bot":    [4887.9375,   -6080.5938],

        "rad_tower2_top":    [-6164.9688,  -866.09375],
        "rad_tower2_mid":    [-3549.625,   -2785.5],
        "rad_tower2_bot":    [-106.09375,  -6234.0625],

        "rad_tower3_top":    [-6616.9688,  -3409.0938],
        "rad_tower3_mid":    [-4693.625, -4152.5],
        "rad_tower3_bot":    [-3953.0938, -6091.0625],

        "rad_tower4_top":    [-5738.625,   -4860.5],
        "rad_tower4_bot":    [-5389.625,   -5216.5],

        "dir_tower1_top":     [-4736,   6015.9688],
        "dir_tower1_mid":     [1023.96875,  319.96875],
        "dir_tower1_bot":     [6208, -1664.0312],

        "dir_tower2_top":     [0,   6015.9688],
        "dir_tower2_mid":     [2496,    2111.9688],
        "dir_tower2_bot":     [6272,    383.96875],
       

        "dir_tower3_top":     [3552,    5775.9688],
        "dir_tower3_mid":     [4272,    3758.9688],
        "dir_tower3_bot":     [6276,    3031.9688],

        "dir_tower4_top":     [4962,    4783.9688],
        "dir_tower4_bot":     [5280,    4431.9688]
    }

    top_x = []
    top_y = []
    mid_x = []
    mid_y = []
    bot_x = []
    bot_y = []

    last_creep_position = 0
    for creep_death in match["creep_deaths"]:
        nearest_tower = None
        min_dist = 10000
        for tower in towers:
            dist = math.sqrt( (towers[tower][0] - creep_death["position"][0]) * (towers[tower][0] - creep_death["position"][0]) + (towers[tower][1] - creep_death["position"][1]) * (towers[tower][1] - creep_death["position"][1]) )
            if dist < min_dist:
                nearest_tower = tower
                min_dist = dist
        lane = nearest_tower[11:]
        if lane == "top":
            top_x.append(creep_death["position"][0])
            top_y.append(creep_death["position"][1])
        elif lane == "mid":
            mid_x.append(creep_death["position"][0])
            mid_y.append(creep_death["position"][1])
        elif lane == "bot":
            bot_x.append(creep_death["position"][0])
            bot_y.append(creep_death["position"][1])

    mean_top_x = np.convolve(top_x, np.ones((n,))/n, mode='valid')
    mean_top_y = np.convolve(top_y, np.ones((n,))/n, mode='valid')

    mean_mid_x = np.convolve(mid_x, np.ones((n,))/n, mode='valid')
    mean_mid_y = np.convolve(mid_y, np.ones((n,))/n, mode='valid')

    mean_bot_x = np.convolve(bot_x, np.ones((n,))/n, mode='valid')
    mean_bot_y = np.convolve(bot_y, np.ones((n,))/n, mode='valid')

    for i in range(len(mean_top_x)):
        match["creep_equilibrium"]["top"].append([mean_top_x[i],mean_top_y[i]])

    for i in range(len(mean_mid_x)):
        match["creep_equilibrium"]["mid"].append([mean_mid_x[i],mean_mid_y[i]])

    for i in range(len(mean_bot_x)):
        match["creep_equilibrium"]["bot"].append([mean_bot_x[i],mean_bot_y[i]])

def processRoshanAttacks(match):
    # extract attacks involving heroes and roshan
    match["roshan_attack_list"] = []
    for row in match["raw"]["damage_events"]:
        attacker = row[2]
        victim = row[3]
        # filter out attacks involving enties other than heroes
        if attacker.startswith("npc_dota_hero_") and victim == "npc_dota_roshan": 
            attacker = transformHeroName(attacker)
            victim = "roshan"
            #filter out illusions 
            if attacker not in match["heroes"]:
                continue
            side = match["heroes"][attacker]["side"]
            # set position to be the position of the attacker - this is not ideal as convention in processHeroAttacks is to use the victim location
            position = match["raw"]["trajectories"][attacker]["position"][findTimeTick(match,match["raw"]["trajectories"]["time"],row[0])]
        elif attacker == "npc_dota_roshan" and victim.startswith("npc_dota_hero_"):
            attacker = "roshan"
            victim = transformHeroName(victim)
            if victim not in match["heroes"]:
                continue
            side = "neutral"
            position = match["raw"]["trajectories"][victim]["position"][findTimeTick(match,match["raw"]["trajectories"]["time"],row[0])]
        else:
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
                "side": side,
                "victim": victim,
                "damage": int(row[5]),
                "health_delta": row[6],
                "time": row[0],
                "attack_method": attack_method,
                "position": position
                }
        match["roshan_attack_list"].append(attack)

def processMovement(match):
    #for each hero trajectory segement the trajectory into moving and stationary
    #match["entities"][match["heroes"][hero]["entity_id"]]["position"][i]:
    step = 50
    w0 = 0.01 # x of the order [-8000,8000]
    w1 = 0.01 # y of th order [-8000,8000]
    w2 = 1 # of the order [0,2400]
    w3 = 100 
    N = len(match["raw"]["trajectories"]["time"])
    index_list = [x for x in range(0,N,step)]
    hero_paths = {}
    hero_summary = {}
    hero_state_indicators = {}
    #create indicator for whether hero was in a fight
    for hero in match["heroes"]:
        hero_state_indicators[hero] = np.zeros((N,1))
        hero_summary[hero] = []

    for farm_event in match["farm_events"]:
        time_start_index = findTimeTick(match,match["raw"]["trajectories"]["time"],farm_event["time-start"])
        time_end_index = findTimeTick(match,match["raw"]["trajectories"]["time"],farm_event["time-end"])
        for hero_entity_id in farm_event["heroes_involved"]:
            hero_state_indicators[match["entities"][hero_entity_id]["unit"]][time_start_index:time_end_index] = -1

    for fight in match["fight_list"]:
        time_start_index = findTimeTick(match,match["raw"]["trajectories"]["time"],fight["time_start"])
        time_end_index = findTimeTick(match,match["raw"]["trajectories"]["time"],fight["time_end"])
        for hero_entity_id in fight["heroes_involved"]:
            hero_state_indicators[match["entities"][hero_entity_id]["unit"]][time_start_index:time_end_index] = 1

    for hero in match["heroes"]:
        #load the trajectory data into a numpy array
        hero_trajectory = np.zeros((len(index_list),5))
        for i,j in enumerate(index_list):
            hero_trajectory[i,0] = w0 * match["raw"]["trajectories"][hero]["position"][j][0]
            hero_trajectory[i,1] = w1 * match["raw"]["trajectories"][hero]["position"][j][1]
            hero_trajectory[i,2] = w2 * match["raw"]["trajectories"]["time"][j]
            hero_trajectory[i,3] = w3 * hero_state_indicators[hero][j]       
        hero_paths[hero] = rdp(hero_trajectory,10,dist_nD)

    for hero in match["heroes"]:
        for point in hero_paths[hero]:
            if point[3] == 100:
                action_type = "fight"
            elif point[3] == -100:
                action_type = "farm"
            else:
                action_type = "move"
            hero_summary[hero].append([point[2],action_type,assignPlayerArea(match,point[0]/w0,point[1]/w1)])

    match["hero_summary"] = hero_summary
    match["hero_paths"] = hero_paths

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
                "average_camera_distance": 0,
                "distance_std_dev": 0,
                "percentMove": 0,

                #fighting
                "num-of-kills": 0,
                "num-of-deaths": 0,
                "solo-kills": 0,
                "solo-deaths": 0,
                "team-kills": 0,
                "team-deaths": 0,
                "num-of-fights": 0,
                "total-right-click-damage": 0,
                "total-spell-damage": 0,
                "fight-right-click-damage": 0,
                "fight-spell-damage": 0,
                "initiation_score": 0,
                "average-fight-movement-speed": 0,
                "fight-coordination": 0,
                "average-fight-centroid-dist": 0,
                "average-fight-centroid-dist-team": 0,
                "team_heal_amount": 0,
                "lane-harassment-damage": 0,

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
                "total-distance-traveled": 0,
                "total-time-alive": 0,
                "average-distance-from-centroid": 0,
                "num-of-rotations": 0,
                "num-of-rotations-first10": 0,
                "percentage-moving": 0,
                "percentage-stationary": 0,
                "percentage-stationary-farming": 0,
                "percentage-stationary-fighting": 0,

                #Miscellaneous
                "tower-damage": 0,
                "rax-damage": 0,
                "roshan-damage": 0, 
                "num-sentry-wards-placed": 0,
                "num-observer-wards-placed": 0,
                "abilities": {},

                #itemization
                "items-purchased": {},
                "items-used": {},
                "num-of-tp-used": 0,
                "total-tp-distance": 0,
                "num-tp-bought": 0

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

        for i in range(len(match["raw"]["trajectories"][hero]["position"])):
            time = match["raw"]["trajectories"]["time"][i]
            pos = match["raw"]["trajectories"][hero]["position"][i]
            cam = match["raw"]["trajectories"][hero]["camera"][i]
            relative = [pos[0] - cam[0], pos[1] - cam[1]]
            distance = math.sqrt(relative[0]*relative[0] + relative[1]*relative[1])

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
            delta_length = math.sqrt(camera_delta[0]*camera_delta[0] + camera_delta[1]*camera_delta[1])        
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
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["average_camera_distance"] = average_hero_distance
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["distance_std_dev"] = math.sqrt(average_hero_distance_M2/average_hero_distance_n)
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["num-camera-jumps"] = len(jumps)
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["percentMove"] = time_moving/time_total
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["percentSelf"] = time_self/time_total
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["percentFar"] = time_far/time_total

def evaluateHeroDeaths(match):
    # evaluate the number of kills and deaths of each player (note that the killer might be a tower)
    for death in match["hero_deaths"]:
        # have to split killer name to handle kills by illusions
        killer = death["killer"].split()[0]
        if killer in match["heroes"] and match["heroes"][killer]["side"] != match["heroes"][death["deceased"]]["side"]:
            match["stats"]["player-stats"][match["heroes"][killer]["player_index"]]["num-of-kills"] += 1
        if death["deceased"]in match["heroes"]:
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
            if attack["attacker"] in match["heroes"]:
                player_index = match["heroes"][attack["attacker"]]["player_index"]
                if attack["attack_method"] == "melee":
                    match["stats"]["player-stats"][player_index]["fight-right-click-damage"] += attack["damage"]
                else:
                    match["stats"]["player-stats"][player_index]["fight-spell-damage"] += attack["damage"]

def evaluateHeroDamage(match):
    # evaluate the total amount of melee and spell based damage done by each hero over the entire attack list - so including harassment
    for attack in match["attack_list"]:
        if attack["attacker"] in match["heroes"]:
            player_index = match["heroes"][attack["attacker"]]["player_index"]
            if attack["attack_method"] == "melee":
                match["stats"]["player-stats"][player_index]["total-right-click-damage"] += attack["damage"]
            else:
                match["stats"]["player-stats"][player_index]["total-right-click-damage"] += attack["damage"]

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

def evaluateFightCoordination(match):
    #set bin size (seconds) for fight timeline
    n_steps = int(math.floor(1/match["parameters"]["evaluatefightCoordination"]["time_delta"]))

    for fight in match["fight_list"]:
        if len(fight["heroes_involved"]) > 2:
            fight_length = fight["time_end"] - fight["time_start"]
            n = math.floor(fight_length/match["parameters"]["evaluatefightCoordination"]["time_delta"]) + n_steps
            radiant_involved = [x for x in fight["heroes_involved"] if match["entities"][x]["side"] == "radiant"]
            dire_involved = [x for x in fight["heroes_involved"] if match["entities"][x]["side"] == "dire"]
            R = np.zeros((len(radiant_involved),n*len(dire_involved)))
            S = np.zeros((len(dire_involved),n*len(radiant_involved)))
            p = np.zeros(n*len(dire_involved))
            q = np.zeros(n*len(radiant_involved))
            #loop over all attacks in fight assigning them to correct signal
            for attack_index in fight["attack_sequence"]:
                attack = match["attack_list"][attack_index]
                if attack["attacker"] in match["heroes"] and attack["victim"] in match["heroes"]:
                    attacker_id = match["heroes"][attack["attacker"]]["entity_id"]
                    victim_id = match["heroes"][attack["victim"]]["entity_id"]
                    start_index = math.floor((attack["time"] - fight["time_start"])/match["parameters"]["evaluatefightCoordination"]["time_delta"])
                    if match["entities"][attacker_id]["side"] != match["entities"][victim_id]["side"]:
                        if match["entities"][attacker_id]["side"] == "radiant":
                            i = radiant_involved.index(attacker_id)
                            j = dire_involved.index(victim_id)
                            for k in range(0,n_steps):
                                R[i,j*n + start_index + k] = attack["damage"]*math.exp(-k * match["parameters"]["evaluatefightCoordination"]["time_delta"] * match["parameters"]["evaluatefightCoordination"]["decay_rate"]) 
                        elif match["entities"][attacker_id]["side"] == "dire":
                            i = dire_involved.index(attacker_id)
                            j = radiant_involved.index(victim_id)
                            for k in range(0,n_steps):
                                S[i,j*n + start_index + k] = attack["damage"]*math.exp(-k * match["parameters"]["evaluatefightCoordination"]["time_delta"] * match["parameters"]["evaluatefightCoordination"]["decay_rate"]) 
                            
            for i in range(len(radiant_involved)):
                for j in range(len(dire_involved)):
                    R[i,j*n:(j+1)*n] = normalize(R[i,j*n:(j+1)*n])
                    p[j*n:(j+1)*n] = p[j*n:(j+1)*n] + R[i,j*n:(j+1)*n]
            for i in range(len(dire_involved)):
                for j in range(len(radiant_involved)):
                    S[i,j*n:(j+1)*n] = normalize(S[i,j*n:(j+1)*n])
                    q[j*n:(j+1)*n] = q[j*n:(j+1)*n] + S[i,j*n:(j+1)*n]             
            v = np.dot(R,p)
            for i in range(0,len(radiant_involved)):
                match["stats"]["player-stats"][match["entities"][radiant_involved[i]]["control"]]["fight-coordination"] += v[i]
            w = np.dot(S,q)
            for i in range(0,len(dire_involved)):
                match["stats"]["player-stats"][match["entities"][dire_involved[i]]["control"]]["fight-coordination"] += w[i]

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
        if total_fight_time[player_id] != 0:
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
        creep_type = creep_death["creep_type"].split("_")
        creep_type = creep_type[3]
        if creep_death["death_type"] == "last-hit":
            creeps_lasthit += 1
            match["stats"]["player-stats"][match["entities"][creep_death["killed_by"]]["control"]]["num-creeps-last-hit"] += 1
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

def evaluateBuildingDamage(match):
    # for each hero evaluate the amount of damage they do to enemy towers and rax
    for row in match["raw"]["damage_events"]:
        attacker = transformHeroName(row[2])
        victim = transformHeroName(row[3]) 
        if attacker in match["heroes"] and "tower" in victim:
            match["stats"]["player-stats"][match["heroes"][attacker]["player_index"]]["tower-damage"] += int(row[5])
        elif attacker in match["heroes"] and "rax" in victim:
            match["stats"]["player-stats"][match["heroes"][attacker]["player_index"]]["rax-damage"] += int(row[5])

def evaluateFightCentroid(match):

    hero_centroid_dist = {}
    for hero in match["heroes"]:
        hero_centroid_dist[hero] = {"dist": 0, "n": 0, "team-dist": 0} 

    #for each fight in the match
    for fight in match["fight_list"]:
        time_start_index = findTimeTick(match,match["raw"]["trajectories"]["time"],max(fight["time_start"],match["raw"]["trajectories"]["time"][0]))
        time_end_index = findTimeTick(match,match["raw"]["trajectories"]["time"],min(fight["time_end"],match["raw"]["trajectories"]["time"][-1]))
        # for each time tick between the start and end time indexes
        for index in range(time_start_index,time_end_index):
            #for each hero involved in the the fight
            num_heroes_alive = 0
            num_radiant_heroes_alive = 0
            num_dire_heroes_alive = 0

            centroid = [0,0]
            radiant_centroid = [0,0]
            dire_centroid = [0,0]

            alive_heroes = [x for x in fight["heroes_involved"] if match["hero_alive_status"][match["entities"][x]["unit"]][index] == 1]
            for hero_entity_id in alive_heroes:
                hero_position = match["raw"]["trajectories"][match["entities"][hero_entity_id]["unit"]]["position"][index]
                centroid[0] += hero_position[0]
                centroid[1] += hero_position[1]
                num_heroes_alive += 1
                if match["entities"][hero_entity_id]["side"] == "radiant":
                    radiant_centroid[0] += hero_position[0]
                    radiant_centroid[1] += hero_position[1]
                    num_radiant_heroes_alive +=1
                elif match["entities"][hero_entity_id]["side"] == "dire":
                    dire_centroid[0] += hero_position[0]
                    dire_centroid[1] += hero_position[1]
                    num_dire_heroes_alive +=1
            #find the average location of the alive heroes in the fight
            centroid[0] = centroid[0]/num_heroes_alive
            centroid[1] = centroid[1]/num_heroes_alive

            if num_radiant_heroes_alive != 0:
                radiant_centroid[0] = radiant_centroid[0]/num_radiant_heroes_alive
                radiant_centroid[1] = radiant_centroid[1]/num_radiant_heroes_alive

            if num_dire_heroes_alive != 0:
                dire_centroid[0] = dire_centroid[0]/num_dire_heroes_alive
                dire_centroid[1] = dire_centroid[1]/num_dire_heroes_alive
            #find the distance each hero is from this timestep's centroid 
            for hero_entity_id in alive_heroes:
                hero_position = match["raw"]["trajectories"][match["entities"][hero_entity_id]["unit"]]["position"][index]
                hero_centroid_dist[match["entities"][hero_entity_id]["unit"]]["dist"] += math.sqrt( (centroid[0] - hero_position[0]) * (centroid[0] - hero_position[0]) + (centroid[1] - hero_position[1]) * (centroid[1] - hero_position[1]) )
                if match["entities"][hero_entity_id]["side"] == "radiant":
                    hero_centroid_dist[match["entities"][hero_entity_id]["unit"]]["team-dist"] += math.sqrt( (radiant_centroid[0] - hero_position[0]) * (radiant_centroid[0] - hero_position[0]) + (radiant_centroid[1] - hero_position[1]) * (radiant_centroid[1] - hero_position[1]) )
                elif match["entities"][hero_entity_id]["side"] == "dire":
                    hero_centroid_dist[match["entities"][hero_entity_id]["unit"]]["team-dist"] += math.sqrt( (dire_centroid[0] - hero_position[0]) * (dire_centroid[0] - hero_position[0]) + (dire_centroid[1] - hero_position[1]) * (dire_centroid[1] - hero_position[1]) )
                #increment the number of time steps that hero has been alive during a fight               
                hero_centroid_dist[match["entities"][hero_entity_id]["unit"]]["n"] += 1

    for hero in match["heroes"]:
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["average-fight-centroid-dist"] = hero_centroid_dist[hero]["dist"]/hero_centroid_dist[hero]["n"]
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["average-fight-centroid-dist-team"] = hero_centroid_dist[hero]["team-dist"]/hero_centroid_dist[hero]["n"]


def evaluateHeroHeals(match):
    #evaluate the amount of hp each hero heals their teammates
    for hero_heal_event in match["hero_heals"]:
        if hero_heal_event["healer"] in match["heroes"]:
            match["stats"]["player-stats"][match["heroes"][hero_heal_event["healer"]]["player_index"]]["team_heal_amount"] += (hero_heal_event["hp_after"] - hero_heal_event["hp_before"])

def evaluateHeroAbilities(match):
    # evaluate how each player uses their hero abilities
    for hero in match["heroes"]:
        for ability in match["entities"][match["heroes"][hero]["entity_id"]]["abilities"]:
            match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["abilities"][ability] = 0

    for ability_event in match["ability_events"]:
        match["stats"]["player-stats"][match["heroes"][ability_event["hero"]]["player_index"]]["abilities"][ability_event["ability"]] += 1

def evaluateWardUse(match):
    # evaluate how many wards each player places during the match
    for ward_event in match["ward_events"]:
        if ward_event["ward_type"] == "observer":
            match["stats"]["player-stats"][match["heroes"][ward_event["hero"]]["player_index"]]["num-observer-wards-placed"] += 1
        elif ward_event["ward_type"] == "sentry":
            match["stats"]["player-stats"][match["heroes"][ward_event["hero"]]["player_index"]]["num-sentry-wards-placed"] += 1

def evaluateTPScrollUse(match):
    # evaluate the number of tp scrolls each hero buys, uses and the total distance travelled using them
    for purchase_event in match["purchase_events"]:
        if purchase_event["item"] == "tpscroll":
            match["stats"]["player-stats"][match["heroes"][purchase_event["hero"]]["player_index"]]["num-tp-bought"] += 1

    for tp_event in match["tp_events"]:
        match["stats"]["player-stats"][match["heroes"][tp_event["hero"]]["player_index"]]["num-of-tp-used"] += 1
        if tp_event["end-position"] != None:
            match["stats"]["player-stats"][match["heroes"][tp_event["hero"]]["player_index"]]["total-tp-distance"] += math.sqrt( (tp_event["start-position"][0] - tp_event["end-position"][0]) * (tp_event["start-position"][0] - tp_event["end-position"][0]) + (tp_event["start-position"][1] - tp_event["end-position"][1]) * (tp_event["start-position"][1] - tp_event["end-position"][1]) )

def evaluateDistanceTraveled(match):
    for hero in match["heroes"]:
        total_distance_traveled = 0
        total_time_alive = 0
        average_position = [0,0]
        n = 0
        for trajectory in match["entities"][match["heroes"][hero]["entity_id"]]["position"]:
            last_position = trajectory["timeseries"]["samples"][0]["v"]
            total_time_alive += trajectory["time-end"] - trajectory["time-start"]
            for i in range(1,len(trajectory["timeseries"]["samples"])):
                total_distance_traveled += math.sqrt((trajectory["timeseries"]["samples"][i]["v"][0] - last_position[0])*(trajectory["timeseries"]["samples"][i]["v"][0] - last_position[0]) + (trajectory["timeseries"]["samples"][i]["v"][1] - last_position[1])*(trajectory["timeseries"]["samples"][i]["v"][1] - last_position[1]) )   
                average_position[0] += trajectory["timeseries"]["samples"][i]["v"][0]
                average_position[1] += trajectory["timeseries"]["samples"][i]["v"][1]
                last_position[0] = trajectory["timeseries"]["samples"][i]["v"][0]
                last_position[1] = trajectory["timeseries"]["samples"][i]["v"][1]
                n += 1

        average_position[0] = average_position[0]/n
        average_position[1] = average_position[1]/n
        average_distance_from_centroid = 0
        for trajectory in match["entities"][match["heroes"][hero]["entity_id"]]["position"]:
            for i in range(1,len(trajectory["timeseries"]["samples"])):
                average_distance_from_centroid += math.sqrt((average_position[0] - trajectory["timeseries"]["samples"][i]["v"][0]) * (average_position[0] - trajectory["timeseries"]["samples"][i]["v"][0]) + (average_position[1] - trajectory["timeseries"]["samples"][i]["v"][1]) * (average_position[1] - trajectory["timeseries"]["samples"][i]["v"][1]))/n

        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["total-distance-traveled"] = total_distance_traveled
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["total-time-alive"] = total_time_alive
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["average-distance-from-centroid"] = average_distance_from_centroid
 
def evaluateRoshanDamage(match):
    # evaluate the amount of damage each hero does to roshan during the match
    for damage_event in match["roshan_attack_list"]:
        if damage_event["attacker"] in match["heroes"]:
            match["stats"]["player-stats"][match["heroes"][damage_event["attacker"]]["player_index"]]["roshan-damage"] += damage_event["damage"]

def evaluateItemPurchases(match):
    #for each hero form a dictionary with "item":"time" key-value pairs, takings the first instance of purchasing a particular item only
    for purchase_event in match["purchase_events"]:
        if purchase_event["item"] not in match["stats"]["player-stats"][match["heroes"][purchase_event["hero"]]["player_index"]]["items-purchased"]:
            match["stats"]["player-stats"][match["heroes"][purchase_event["hero"]]["player_index"]]["items-purchased"][purchase_event["item"]] = purchase_event["time"]

def evaluateItemUses(match):
    #for each hero form a dictionary with "item":"time" key-value pairs, takings the first instance of using a particular item only
    for item_event in match["item_events"]:
        if item_event["item"] not in match["stats"]["player-stats"][match["heroes"][item_event["hero"]]["player_index"]]["items-used"]:
            match["stats"]["player-stats"][match["heroes"][item_event["hero"]]["player_index"]]["items-used"][item_event["item"]] = item_event["time"]

def evaluateHeroMovementTimes(match):
    #for each hero look at the sequence of points in their hero_path and add up time spent moving, fighting and farming
    for hero in match["heroes"]:
        total_time = match["hero_paths"][hero][-1,2] - match["hero_paths"][hero][0,2]
        for i in range(0,len(match["hero_paths"][hero])-1):
            if match["hero_paths"][hero][i,3] == 100:
                match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["percentage-stationary-fighting"] += match["hero_paths"][hero][i+1,2] - match["hero_paths"][hero][i,2]
            elif match["hero_paths"][hero][i,3] == -100:
                match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["percentage-stationary-farming"] += match["hero_paths"][hero][i+1,2] - match["hero_paths"][hero][i,2]
            else:
                match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["percentage-moving"] += match["hero_paths"][hero][i+1,2] - match["hero_paths"][hero][i,2]

        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["percentage-stationary-fighting"] = 100*match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["percentage-stationary-fighting"]/total_time
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["percentage-stationary-farming"] = 100*match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["percentage-stationary-farming"]/total_time
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["percentage-moving"] = 100 * match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["percentage-moving"]/total_time
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["percentage-stationary"] = 100 - match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["percentage-moving"]

def plotHeroPath(match,hero,start_index,stop_index):

    w0 = 0.01
    w1 = 0.01
    fig = plt.figure()
    ax = fig.add_subplot(111)
    ax.plot(match["hero_paths"][hero][a:b,0]/w0,hero_paths[hero][start_index:stop_index,1]/w0)
    for i in range(start_index,stop_index):
        if hero_paths[hero][i,3] == 100:
            ax.annotate(str(math.floor(paths[hero][i,2])) + " Fight" ,(hero_paths[hero][i,0]/w0,hero_paths[hero][i,1]/w1))
        elif hero_paths[hero][i,3] == -100:
            ax.annotate(str(math.floor(hero_paths[hero][i,2])) + " Farm" ,(hero_paths[hero][i,0]/w0,hero_paths[hero][i,1]/w1))
        else:
            ax.annotate(str(math.floor(hero_paths[hero][i,2])) + " Move" ,(hero_paths[hero][i,0]/w0,hero_paths[hero][i,1]/w1))
    plt.show()

def evaluateRotations(match):
    #count the number of rotations each hero makes during a match
    for hero in match["heroes"]:
        previous_lane = None
        lane_sequence_10_mins = []
        lane_sequence = []
        for point in match["hero_summary"][hero]:
            if point[2].startswith("top lane"):
                current_lane = "top"
            elif point[2].startswith("mid lane"):
                current_lane = "mid"
            elif point[2].startswith("bot lane"):
                current_lane = "bot"
            elif point[2].startswith("radiant jungle"):
                current_lane = "radiant jungle"
            elif point[2].startswith("dire jungle"):
                current_lane = "dire jungle"
            else:
                continue
            if current_lane != previous_lane:
                lane_sequence.append(current_lane)
                if point[0] <= 600:
                    lane_sequence_10_mins.append(current_lane)
                previous_lane = current_lane

        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["num-of-rotations"] = len(lane_sequence) - 1
        match["stats"]["player-stats"][match["heroes"][hero]["player_index"]]["num-of-rotations-first10"] = len(lane_sequence_10_mins) - 1
        
def makeResults(match):
    # sample the data and place into the match["results"]
    match["results"] = {}
    match["results"]["header"] = match["header"]
    match["results"]["events"] = {}

    iterateEventList(match,match["hero_deaths"],"kill",match["parameters"]["namespace"]["kills_namespace"])
    iterateEventList(match,match["creep_spawns"],"creep_spawn",match["parameters"]["namespace"]["creep_spawn_namespace"])
    iterateEventList(match,match["creep_deaths"],"creep_death",match["parameters"]["namespace"]["creep_death_namespace"])
    iterateEventList(match,match["fight_list"],"fight",match["parameters"]["namespace"]["fights_namespace"])
    iterateEventList(match,match["building_deaths"],"building_death",match["parameters"]["namespace"]["buildings_namespace"])

    # sample the timeseries by deleting points
    for entity in match["entities"]:
        for i in range(0,len(match["entities"][entity]["position"])):
            sampleTimeseries(match["entities"][entity]["position"][i]["timeseries"]["samples"],match["parameters"]["makeResults"]["sample_rate_position"])
    match["results"]["entities"] = match["entities"]

    #sample the gold and exp timeseries
    sampleTimeseries(match["timeseries"]["gold-advantage"]["samples"],match["parameters"]["makeResults"]["sample_rate_gold_exp"])
    sampleTimeseries(match["timeseries"]["exp-advantage"]["samples"],match["parameters"]["makeResults"]["sample_rate_gold_exp"])
    match["results"]["timeseries"] = match["timeseries"]

def iterateEventList(match,array,event_type,namespace):
    for i, item in enumerate(array):
        item["type"] = event_type
        match["results"]["events"][namespace + i] = item

def sampleTimeseries(timeseries,sample_rate):
    #function for sampling a timeseries at a specified sample rate
    previous_time = timeseries[0]["t"]
    sample_period = 1/sample_rate
    j = 0
    while j < len(timeseries):
        if timeseries[j]["t"] - previous_time < sample_period:
            del timeseries[j]
        else:
            previous_time = timeseries[j]["t"]
            j += 1

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
    evaluateFightCentroid(match)

def evaluateFarming(match):
    # evaluate different skills for the Farming attribute
    evaluateLastHits(match)
    evaluateHeroGoldExp(match)

def evaluateMovement(match):
    # evaluate different skills for the Movement attribute
    evaluateVisibility(match)
    evaluateDistanceTraveled(match)
    evaluateHeroMovementTimes(match)
    evaluateRotations(match)

def evaluateObjectives(match):
    # evaluate the features for the Objectives attribute
    evaluateBuildingDamage(match)

def writeToJson(filename,dictionary):
    # given a filename and a dictionary write the dictionary to a JSON file named filename.json
    my_file = open(filename,'wb')
    my_file.write(json.dumps(dictionary, sort_keys=True,indent=4, separators=(',', ': ')))    
    my_file.close()

def process(match):
    # extract information from the raw data, create events/entities that we recognise in the game 
    makeUnits(match)
    makeAreaMatrix(match)
    processHeroVisibility(match)
    processHeroDeaths(match)
    processHeroPosition(match)
    processGoldXP(match)
    processCameraControl(match)
    processHeroAttacks(match)
    processFights(match)
    processCreepSpawns(match)
    processCreepDeaths(match)
    processHeroAbility(match)
    processHeroHeals(match)
    processWards(match)
    processBuildingDeaths(match)
    processCreepEquilibrium(match)
    processTPScrolls(match)
    processPurchases(match)
    processRoshanAttacks(match)
    processItemUse(match)
    processFarming(match)
    processMovement(match)

def computeStats(match):
    # compute the statistics that will be used as features in the machine learning model
    makeStats(match)
    evaluateHeroDeaths(match)
    evaluateHeroHeals(match)
    evaluateHeroAbilities(match)
    evaluateWardUse(match)
    evaluateTPScrollUse(match)
    evaluateRoshanDamage(match)
    evaluateItemPurchases(match)
    evaluateItemUses(match)

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