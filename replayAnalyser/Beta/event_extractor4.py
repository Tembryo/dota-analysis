import csv
import json
import math
import re
import numpy as np
import scipy.sparse 
import sys
import logging
from mpl_toolkits.mplot3d import Axes3D
import matplotlib.pyplot as plt
from dota2_area_boxes_ver2 import area_matrix, areas
import datetime
import shutil
import cProfile

events = {}


def transformHeroName(name):
    hero_name_list = name.split("_")
    hero_name_list = hero_name_list[3:] # remove the unnecessary dota_npc_hero part
    return "_".join(hero_name_list) # join the strings back together

class Match:

    def __init__(self,match_id, match_directory):
        # files where the replay data is stored
        self.match_id = match_id
        self.header_input_filename = match_directory+"/header.csv"
        self.position_input_filename = match_directory+"/trajectories.csv"
        self.events_input_filename = match_directory+"/events.csv"
        self.entitied_input_filename = match_directory+"/ents.csv"
        # variables that determine how the data is analysed - need to include all parameters
        self.parameters = {}
        self.parameters["version"] = "0.0.05"
        self.parameters["datetime"] = {}
        self.parameters["datetime"]["date"] = str(datetime.date.today())
        self.parameters["datetime"]["time"] = str(datetime.datetime.now().time())
        self.parameters["namespace"] = {}
        self.parameters["namespace"]["hero_namespace"] = 100
        self.parameters["namespace"]["kills_namespace"] = 10000
        self.parameters["namespace"]["normal_namespace"] = 11000
        self.parameters["namespace"]["fights_namespace"] = 15000
        self.parameters["namespace"]["creeps_namespace"] = 20000
        self.parameters["namespace"]["camera_namespace"] = 30000
        self.nCreeps = 0
        self.parameters["general"] = {}
        self.parameters["general"]["num_players"] = 10
        self.parameters["map"] = {}
        self.parameters["map"]["xmin"] = -8200
        self.parameters["map"]["xmax"] = 8000
        self.parameters["map"]["ymin"] = -8200
        self.parameters["map"]["ymax"] = 8000
        self.parameters["map"]["num_box"] = 32
        self.parameters["pregame_time_shift"] = 60
        # function specific parameters

        self.parameters["heroPositions"] = {}
        self.parameters["heroPositions"]["sample_step_size"] = 150

        self.parameters["heroTrajectories"] = {}
        self.parameters["heroTrajectories"]["delta"] = 1000
        self.parameters["heroTrajectories"]["min_timespan"] = 3

        self.parameters["goldXPInfo"] = {}
        self.parameters["goldXPInfo"]["bin_size"] = 2

        self.parameters["makeAttackList"] = {}
        self.parameters["makeAttackList"]["bin_size"] = 1 

        self.parameters["graphAttacks"] = {}
        self.parameters["graphAttacks"]["damage_threshold"] = 50

        self.parameters["formAdjacencyMatrix"] = {}
        self.parameters["formAdjacencyMatrix"]["distance_threshold"] = 300
        self.parameters["formAdjacencyMatrix"]["radius"] = 1500
        self.parameters["formAdjacencyMatrix"]["w_space1"] = 0.02
        self.parameters["formAdjacencyMatrix"]["w_space2"] = 0.3
        self.parameters["formAdjacencyMatrix"]["w_time"] = 80

        self.parameters["initiationDamage"] = {}
        self.parameters["initiationDamage"]["initiation_window"] = 1 #time window in seconds that we consider to be when initiating

        self.parameters["fightEvaluation"] = {}
        self.parameters["fightEvaluation"]["alpha"] = 150
        self.parameters["fightEvaluation"]["kappa"] = 0.15
        self.parameters["fightEvaluation"]["time_threshold"] = 2

    def matchInfo(self):

        # extract the match and player info (id,team names,player names,hero names,match start and end times) from the header and events files

        teams = {0:{"side":"radiant","name":"empty","short":"empty"},1:{"side":"dire","name":"empty","short":"empty"}}
        players = {}
        heroes = {}

        f = open(self.header_input_filename,'rb')
        header_reader = csv.reader(f)

        self.player_id_by_handle = {}
        for i, row in enumerate(header_reader):
            if row[0].upper() == "TEAM_TAG_RADIANT":
                if row[1] == " ":
                    teams[0]["name"] = "empty"
                else:            
                    teams[0]["name"] = row[1]
            if row[0].upper() == "TEAM_TAG_DIRE":
                if row[1] == " ":
                    teams[1]["name"] = "empty"
                else:            
                    teams[1]["name"] = row[1]
            if row[0].upper() == "PLAYER":
                # extract the player's name
                players[int(row[1])] = {}        
                player_name_string = row[2]
                player_name_list = player_name_string.split( )
                s = ""
                player_name = s.join(player_name_list)
                players[int(row[1])]["name"] = player_name
                players[int(row[1])]["steam_id"] = int(row[3])
                # form the heroes dictionary
                hero_name = transformHeroName(row[4])
                players[int(row[1])]["hero"] = hero_name
                heroes[hero_name] = {}
                heroes[hero_name]["index"] = int(row[1])
                heroes[hero_name]["hero_id"] = self.parameters["namespace"]["hero_namespace"] + int(row[1])
                if int(row[5]) == 2:
                    heroes[hero_name]["side"] = "radiant"
                elif int(row[5]) == 3:
                    heroes[hero_name]["side"] = "dire"

        f.close()

        f = open(self.events_input_filename,'rb')

        pregame_flag = 0
        self.events = []
        self.goldexp_events = []
        self.damage_events = []
        for i, row in enumerate(f):
            row = row.strip().split(",")
            self.events.append(row)
            if i == 0:
                first_timestamp = math.floor(float(row[0]))
            elif row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "5":
                match_start_time = math.floor(float(row[0]))
            elif row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "4":
                pregame_start_time = math.floor(float(row[0]))
                pregame_flag = 1
            elif row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "6":
                match_end_time  = math.floor(float(row[0]))
                #extract the events required for our analysis and store as a element in the array match.goldexp_events
            elif row[1] == "DOTA_COMBATLOG_GOLD" or row[1] == "DOTA_COMBATLOG_XP" or row[1] == "OVERHEAD_ALERT_GOLD" or row[1] == "OVERHEAD_ALERT_DENY":
                self.goldexp_events.append(row)
            elif row[1] == "PLAYER_ENT":
                self.player_id_by_handle[row[3]] = row[2]
            elif row[1]=="DOTA_COMBATLOG_DAMAGE" and row[2]!="null":
                self.damage_events.append(row)

        f.close()

        self.spawn_rows = []
        self.death_rows = []
        self.unit_selection_rows = []
        self.visibility_rows = []
        self.creep_positions = {}
        with open(self.entitied_input_filename, 'rb') as csvfile:
            entity_reader = csv.reader(csvfile)
            for i, row in enumerate(entity_reader):
                if row[1]=="DEATH":
                    self.death_rows.append(row)
                elif row[1]=="SPAWN":
                    self.spawn_rows.append(row)
                elif row[1]=="PLAYER_CHANGE_SELECTION":
                    self.unit_selection_rows.append(row)
                elif row[1]=="HERO_VISIBILITY":
                    self.visibility_rows.append(row)

        # if there was no GAME_STATE = 4 event set the pregame start time to be 60 seconds before the match start time    
        # or the earliest time we have available in the file    
        if pregame_flag != 1:
            logging.info('No DOTA_COMBATLOG_GAME_STATE == 4 transition in this events file')
            pregame_start_time = max(match_start_time - self.parameters["pregame_time_shift"],first_timestamp)

        
        self.teams = teams
        self.players = players
        self.heroes = heroes
        self.pregame_start_time = pregame_start_time
        self.match_start_time = match_start_time
        self.match_end_time = match_end_time
        # calculate the length of the match (time between states 5 and 6)
        self.total_match_time = match_end_time - match_start_time 

    def transformTime(self, t_string):
        return float(t_string) - self.match_start_time

def headerInfo(match):
    # form the header
    header = {"id":match.match_id,"draft": {},"length":match.total_match_time ,"teams":match.teams,"players":match.players,"parameters":match.parameters}

    return header

#############################################################################################

def killsInfo(match):

    k=0
    hero_deaths = {}
    heroes = match.heroes
    match_start_time = match.match_start_time
    kills_namespace = match.parameters["namespace"]["kills_namespace"]

    for key in heroes:
        hero_deaths[key] = []

    for row in match.events:
        # for each row check if a death occurred
        if row[1]=="DOTA_COMBATLOG_DEATH":
            # now check if it was a hero that died
            deceased = row[2]
            if deceased.split("_")[2] == "hero":
                # look up which side the hero was on
                hero_name =transformHeroName(deceased)
                side = heroes[hero_name]["side"]
                # now form a dictionary 
                id_num = kills_namespace+k
                death_time = float(row[0]) - match_start_time 
                new_event = {"type":"kill","time": death_time,"team":side}
                # put kill event in the events dictionary
                events[str(id_num)] = new_event
                # add death to the appropriate list in the hero_deaths dictionary
                hero_deaths[hero_name].append(death_time)
                k=k+1

    return hero_deaths

#############################################################################################


def heroPositions(match):

    #for each hero, sample their [x(t),y(t)] coordinates for each time t between the pregame start time
    # and the match end time and store in v_mat and t_vec  
    v_mat = {}
    t_vec = []
    heroes = match.heroes
    num_players = match.parameters["general"]["num_players"]
    sample_step_size = match.parameters["heroPositions"]["sample_step_size"]
    match_start_time = match.match_start_time
    pregame_start_time = match.pregame_start_time
    match_end_time = match.match_end_time

    for key in heroes:
        v_mat[key] = []

    with  open(match.position_input_filename,'rb') as file:
        reader = csv.DictReader(file)    

        for i, row in enumerate(reader):
            if (i % sample_step_size==0) and (i > 0):
                # if the time stamp is after the pregame transition
                absolute_time = float(row["time"])
                if (absolute_time >= pregame_start_time) and (absolute_time <= match_end_time):
                    # append that time point to the time vector with the state 5 transition point set to equal zero
                    t_vec.append(absolute_time - match_start_time)
                    # and for each hero extract the [x,y] coordinate for that time point
                    for key in heroes:
                        v_mat[key].append([float(row["{}X".format(heroes[key]["index"])]),float(row["{}Y".format(heroes[key]["index"])])])

    return v_mat, t_vec

#####################
# hero trajectories #
#####################
 
def heroTrajectories(match,state,hero_deaths):

    logging.info('In heroTrajectories')
    entities = {}
    pregame_start_time = match.pregame_start_time
    match_start_time = match.match_start_time
    match_end_time = match.match_end_time
    heroes = match.heroes
    delta = match.parameters["heroTrajectories"]["delta"]
    min_timespan = match.parameters["heroTrajectories"]["min_timespan"]

    #for each hero
    for key in heroes:
        logging.info('Hero name is: %s', key)
        tmp_list = []
        # look up the (appended) list of times in which the hero died
        death_time_list = [i for i in hero_deaths[key] if (i < state[1][-1])]
        death_time_list.append(state[1][-1]) #append the final timestamp on t_vec - everybody dies in the end!
        # handle the first hero trajectory where there is no initial period where the hero is in death limbo
        samples_list =[{"t":t,"v":state[0][key][j]} for j, t in enumerate(state[1]) if (t <= death_time_list[0])]
        trajectory = {"time-start":samples_list[0]["t"],"time-end":samples_list[-1]["t"],"timeseries":{"format":"samples","samples":samples_list}}    
        tmp_list.append(trajectory)

        for i in range(0,len(death_time_list)-1):
            try:
                #can we replace with a respawn flag?
                 respawn_time = next(t for j, t in enumerate(state[1]) if (t > death_time_list[i]) and (t < death_time_list[i+1]) and ((state[0][key][j][0]-state[0][key][j+1][0])**2+ (state[0][key][j][1]-state[0][key][j+1][1])**2 > delta))
                 t1 = respawn_time
                 t2 = death_time_list[i+1]
            except StopIteration:
                t1 = death_time_list[i]
                t2 = death_time_list[i+1]
                if t2 - t1 >= min_timespan: #filter out very short erroneous trajectories
                    samples_list =[{"t":t,"v":state[0][key][j]} for j, t in enumerate(state[1]) if (t > t1) and (t < t2)]
                    trajectory = {"time-start":samples_list[0]["t"],"time-end":samples_list[-1]["t"],"timeseries":{"format":"samples","samples":samples_list}}    
                    tmp_list.append(trajectory)
            else:
                if t2-t1 >= min_timespan: #filter out very short erroneous trajectories
                    samples_list =[{"t":t,"v":state[0][key][j]} for j, t in enumerate(state[1]) if (t >= t1) and (t <= t2)]
                    trajectory = {"time-start":samples_list[0]["t"],"time-end":samples_list[-1]["t"],"timeseries":{"format":"samples","samples":samples_list}}    
                    tmp_list.append(trajectory)
        visibility_summary = {"format":"changelist", "samples":[]}
        entities[heroes[key]["hero_id"]] = {"unit":key,"team": heroes[key]["side"],"control":heroes[key]["index"],"position":tmp_list, "visibility": visibility_summary}

    for row in match.visibility_rows:
        enemy_visibility_bit = 0
        hero = transformHeroName(row[2])
        if heroes[hero]["side"] == "radiant":
            enemy_visibility_bit = 3
        elif heroes[hero]["side"] == "dire":
            enemy_visibility_bit = 2
        else:
            print "unknown team"
        visible_to_enemy = (int(row[4]) & (1<<enemy_visibility_bit) ) >> enemy_visibility_bit
        entities[heroes[hero]["hero_id"]]["visibility"]["samples"].append({"t": match.transformTime(row[0]), "v": [visible_to_enemy]})


    return entities

##########################################################################################################
#                                       extract normal events
##########################################################################################################

# this reuses and modifies some old code from area_assignment and should probably be removed/rewritten at some point

def assignPlayerArea(match,hero_name,state,area_matrix):
    #takes in player data (x,y,t,g) and returns which box of the area_matrix they were in at each timestep

    xmax = match.parameters["map"]["xmax"]
    xmin = match.parameters["map"]["xmin"]
    ymax = match.parameters["map"]["ymax"]
    ymin = match.parameters["map"]["ymin"]
    num_box = match.parameters["map"]["num_box"]

    grid_size_x = (xmax-xmin)/num_box
    grid_size_y = (ymax-ymin)/num_box

    x = [math.floor((i[0]-xmin)/grid_size_x) for i in state[0][hero_name]]
    y = [math.floor((i[1]-ymin)/grid_size_y) for i in state[0][hero_name]]

    area_state = []
    for k in range(0,len(x)):
        i = num_box-1-int(y[k])
        j = int(x[k])
        area_state.append(area_matrix[i][j])
    return area_state


def areaStateSummary(state,area_state):
    #make two arrays that store the area visited and the time that area was first visited
    #the time is stored as an integer with second precision.
    area_state_summary =["start"]
    area_state_times = [[int(math.floor(state[1][0])),"x"]] #the string "x" is to denote an as yet unknown duration 

    for k in range(0,len(state[1])):
        elem = area_state[k]
        if elem!=0 and elem!=area_state_summary[-1]:
            area_state_summary.append(elem)
            tk = int(math.floor(state[1][k]))
            tj = area_state_times[-1][0]
            area_state_times[-1][1]=tk-tj
            area_state_times.append([tk,"x"])
        k=k+1
    return area_state_summary,area_state_times

k=0

def eventsMapping(match,state,area_matrix):

    summary_to_events_mapping = {"RS":"radiant-secret","DS":"dire-secret","RJ":"radiant-jungle","DJ":"dire-jungle","T1":"toplane-between-radiant-t2-t3","T2":"toplane-between-radiant-t1-t2","T3":"toplane-between-t1s", \
    "T4":"toplane-between-dire-t1-t2","T5":"toplane-between-dire-t2-t3","M1":"midlane-radiant-between-t2-t3","M2":"midlane-radiant-between-t1-t2",\
    "M3":"midlane-between-t1s","M4":"midlane-dire-between-t1-t2","M5":"midlane-dire-between-t2-t3",\
    "B1":"botlane-radiant-between-t2-t3","B2":"botlane-radiant-between-t1-t2","B3":"botlane-between-t1s","B4":"botlane-dire-between-t1-t2","B5":"botlane-dire-between-t2-t3","RB":"radiant-base","DB":"dire-base",\
    "BR":"bottom-rune","TR":"top-rune","RH":"roshan","RA":"radiant-ancient","DA":"dire-ancient"}

    heroes = match.heroes
    normal_namespace = match.parameters["namespace"]["normal_namespace"]
    k=0

    for key in heroes:
        area_state = assignPlayerArea(match,key,state,area_matrix)
        summary = areaStateSummary(state,area_state)
        #create events from summary of the areas the hero has visited
        for i in range(1,len(summary[0])-1): #the first and last elements contain strings so we don't consider them
            location = summary_to_events_mapping[summary[0][i]]
            time_start = summary[1][i][0]
            time_end = time_start + summary[1][i][1]
            involved = [heroes[key]["hero_id"]]
            id_num = normal_namespace + k
            # Lanes
            if (summary[0][i]=="T1") or (summary[0][i]=="T2") or (summary[0][i]=="T4") or (summary[0][i]=="T4") or (summary[0][i]=="T5"):
                type = "laning"
                new_event = {"type":type,"location":location,"time-start":time_start,"time-end":time_end,"involved":involved}
                events[id_num] = new_event
                k=k+1
            elif (summary[0][i]=="M1") or (summary[0][i]=="M2") or (summary[0][i]=="M3")  or (summary[0][i]=="M4") or (summary[0][i]=="M5"):
                type = "laning"
                new_event = {"type":type,"location":location,"time-start":time_start,"time-end":time_end,"involved":involved}
                events[id_num] = new_event
                k=k+1
            elif (summary[0][i]=="B1") or (summary[0][i]=="B2") or (summary[0][i]=="B3")  or (summary[0][i]=="B4") or (summary[0][i]=="B5"):
                type = "laning"
                new_event = {"type":type,"location":location,"time-start":time_start,"time-end":time_end,"involved":involved}
                events[id_num] = new_event
                k=k+1
            #Jungles
            elif (summary[0][i]=="RJ") or (summary[0][i]=="DJ"):
                type = "jungling"
                # related
                new_event = {"type":type,"location":location,"time-start":time_start,"time-end":time_end,"involved":involved}
                events[id_num] = new_event
                k=k+1
            #Bases
            elif (summary[0][i]=="RB") or (summary[0][i]=="DB"):
                type = "fountain-visit"
                # related
                new_event = {"type":type,"location":location,"time-start":time_start,"time-end":time_end,"involved":involved}
                events[id_num] = new_event
                k=k+1
            #Secret Shops
            elif (summary[0][i]=="RS") or (summary[0][i]=="DS"):
                type = "movement"
                # related
                new_event = {"type":type,"location":location,"time-start":time_start,"time-end":time_end,"involved":involved}
                events[id_num] = new_event
                k=k+1
            #Runes
            elif (summary[0][i]=="TR") or (summary[0][i]=="BR"):
                type = "movement"
                # related
                new_event = {"type":type,"location":location,"time-start":time_start,"time-end":time_end,"involved":involved}
                events[id_num] = new_event
                k=k+1
            #Ancients
            elif (summary[0][i]=="DA") or (summary[0][i]=="RA"):
                type = "movement"
                # related
                new_event = {"type":type,"location":location,"time-start":time_start,"time-end":time_end,"involved":involved}
                events[id_num] = new_event
                k=k+1
            #Roshan
            elif (summary[0][i]=="RH"):
                type = "movement"
                # related
                new_event = {"type":type,"location":location,"time-start":time_start,"time-end":time_end,"involved":involved}
                events[id_num] = new_event
                k=k+1

########################################################################
#                   experience and gold
#########################################################################


def goldXPInfo(match):

    # calculates the differences between radiant and dire xp and gold as well as individual hero xp and gold
    bin_size = match.parameters["goldXPInfo"]["bin_size"]
    pregame_start_time = match.pregame_start_time
    match_start_time = match.match_start_time
    match_end_time = match.match_end_time
    heroes = match.heroes

    prior_timestamp = math.floor(pregame_start_time - match_start_time)

    hero_gold = {}
    hero_xp = {}
    for key in heroes:
        hero_gold[key] = []    
        hero_xp[key] = []

    radiant_gold = []
    dire_gold = []
    radiant_xp = []
    dire_xp = []

    gold_difference = []
    xp_difference = []

    radiant_gold_total = 0
    dire_gold_total = 0
    radiant_xp_total = 0
    dire_xp_total =0

    for row in match.goldexp_events:
        absolute_time = float(row[0])
        timestamp = absolute_time-match_start_time
        if (absolute_time >= pregame_start_time) and (absolute_time <= match_end_time):
            if row[1]=="DOTA_COMBATLOG_XP":
                hero_name = transformHeroName(row[2]) #receiver
                xp_amount = int(float(row[3]))
                hero_xp[hero_name].append([xp_amount,timestamp]) 
                side = heroes[hero_name]["side"]
                if side == "radiant":
                    #increment radiant xp
                    radiant_xp_total = radiant_xp_total + xp_amount
                elif side == "dire":
                    dire_xp_total = dire_xp_total + xp_amount
            # for each row check if some Gold was recieved or lost
            elif row[1]=="DOTA_COMBATLOG_GOLD":
                hero_name = transformHeroName(row[2]) #receiver
                gold_amount = int(float(row[4]))
                side = heroes[hero_name]["side"]
                if row[3]=="receives":
                    hero_gold[hero_name].append([gold_amount,timestamp])
                    if side == "radiant":
                        radiant_gold_total = radiant_gold_total + gold_amount
                    elif side == "dire":
                        dire_gold_total = dire_gold_total + gold_amount
                elif row[3]=="looses":
                    hero_gold[hero_name].append([-gold_amount,timestamp])
                    if side == "radiant":
                        radiant_gold_total = radiant_gold_total - gold_amount
                    elif side == "dire":
                        dire_gold_total = dire_gold_total - gold_amount
                else:
                    logging.warning("unknown gold status - was expecting 'receives or looses' but got: %s ", row[3])
            elif (timestamp - prior_timestamp > bin_size):
                #update the xp_difference vector
                xp_difference.append([radiant_xp_total - dire_xp_total,timestamp])
                gold_difference.append([radiant_gold_total - dire_gold_total,timestamp])
                prior_timestamp = timestamp


    gold_samples = [{"t": x[1],"v":[x[0]]} for x in gold_difference]

    exp_samples = [{"t": x[1],"v":[x[0]]} for x in xp_difference]

    timeseries = {"gold-advantage":{"format":"samples","samples":gold_samples},"exp-advantage":{"format":"samples","samples":exp_samples}}

    return timeseries


######################################################################################################
# extract the fight events
# fight: one or more heroes doing damage to another hero on the opposite team with total damage greater
# than x percentage of the total hp at the start of the fight (first hero to hero damage)
#######################################################################################################


class Attack:

    def __init__(self,attacker,victim,damage,v,t,attack_method,health_delta):
        self.attacker = attacker
        self.victim = victim
        self.damage = damage
        self.v = v
        self.t = t
        self.attack_method = attack_method
        self.health_delta = health_delta

def fightDistMetric(attack1,attack2,radius,w_space1,w_space2,w_time):

    r = math.sqrt((attack1.v[0]-attack2.v[0])**2+(attack1.v[1]-attack2.v[1])**2)

    if r < radius:
        w_space = w_space1
    else:
        w_space = w_space2

    dist = w_space*r + w_time*(abs(attack1.t-attack2.t)) 
    return dist


def makeAttackList(match,state):

    damage_total = 0
    damage_log = []
    attack_list =[]

    heroes = match.heroes
    pregame_start_time = match.pregame_start_time
    match_start_time = match.match_start_time
    match_end_time = match.match_end_time
    prior_timestamp = math.floor(pregame_start_time - match_start_time)
    bin_size = match.parameters["makeAttackList"]["bin_size"]

    for row in match.damage_events:
        # for each row check if some damage occured (if a non-hero character dies sometimes you get null in row[2])
        absolute_time  = float(row[0])
        timestamp = absolute_time-match_start_time
        if (absolute_time >= pregame_start_time) and (absolute_time <= match_end_time ):  #only consider data in replay file that occur during actual match
            # if the row does not record damage and the timestamp is 1 second older than the prior timestamp dump the current damage total to the damage log
            if (timestamp - prior_timestamp > bin_size):
                damage_log.append([damage_total,min(timestamp,prior_timestamp+1)])
                damage_total = 0
                prior_timestamp = timestamp
            #if the row records damage
                # now check if the damage was between two heroes 
            attacker = row[2] 
            split_attacker_string = re.split("_| ",attacker)
            victim = row[3] 
            split_victim_string = re.split("_| ",victim)                
            if (len(split_attacker_string) >=4) and (len(split_victim_string)>=4):
                if (split_attacker_string[2] == "hero") and (split_victim_string[2] == "hero"):
                    # handle case where attacker and victim are illusions
                    if (split_attacker_string[-1]=="(illusion)") and (split_victim_string[-1]=="(illusion)"):
                        attacker_name_list =split_attacker_string[3:-1]
                        victim_name_list =split_victim_string[3:-1]
                        # handle attacker illusions case
                    elif (split_attacker_string[-1]=="(illusion)"):
                        attacker_name_list =split_attacker_string[3:-1]
                        victim_name_list =split_victim_string[3:]
                        # handle victim illusions case
                    elif (split_victim_string[-1]=="(illusion)"):
                        attacker_name_list =split_attacker_string[3:]
                        victim_name_list =split_victim_string[3:-1]
                    else:
                        attacker_name_list =split_attacker_string[3:]
                        victim_name_list =split_victim_string[3:]
                    #join the names up
                    s = "_"
                    attacker_name = s.join(attacker_name_list)
                    attacker_side = heroes[attacker_name]["side"]
                    #now for the victim_name
                    victim_name = s.join(victim_name_list)
                    victim_side = heroes[victim_name]["side"]
                    shifted_time = [(t-timestamp)**2 for t in state[1]]
                    index = np.argmin(shifted_time)
                    damage_total = damage_total + float(row[5])
                    attack_method_string = row[4]
                    if (attack_method_string == " ") or (attack_method_string == ""):
                        attack_method = "melee"
                    else:
                        split_attack_method_string = attack_method_string.split()
                        attack_method = split_attack_method_string[1]
                        attack_method = attack_method[len(attacker_name)+1:]
                    health_delta = row[6]

                    new_attack = Attack(attacker_name,victim_name,float(row[5]),state[0][attacker_name][index],timestamp,attack_method,health_delta)
                    #print attacker_name + " at " + str(state[0][attacker_name][index]) + " attacked " + victim_name + " at " + str(state[0][victim_name][index])  + " did " + str(row[5]) + " damage  at " + str(timestamp)              
                    attack_list.append(new_attack)

    return attack_list

def graphAttacks(attack_list,time_start,time_end):

    damage_threshold = match.parameters["graphAttacks"]["damage_threshold"]

    fig = plt.figure()
    ax = fig.add_subplot(111, projection='3d')

    for attack in attack_list:    
        if (attack.t >= time_start) and (attack.t <= time_end): 
            xs = attack.v[0]
            ys = attack.v[1]
            zs = attack.t
            if attack.damage > damage_threshold:
                c = 'r'
                m = 'o'
            else:
                c = 'b'
                m = '^'
            ax.scatter(xs,ys,zs,c=c,marker=m)

    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_zlabel('Time')

    plt.show()

def formAdjacencyMatrix(match,attack_list):

    distance_threshold = match.parameters["formAdjacencyMatrix"]["distance_threshold"]
    radius = match.parameters["formAdjacencyMatrix"]["radius"]
    w_space1 = match.parameters["formAdjacencyMatrix"]["w_space1"]
    w_space2 = match.parameters["formAdjacencyMatrix"]["w_space2"]
    w_time = match.parameters["formAdjacencyMatrix"]["w_time"]

    n = len(attack_list)
    A = np.zeros(shape=(n,n))

    for i in range(0,n):
        for j in range(i+1,n):
            if attack_list[j].t-attack_list[i].t > distance_threshold/w_time:
                break
            else:            
                d = fightDistMetric(attack_list[i],attack_list[j],radius,w_space1,w_space2,w_time)
                if d < distance_threshold:
                    A[i,j] = 1
                    A[j,i] = 1

    return A

def graphFights(attack_list,A,time_start,time_end):

    fig = plt.figure()
    ax = fig.add_subplot(111, projection='3d')

    n = len(attack_list)

    for i in range(0,n):
        for j in range(i+1,n):
            if A[i,j]==1 and (attack_list[j].t >= time_start) and (attack_list[j].t <= time_end):            
                xs = [attack_list[i].v[0],attack_list[j].v[0]]
                ys = [attack_list[i].v[1],attack_list[j].v[1]]
                zs = [attack_list[i].t,attack_list[j].t]
                ax.plot(xs, ys, zs, label='attacks')

    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_zlabel('Time')

    plt.show()

##################################################################################

def lookUpLocation(match,area_matrix,v):

    xmax = match.parameters["map"]["xmax"]
    xmin = match.parameters["map"]["xmin"]
    ymax = match.parameters["map"]["ymax"]
    ymin = match.parameters["map"]["ymin"]
    num_box = match.parameters["map"]["num_box"]

    #takes in player data (x,y,t,g) and returns a list of areas they visit in that data set
    grid_size_x = (xmax-xmin)/num_box
    grid_size_y = (ymax-ymin)/num_box

    x = math.floor((v[0]-xmin)/grid_size_x)
    y = math.floor((v[1]-ymin)/grid_size_y)

    i = num_box-1-int(y)
    j = int(x)
    area_state = area_matrix[i][j]

    area_centres = {"RS":[-4529,1250],"DS":[3696,406],"RJ":[1250,-4150],"DJ":[-606,3781],"T1":[-6765,-2125],"T2":[-6723,466],"T3":[-6639,5173], \
    "T4":[-2800,6143],"T5":[1292,6059],"M1":[-3643,-3348],"M2":[-2167,-1289],\
    "M3":[-226,-142],"M4":[1671,1334],"M5":[2895,2642],\
    "B1":[-2040,6385],"B2":[2346,-6301],"B3":[6354,-4782],"B4":[6481,-986],"B5":[6396,1292],"RB":[-5837,-5457],"DB":[5679,5173],\
    "BR":[2978,-2504],"TR":[-2293,1376],"RH":[4034,-1956],"RA":[-2673,-58],"DA":[3106,-775]}

    summary_to_events_mapping = {"RS":"radiant-secret","DS":"dire-secret","RJ":"radiant-jungle","DJ":"dire-jungle","T1":"toplane-between-radiant-t2-t3","T2":"toplane-between-radiant-t1-t2","T3":"toplane-between-t1s", \
        "T4":"toplane-between-dire-t1-t2","T5":"toplane-between-dire-t2-t3","M1":"midlane-radiant-between-t2-t3","M2":"midlane-radiant-between-t1-t2",\
        "M3":"midlane-between-t1s","M4":"midlane-dire-between-t1-t2","M5":"midlane-dire-between-t2-t3",\
        "B1":"botlane-radiant-between-t2-t3","B2":"botlane-radiant-between-t1-t2","B3":"botlane-between-t1s","B4":"botlane-dire-between-t1-t2","B5":"botlane-dire-between-t2-t3","RB":"radiant-base","DB":"dire-base",\
        "BR":"bottom-rune","TR":"top-rune","RH":"roshan","RA":"radiant-ancient","DA":"dire-ancient"}


    if area_state == 0:
        min_dist = 10000
        for key in area_centres:
            new_dist = math.sqrt((v[0]-area_centres[key][0])**2+(v[1]-area_centres[key][1])**2)
            if new_dist < min_dist:
                min_key = key
                min_dist = new_dist
        location = summary_to_events_mapping[min_key]
    else:
        location = summary_to_events_mapping[area_state]

    return location

def makeFightList(match,attack_list,A):
    #take the list of attacks and group them into fights using the adjacency matrix A
    fight_list = []
    #find the connected components of the graph using scipy (this takes a couple of seconds)
    n_components, labels = scipy.sparse.csgraph.connected_components(A, directed=False, return_labels=True)

    #for each fight make a list of attacks
    for i in range(0,n_components):
        fight_list.append([attack_list[j] for j, x in enumerate(labels) if x == i ])

    return fight_list

def makeFightDict(match,fight_list,area_matrix):
    # make a dictionary that stores the basic information about each fight and formats it to be outputted to the json file
    pregame_start_time = match.pregame_start_time
    match_start_time = match.match_start_time
    match_end_time = match.match_end_time
    heroes = match.heroes
    k=0

    fight_dict = {}
    for i,fight in enumerate(fight_list):
        fight_dict[i] = {}
        position_x = []
        position_y = []
        involved =set([])
        total_damage = 0
        attack_sequence = []
        time_start = fight[0].t
        time_end = fight[-1].t
        damage_dealt = {}
        damage_dealt["radiant"] = []
        damage_dealt["dire"] = []
        for attack in fight:
            id1 = heroes[attack.attacker]["hero_id"]
            id1_set = set([id1])
            id2 = heroes[attack.victim]["hero_id"]
            id2_set = set([id2])
            involved.update(id1_set)
            involved.update(id2_set)
            damage_dealt[heroes[attack.attacker]["side"]].append([attack.t,attack.damage,id1])
            total_damage = total_damage + attack.damage
            attack_element = {}
            position_x.append(attack.v[0])
            position_y.append(attack.v[1])
            attack_element["attacker"]=id1
            attack_element["victim"] = id2
            attack_element["damage"] = attack.damage
            attack_element["attack_method"] = attack.attack_method
            attack_element["v"] = attack.v
            attack_element["t"] = attack.t
            attack_element["health_delta"] = attack.health_delta
            attack_sequence.append(attack_element)

        mean_position = [sum(position_x)/len(position_x),sum(position_y)/len(position_y)]
        location = lookUpLocation(match,area_matrix,mean_position)
        fight_dict[i]["involved"] = involved #want to keep the set for use later in my_deaths function
        fight_dict[i]["time-start"] = time_start
        fight_dict[i]["time-end"] = time_end
        fight_dict[i]["mean_position"] = mean_position
        fight_dict[i]["total_damage"] = total_damage
        fight_dict[i]["attack_sequence"] = attack_sequence
        fight_dict[i]["killed"] = []
        fight_dict[i]["location"] = location
        fight_dict[i]["damage_dealt"] = damage_dealt
        #evaluate who initiated the fight
        fight_dict[i]["initiation"] = initiationDamage(match,damage_dealt,time_start)
        #evaluate who won the fight
        fight_dict[i]["received"] = whoWonFight(match,fight,involved)
        #print "fight dictionary entry" + str(i)
    return fight_dict

def initiationDamage(match,damage_dealt,time_start):
    initiation_window = match.parameters["initiationDamage"]["initiation_window"]
    radiant_initiation_damage = 0
    dire_initiation_damage = 0

    for item in damage_dealt["radiant"]:
        if item[0]-time_start  < 1:
            radiant_initiation_damage = radiant_initiation_damage + item[1]
        else:
            break

    for item in damage_dealt["dire"]:
        if item[0]-time_start  < 1:
            dire_initiation_damage = dire_initiation_damage + item[1]
        else:
            break
    

    initiation_damage = {}
    initiation_damage["radiant"] = radiant_initiation_damage
    initiation_damage["dire"] = dire_initiation_damage

    #+1 for 100% radiant and -1 for 100% dire
    side_indicator = (radiant_initiation_damage-dire_initiation_damage)/(dire_initiation_damage+radiant_initiation_damage)

    initiation = {}
    initiation["initiation_damage"] = initiation_damage
    initiation["side_indicator"] = side_indicator
    return initiation

def whoWonFight(match,fight,involved):
    #return the gold and xp that was exchanged during a fight and use this as a metric of who won the fight 
    #one issue is how to determine who won the fight when nobody dies and no xp/gold was exchanged.
    received = {}
    received["xp_received"] = {}
    received["gold_received"] = {}

    xp_received_radiant = 0
    xp_received_dire = 0

    gold_received_radiant = 0
    gold_received_dire = 0

    #look up the timestamp of the first and last elements in the array of attacks that make up the fight
    time_start = fight[0].t
    time_end = fight[-1].t

    #float(row[0]) is the absolute time, does this make sense to use the time_start/end from the attack list?
    for row in match.goldexp_events:
        if (row[1]=="DOTA_COMBATLOG_XP") and (float(row[0])-match.match_start_time <= time_end) and (float(row[0])-match.match_start_time >= time_start):
            #look up the id of the hero receiving xp and see if they were involved in the fight
            hero_name = transformHeroName(row[2]) #receiver
            id1 = match.heroes[hero_name]["hero_id"]
            if id1 in involved:
                xp_amount = int(float(row[3]))
                side = match.heroes[hero_name]["side"]
                if side == "radiant":
                    #increment radiant xp
                    xp_received_radiant = xp_received_radiant + xp_amount
                elif side == "dire":
                    #increment dire xp
                    xp_received_dire = xp_received_dire + xp_amount
        elif (row[1]=="DOTA_COMBATLOG_GOLD") and (float(row[0])-match.match_start_time <= time_end) and (float(row[0])-match.match_start_time >= time_start):
            hero_name = transformHeroName(row[2]) #receiver
            id1 = match.heroes[hero_name]["hero_id"]
            if id1 in involved:
                gold_amount = int(float(row[4]))
                side = match.heroes[hero_name]["side"]
                if row[3] == "looses":
                    gold_amount = -gold_amount
                if side == "radiant":
                    #increment radiant xp
                    gold_received_radiant = gold_received_radiant + gold_amount
                elif side == "dire":
                    #increment dire xp
                    gold_received_dire = gold_received_dire + gold_amount 

    received["xp_received"]["radiant"] = xp_received_radiant
    received["xp_received"]["dire"] = xp_received_dire

    received["gold_received"]["radiant"] = gold_received_radiant
    received["gold_received"]["dire"] = gold_received_dire
    return received 


###################################################################################
def fightEvaluation(match,fight_dict,hero_death_fights):
    #applies a very crude filter the fights to see if the fight is significant enough to write to the json file
    alpha = match.parameters["fightEvaluation"]["alpha"]
    kappa = match.parameters["fightEvaluation"]["kappa"]
    time_threshold = match.parameters["fightEvaluation"]["time_threshold"]
    fights_namespace = match.parameters["namespace"]["fights_namespace"]

    for key in fight_dict:
        damage_threshold = alpha + kappa*fight_dict[key]["time-start"]
        if (len(fight_dict[key]["killed"]) > 0) or ((fight_dict[key]["total_damage"] > damage_threshold + kappa*fight_dict[key]["time-start"]) and (fight_dict[key]["time-end"] - fight_dict[key]["time-start"] > time_threshold)):
            # overwrite the 'involved' key value pair since sets are not json serialisable
            involved = list(fight_dict[key]["involved"])
            fight_dict[key]["involved"] = involved
            id_num = fights_namespace + key
            events[id_num] = fight_dict[key]
            events[id_num]["type"] = "fight"

##############################################################################
# code for retrieving personalised info about specific heroes

def camControlEvaluation(match):
    last_selection = {}
    for player in match.players:
        last_selection[str(player)] = {"unit":None, "t":0}
    camera_event_counter = 0
    for row in match.unit_selection_rows:
        if last_selection[row[2]]["unit"] is not None and last_selection[row[2]]["unit"] != "":
            event_id = match.parameters["namespace"]["camera_namespace"] + camera_event_counter
            event = {
                    "type": "unit-selection",
                    "time-start": match.transformTime(last_selection[row[2]]["t"]),
                    "time-end":match.transformTime(row[0]),
                    "player": int(row[2]),
                    "unit": last_selection[row[2]]["unit"]
                    }
            events[str(event_id)] = event
            camera_event_counter += 1
        last_selection[row[2]]["t"] = row[0]
        last_selection[row[2]]["unit"] = row[4]

def myDeaths(match,hero_deaths,fight_dict):

    heroes = match.heroes
    # make a dictionary that will hold a list of indexes of fights in which each hero died
    hero_death_fights = {}

    for hero in heroes:
        # make a set to contain the hero_ids of people in fights - allows us to query 'fights involving x and y'
        hero_death_fights[hero] = set([])
        # for each hero and for each time the hero died find the corresponding fight in the fights_list
        for death_time in hero_deaths[hero]:
            for key in fight_dict:
                if (heroes[hero]["hero_id"] in fight_dict[key]["involved"]) and (death_time >= fight_dict[key]["time-start"]) and ((death_time <= fight_dict[key]["time-end"])):
                    hero_death_fights[hero].update(set([key]))
                    fight_dict[key]["killed"].append(heroes[hero]["hero_id"])
                    break
    return hero_death_fights

###################################################################################

def creepEvaluation(match):
    last_tick_time = 0
    next_goldexp_pointer = 0
    tick_creepdeaths_set  = []
    all_matched = []

    for row in match.spawn_rows:
        putSpawn(match, row)

    for row in match.death_rows:
        creep_time = float(row[0])
        alldropped = []
        if creep_time != last_tick_time:
            #process last tick of creeps
            tick_log_set  = []
            tick_log_set_before  = []
            #use goldexp events before the tick, they appear early
            my_goldexp_pointer = next_goldexp_pointer
            while my_goldexp_pointer < len(match.goldexp_events) and float(match.goldexp_events[my_goldexp_pointer][0]) <= last_tick_time:
                tick_log_set.append(match.goldexp_events[my_goldexp_pointer])
                if float(match.goldexp_events[my_goldexp_pointer][0]) != last_tick_time :
                    if match.goldexp_events[my_goldexp_pointer][1] == "OVERHEAD_ALERT_GOLD":
                        alldropped.append(match.goldexp_events[my_goldexp_pointer])
                    next_goldexp_pointer += 1 #only advance over the tick before the creepdeath, to keep overhead msgs for next creep
                my_goldexp_pointer += 1
            #print "collecting {} {} {} {}".format(creep_time, last_tick_time, tick_log_set, tick_log_set_before)
            all_matched.extend( matchCreepsWithLog(match, last_tick_time, tick_creepdeaths_set, tick_log_set))
            tick_creepdeaths_set  = []
            last_tick_time = creep_time
        for d in alldropped:
            if not  d in all_matched:
                print "lost overhead {}".format(d)
        tick_creepdeaths_set.append(row)
    
def putSpawn(match, row):
    position = "unknown"
    locations = [
        {"x": -6575,    "y": -4104,   "name": "top"},#radiant
        {"x": -4896,    "y": -4384,   "name": "mid"},#radiant
        {"x": -3648,    "y": -6112,   "name": "bot"}, #radiant
        {"x": 3168,     "y": 5792,    "name": "top"},#dire
        {"x": 4096,     "y": 3583,    "name": "mid"},#dire 
        {"x": 6275,     "y": 3645,    "name": "bot"}#dire
    ]
    min_d = 500
    for l in locations:
        x = float(row[4])
        y = float(row[5])
        d = math.sqrt((x - l["x"]) *(x - l["x"]) + (y - l["y"])*(y - l["y"]))
        if d < min_d:
            min_d = d
            position = l["name"]
    print "put {} {}".format(position, row)
    match.creep_positions[row[3]] = position

def matchCreepsWithLog(match, time, creeps, log):
    gold = []
    exps = []
    lh_list = []
    denie_list = []

    my_events = []
    matched_ohs = []
    for logrow in log:
        if logrow[1]=="DOTA_COMBATLOG_GOLD":
            gold.append(logrow)
        elif logrow[1]=="DOTA_COMBATLOG_XP":
            exps.append(logrow)
        elif logrow[1] == "OVERHEAD_ALERT_GOLD":
            lh_list.append(logrow)
        elif logrow[1] == "OVERHEAD_ALERT_DENY":
            denie_list.append(logrow)
    for creepy in creeps:
        event = createCreepEvent(match, creepy)
        death_type = "none"
        for lh in lh_list:
            if lh[4] == creepy[3]: #same creep
                lh_player = int(match.player_id_by_handle[lh[5]])
                death_type = "lasthit"
                event["lasthit-by"] = lh_player
                event["gold-gained"] = int(lh[2])
                matched_ohs.append(lh)
                break
        for denie in denie_list:
            if denie[4] == creepy[3]: #same creep
                denie_player = match.player_id_by_handle[denie[3]]
                death_type = "denie"
                event["denied-by"] = denie_player
                break
        if death_type == "none":
            pass#print "couldnt find lh/denie {} \n\t{}\n\t{}\n\t{}\n\t{}\n\t{}\n".format(creepy,creeps, gold, exps, lh_list, denie_list)
        exp_ids = []
        if len(creeps) == 1:
            for exp in exps:
                exp_obj = {"id":match.heroes[transformHeroName(exp[2])]["index"], "v": int(exp[3])}
                exp_ids.append(exp_obj)
        elif len(exps) > 0:
            print "multiple creeps and exps \n\t{}\n\t{}\n\t{}\n\t{}\n\t{}\n".format(creeps, gold, exps, lh_list, denie_list) #todo
        event["exp-claimed-by"] = exp_ids
        event["lasthit-type"] = death_type #none/lasthit/denie
        event["responsible"] = [] #TODO
        event_id = str(match.parameters["namespace"]["creeps_namespace"]+match.nCreeps)
        match.nCreeps += 1
        events[event_id]= event   
        my_events.append(event)
    return matched_ohs
    #print "made events  {}, {}{} - {}{} -> {}".format(creeps, gold, exps, lh_list, denie_list, my_events) #todo             

def createCreepEvent(match, creep_row):
    #print creep_row
    creep_event = {}
    creep_event["type"] = "creep-death"
    if creep_row[2] == "npc_dota_creep_lane":
        creep_event["creep-type"]="lane"
    elif creep_row[2] == "npc_dota_creep_siege":
        creep_event["creep-type"]="siege"
    elif creep_row[2] == "npc_dota_creep_neutral":
        creep_event["creep-type"]="neutral"
    else:
        creep_event["creep-type"]="unknown"
    creep_event["time"] = float(creep_row[0]) - match.match_start_time
    creep_event["position"] = { "x":float(creep_row[5]), "y":float(creep_row[6]) }
    team = int(creep_row[4])
    if team == 2:
        creep_event["team"] = "radiant"
    elif team == 3:
        creep_event["team"] = "dire"
    elif team == 4:
        creep_event["team"] = "neutral"
    creep_event["spawned-at"] = match.creep_positions[creep_row[3]]
    return creep_event



def computeStats(match, analysis):
    evaluation = {"player-stats": {}, "match-stats": {}}

    evaluation["match-stats"]["duration"] = match.match_end_time - match.match_start_time
    evaluation["match-stats"]["duration-all"] = match.match_end_time - match.pregame_start_time
    evaluation["match-stats"]["creeps-killed"] = 0
    evaluation["match-stats"]["creeps-lasthit"] = 0
    for player_id in match.players:
        player_eval = {}
        player_eval["steamid"] = match.players[player_id]["steam_id"]

        player_eval["lasthits"] = 0
        player_eval["denies"] = 0

        player_eval["creeps-missed"] = 0
        player_eval["denies-with-exp"] = 0
        player_eval["neutrals"] = 0
        player_eval["lane-creeps"] = 0

        player_eval["time-visible"] = 0
        player_eval["time-visible-first10"] = 0

        last_visibility_change = None
        hero_entity_id = match.heroes[match.players[player_id]["hero"]]["hero_id"]
        for change in analysis["entities"][hero_entity_id]["visibility"]["samples"]:
            time = change["t"]
            if change["v"][0] == 0 and last_visibility_change is not None:
                player_eval["time-visible"] += change["t"] - last_visibility_change
            
                #track vis in first 10min separately
                start_beg = max(0, last_visibility_change)
                stop_beg = min(time, 10*60)
                player_eval["time-visible-first10"] += max(0, stop_beg - start_beg)
            
            last_visibility_change = time

        player_eval["n-checks"] = 0
        player_eval["average-check-duration"] = 0


        evaluation["player-stats"][str(player_id)] = player_eval

    for event_id in analysis["events"]:
        event = analysis["events"][event_id]
        if event["type"] == "creep-death":
            evaluation["match-stats"]["creeps-killed"] += 1
            if event["lasthit-type"] == "lasthit":
                evaluation["match-stats"]["creeps-lasthit"] += 1
                evaluation["player-stats"][str(event["lasthit-by"])]["lasthits"] += 1
                if event["creep-type"] == "lane" or event["creep-type"] == "siege":
                    evaluation["player-stats"][str(event["lasthit-by"])]["lane-creeps"] += 1
                elif event["creep-type"] == "neutral":
                    evaluation["player-stats"][str(event["lasthit-by"])]["neutrals"] += 1
            elif event["lasthit-type"] == "denie":
                evaluation["player-stats"][str(event["denied-by"])]["denies"] += 1
                if len(event["exp-claimed-by"]) > 0:
                    evaluation["player-stats"][str(event["denied-by"])]["denies-with-exp"] += 1
        elif event["type"] == "unit-selection":
            evaluation["player-stats"][str(event["player"])]["n-checks"] += 1
            evaluation["player-stats"][str(event["player"])]["average-check-duration"] += ((event["time-end"] - event["time-start"]) - evaluation["player-stats"][str(event["player"])]["average-check-duration"] )/ evaluation["player-stats"][str(event["player"])]["n-checks"]

    return evaluation
def main():
    match_id = sys.argv[1]
    match_directory = sys.argv[2]
    analysis_filename = sys.argv[3]
    header_filename = sys.argv[4]
    stats_filename = sys.argv[5]
    logging.basicConfig(filename=match_directory+'/logfile.log',level=logging.DEBUG)
    match = Match(match_id, match_directory)
    match.matchInfo()
    header = headerInfo(match)
    hero_deaths = killsInfo(match)
    state = heroPositions(match)  #[[v_mat],t_vec]
    entities = heroTrajectories(match,state,hero_deaths)
    eventsMapping(match,state,area_matrix)
    timeseries = goldXPInfo(match) #up to this point takes a few seconds
    attack_list = makeAttackList(match,state)
    A = formAdjacencyMatrix(match,attack_list)
    fight_list = makeFightList(match,attack_list,A)
    fight_dict = makeFightDict(match,fight_list,area_matrix)
    hero_death_fights = myDeaths(match,hero_deaths,fight_dict)
    fightEvaluation(match,fight_dict,hero_death_fights)
    camControlEvaluation(match)
    creepEvaluation(match)
    analysis = {"header":header,"entities":entities,"events":events,"timeseries":timeseries}
    stats = computeStats(match, analysis)


    #my_fights(match,"tusk",hero_death_fights,fight_dict)
    analysisfile = open(analysis_filename,'wb')
    analysisfile.write(json.dumps(analysis, sort_keys=True,indent=4, separators=(',', ': ')))    
    analysisfile.close()
    headerfile = open(header_filename,'wb')
    headerfile.write(json.dumps(header, sort_keys=True,indent=4, separators=(',', ': ')))    
    headerfile.close()
    statsfile = open(stats_filename,'wb')
    statsfile.write(json.dumps(stats, sort_keys=True,indent=4, separators=(',', ': ')))    
    statsfile.close()

    #delete intermediate/input files
    #shutil.rmtree(match_directory)

if __name__ == "__main__":
    cProfile.run('main()')

