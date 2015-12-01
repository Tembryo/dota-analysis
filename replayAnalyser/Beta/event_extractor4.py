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

events = {}

class Match:

	def __init__(self,match_id, out_file):
		# files where the replay data is stored
		self.match_id = match_id
		self.header_input_filename = "parsedReplays/"+str(match_id)+"/header.csv"
		self.position_input_filename = "parsedReplays/"+str(match_id)+"/trajectories.csv"
		self.events_input_filename = "parsedReplays/"+str(match_id)+"/events.csv"
		self.output_filename = out_file
		# variables that determine how the data is analysed - need to include all parameters
		self.parameters = {}
		self.parameters["namespace"] = {}
		self.parameters["namespace"]["hero_namespace"] = 100
		#self.hero_namespace = 100
		self.parameters["namespace"]["kills_namespace"] = 10000
		#self.kills_namespace = 10000
		self.parameters["namespace"]["normal_namespace"] = 11000
		#self.normal_namespace = 11000
		self.parameters["namespace"]["fights_namespace"] = 12000
		#self.fights_namespace = 12000
		self.parameters["general"] = {}
		self.parameters["general"]["col_per_player"] = 3
		#self.col_per_player = 3
		self.parameters["general"]["num_players"] = 10
		#self.num_players = 10
		#self.sample_step_size = 150
		self.parameters["map"] = {}
		self.parameters["map"]["xmin"] = -8200
		#self.xmin = -8200
		self.parameters["map"]["xmax"] = 8000
		#self.xmax = 8000.0
		self.parameters["map"]["ymin"] = -8200
		#self.ymin = -8200.0
		self.parameters["map"]["ymax"] = 8000
		#self.ymax = 8000.0
		self.parameters["map"]["num_box"] = 32
		#self.num_box = 32
		self.parameters["pregame_time_shift"] = 60
		#self.pregame_time_shift = 60
		# function specific parameters

		self.parameters["heroPositions"] = {}
		self.parameters["heroPositions"]["sample_step_size"] = 150

		self.parameters["heroTrajectories"] = {}
		self.parameters["heroTrajectories"]["delta"] = 1000
		#self.heroTrajectoies_delta = 1000
		self.parameters["heroTrajectories"]["min_timespan"] =3
		#self.heroTrajectories_min_timespan = 3

		self.parameters["goldXPInfo"] = {}
		self.parameters["goldXPInfo"]["bin_size"] = 2
		#self.goldXPinfo_bin_size = 2

		self.parameters["makeAttackList"] = {}
		self.parameters["makeAttackList"]["bin_size"] = 1 
		#self.makeAttackList_bin_size = 1

		self.parameters["graphAttacks"] = {}
		self.parameters["graphAttacks"]["damage_threshold"] = 50
		#self.graphAttacks_damage_threshold = 50

		self.parameters["formAdjacencyMatrix"] = {}
		self.parameters["formAdjacencyMatrix"]["distance_threshold"] = 300
		#self.formAdjacencyMatrix_distance_threshold = 300
		self.parameters["formAdjacencyMatrix"]["radius"] = 1500
		#self.formAdjacencyMatrix_radius = 1500
		self.parameters["formAdjacencyMatrix"]["w_space1"] = 0.02
		self.formAdjacencyMatrix_w_space1 = 0.02
		self.parameters["formAdjacencyMatrix"]["w_space2"] = 0.3
		#self.formAdjacencyMatrix_w_space2 = 0.3
		self.parameters["formAdjacencyMatrix"]["w_time"] = 80
		#self.formAdjacencyMatrix_w_time = 80

		self.parameters["evaluateFightList"] = {}
		self.parameters["evaluateFightList"]["alpha"] = 150
		#self.evaluateFightList_alpha = 150
		self.parameters["evaluateFightList"]["kappa"] = 0.15
		#self.evaluateFightList_kappa = 0.15
		self.parameters["evaluateFightList"]["time_threshold"] = 2
		#self.evaluateFightList_time_threshold = 2

	def matchInfo(self):

		# extract the match info from the files

		teams = {0:{"side":"radiant","name":"empty","short":"empty"},1:{"side":"dire","name":"empty","short":"empty"}}
		players = {}
		heros = {}

		f = open(self.header_input_filename,'rb')
		header_reader = csv.reader(f)


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
				# form the heros dictionary
				hero_name_string = row[4]
				hero_name_list = hero_name_string.split("_")
				hero_name_list = hero_name_list[3:] # remove the unnecessary dota_npc_hero part
				s = "_"
				hero_name = s.join(hero_name_list) # join the strings back together
				heros[hero_name] = {}
				heros[hero_name]["index"] = int(row[1])
				heros[hero_name]["hero_id"] = self.parameters["namespace"]["hero_namespace"] + int(row[1])
				if int(row[5]) == 2:
					heros[hero_name]["side"] = "radiant"
				elif int(row[5]) == 3:
					heros[hero_name]["side"] = "dire"

		f.close()

		f = open(self.events_input_filename,'rb')
		events_reader = csv.reader(f)

		pregame_flag = 0
		for i, row in enumerate(events_reader):
			if i == 0:
				first_timestamp = math.floor(float(row[0]))
			elif row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "5":
				match_start_time = math.floor(float(row[0]))
			elif row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "4":
				pregame_start_time = math.floor(float(row[0]))
				pregame_flag = 1
			elif row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "6":
				match_end_time  = math.floor(float(row[0]))

		f.close()
		# if there was no GAME_STATE = 4 event set the pregame start time to be 60 seconds before the match start time	
		# or the earliest time we have available in the file	
		if pregame_flag != 1:
			logging.info('No DOTA_COMBATLOG_GAME_STATE == 4 transition in this events file')
			pregame_start_time = max(match_start_time - self.parameters["pregame_time_shift"],first_timestamp)


		# calculate the length of the match (time between states 5 and 6)
		self.teams = teams
		self.players = players
		self.heros = heros
		self.pregame_start_time = pregame_start_time
		self.match_start_time = match_start_time
		self.match_end_time = match_end_time
		self.total_match_time = match_end_time - match_start_time 

def headerInfo(match):
	# form the header
	header = {"id":match.match_id,"draft": {},"length":match.total_match_time ,"teams":match.teams,"players":match.players,"parameters":match.parameters}

	return header

#############################################################################################

def killsInfo(match):

	k=0
	hero_deaths = {}
	heros = match.heros
	match_start_time = match.match_start_time
	kills_namespace = match.parameters["namespace"]["kills_namespace"]
	events_input_filename = match.events_input_filename

	for key in heros:
		hero_deaths[key] = []

	f = open(events_input_filename,'rb')
	reader = csv.reader(f)

	for i, row in enumerate(reader):
		# for each row check if a death occurred
		if row[1]=="DOTA_COMBATLOG_DEATH":
			# now check if it was a hero that died
			deceased = row[2]
			split_deceased_string = deceased.split("_")
			if split_deceased_string[2] == "hero":
				# look up which side the hero was on
				hero_name_list = split_deceased_string[3:]
				s = "_"
				hero_name = s.join(hero_name_list)
				side = heros[hero_name]["side"]
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
	heros = match.heros
	col_per_player = match.parameters["general"]["col_per_player"]
	num_players = match.parameters["general"]["num_players"]
	position_input_filename  = match.position_input_filename
	sample_step_size = match.parameters["heroPositions"]["sample_step_size"]
	match_start_time = match.match_start_time
	pregame_start_time = match.pregame_start_time
	match_end_time = match.match_end_time

	for key in heros:
		v_mat[key] = []

	e = open(position_input_filename,'rb')
	reader = csv.reader(e)


	for i, row in enumerate(reader):
		if (i % sample_step_size==0) and (i > 0):
			# if the time stamp is after the state 4 transition
			absolute_time = float(row[col_per_player*num_players])
			if (absolute_time >= pregame_start_time) and (absolute_time <= match_end_time):
				# append that time point to the time vector with the state 5 transition point set to equal zero
				t_vec.append(absolute_time - match_start_time)
				# and for each hero extract the [x,y] coordinate for that time point
				for key in heros:
					v_mat[key].append([float(row[col_per_player*heros[key]["index"]+1]),float(row[col_per_player*heros[key]["index"]+2])])

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
	heros = match.heros
	delta = match.parameters["heroTrajectories"]["delta"]
	min_timespan = match.parameters["heroTrajectories"]["min_timespan"]

	#for each hero
	for key in heros:
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

		entities[heros[key]["hero_id"]] = {"unit":key,"team": heros[key]["side"],"control":heros[key]["index"],"position":tmp_list}

	return entities

##########################################################################################################
#                                       extract normal events
##########################################################################################################

# this reuses and modifies some old code from area_assignment and should probably be removed/rewritten at some point

def assignPlayerArea2(match,hero_name,state,area_matrix):

	xmax = match.parameters["map"]["xmax"]
	xmin = match.parameters["map"]["xmin"]
	ymax = match.parameters["map"]["ymax"]
	ymin = match.parameters["map"]["ymin"]
	num_box = match.parameters["map"]["num_box"]

	#takes in player data (x,y,t,g) and returns a list of areas they visit in that data set
	grid_size_x = (xmax-xmin)/num_box
	grid_size_y = (ymax-ymin)/num_box

	x = [math.floor((i[0]-xmin)/grid_size_x) for i in state[0][hero_name]]
	y = [math.floor((i[1]-ymin)/grid_size_y) for i in state[0][hero_name]]

	area_state =[]
	for k in range(0,len(x)):
		i = num_box-1-int(y[k])
		j = int(x[k])
		area_state.append(area_matrix[i][j])
	return area_state


def areaStateSummary2(state,area_state):
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

	heros = match.heros
	normal_namespace = match.parameters["namespace"]["normal_namespace"]
	k=0

	for key in heros:
		area_state = assignPlayerArea2(match,key,state,area_matrix)
		summary = areaStateSummary2(state,area_state)
		#create events from summary of the areas the hero has visited
		for i in range(1,len(summary[0])-1): #the first and last elements contain strings so we don't consider them
			location = summary_to_events_mapping[summary[0][i]]
			time_start = summary[1][i][0]
			time_end = time_start + summary[1][i][1]
			involved = [heros[key]["hero_id"]]
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
	events_input_filename = match.events_input_filename
	heros = match.heros

	prior_timestamp = math.floor(pregame_start_time - match_start_time)

	hero_gold = {}
	hero_xp = {}
	for key in heros:
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

	f = open(events_input_filename,'rb')
	reader = csv.reader(f)

	for i, row in enumerate(reader):
		absolute_time = float(row[0])
		timestamp = absolute_time-match_start_time
		if (absolute_time >= pregame_start_time) and (absolute_time <= match_end_time):
			if row[1]=="DOTA_COMBATLOG_XP":
				receiver = row[2] 
				split_receiver_string = receiver.split("_")
				hero_name_list =split_receiver_string[3:]
				s = "_"
				hero_name = s.join(hero_name_list)
				xp_amount = int(float(row[3]))
				hero_xp[hero_name].append([xp_amount,timestamp]) 
				side = heros[hero_name]["side"]
				if side == "radiant":
					#increment radiant xp
					radiant_xp_total = radiant_xp_total + xp_amount
				elif side == "dire":
					dire_xp_total = dire_xp_total + xp_amount
			# for each row check if some Gold was recieved or lost
			elif row[1]=="DOTA_COMBATLOG_GOLD":
				receiver = row[2] 
				split_receiver_string = receiver.split("_")
				hero_name_list =split_receiver_string[3:]
				s = "_"
				hero_name = s.join(hero_name_list)
				gold_amount = int(float(row[4]))
				side = heros[hero_name]["side"]
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
# fight: one or more heros doing damage to another hero on the opposite team with total damage greater
# than x percentage of the total hp at the start of the fight (first hero to hero damage)
#######################################################################################################


class Attack:

	def __init__(self,attacker,victim,damage,v,t):
		self.attacker = attacker
		self.victim = victim
		self.damage = damage
		self.v = v
		self.t = t

def fightDistMetric(attack1,attack2,radius,w_space1,w_space2,w_time):

	r = math.sqrt((attack1.v[0]-attack2.v[0])**2+(attack1.v[1]-attack2.v[1])**2)

	if r < radius:
		w_space = w_space1
	else:
		w_space = w_space2

	dist = w_space*r + w_time*(math.sqrt((attack1.t-attack2.t)**2)) 
	return dist


def makeAttackList(match,state):

	damage_total = 0
	damage_log = []
	attack_list =[]

	heros = match.heros
	events_input_filename = match.events_input_filename
	pregame_start_time = match.pregame_start_time
	match_start_time = match.match_start_time
	match_end_time = match.match_end_time
	prior_timestamp = math.floor(pregame_start_time - match_start_time)
	bin_size = match.parameters["makeAttackList"]["bin_size"]

	f = open(events_input_filename,'rb')
	reader = csv.reader(f)


	for i, row in enumerate(reader):
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
			if row[1]=="DOTA_COMBATLOG_DAMAGE" and row[2]!="null":
				# now check if the damage was between two heros 
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
						attacker_side = heros[attacker_name]["side"]
						#now for the victim_name
						victim_name = s.join(victim_name_list)
						victim_side = heros[victim_name]["side"]
						shifted_time = [(t-timestamp)**2 for t in state[1]]
						index = np.argmin(shifted_time)
						damage_total = damage_total + float(row[5])

						new_attack = Attack(attacker_name,victim_name,float(row[5]),state[0][attacker_name][index],timestamp)
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

def evaluateFightList(match,attack_list,A):

	#alpha = 150
	#kappa = 0.15  # based on 150 + kappa*t = 500 damage for a 2400 second long match
	#time_threshold = 2

	alpha = match.parameters["evaluateFightList"]["alpha"]
	kappa = match.parameters["evaluateFightList"]["kappa"]
	time_threshold = match.parameters["evaluateFightList"]["time_threshold"]

	fight_list = []
	pregame_start_time = match.pregame_start_time
	match_start_time = match.match_start_time
	match_end_time = match.match_end_time
	fights_namespace = match.parameters["namespace"]["fights_namespace"]
	heros = match.heros
	k=0
	#find the connected components of the graph
	n_components, labels = scipy.sparse.csgraph.connected_components(A, directed=False, return_labels=True)

	#for each fight make a list of attacks
	for i in range(0,n_components):
		fight_list.append([attack_list[j] for j, x in enumerate(labels) if x ==i ])

	for fight in fight_list:
		position_x = []
		position_y = []
		involved =set([])
		time_start = match_end_time
		time_end = pregame_start_time - match_start_time
		total_damage = 0
		for attack in fight:
			id1 = heros[attack.attacker]["hero_id"]
			id1_set = set([id1])
			id2 = heros[attack.victim]["hero_id"]
			id2_set = set([id2])
			involved.update(id1_set)
			involved.update(id2_set)
			total_damage = total_damage + attack.damage
			time_start = min(time_start,attack.t)
			time_end = max(time_end,attack.t)
			position_x.append(attack.v[0])
			position_y.append(attack.v[1])
		mean_position = [sum(position_x)/len(position_x),sum(position_y)/len(position_y)]
		involved = list(involved)
		damage_threshold = alpha + kappa*time_start
		# fight evaluation
		if (total_damage > damage_threshold + kappa*time_start) and (time_end-time_start > time_threshold):
			id_num = fights_namespace + k
			location = lookUpLocation(match,area_matrix,mean_position)
			events[id_num] = {"type":"fight","involved":involved,"time-start":time_start,"time-end":time_end,"intensity":"battle","location":location}
			k=k+1

###################################################################################


def main():
	match_id = sys.argv[1]
	out_file = sys.argv[2]
    header_file = sys.argv[3]
	logging.basicConfig(filename="parsedReplays/"+str(match_id)+'/logfile.log',level=logging.DEBUG)
	match = Match(match_id, out_file)
	match.matchInfo()
	header = headerInfo(match)
	hero_deaths = killsInfo(match)
	state = heroPositions(match)  #[[v_mat],t_vec]
	entities = heroTrajectories(match,state,hero_deaths)
	eventsMapping(match,state,area_matrix)
	timeseries = goldXPInfo(match) #up to this point takes a few seconds
	attack_list = makeAttackList(match,state)
	A = formAdjacencyMatrix(match,attack_list)
	evaluateFightList(match,attack_list,A)

	data_to_write = {"header":header,"entities":entities,"events":events,"timeseries":timeseries}
	g = open(match.output_filename,'wb')
	g.write(json.dumps(data_to_write, sort_keys=False,indent=4, separators=(',', ': ')))	
	g.close()
	h = open(header_file,'wb')
	h.write(json.dumps(header, sort_keys=False,indent=4, separators=(',', ': ')))	
	h.close()
	#check for errors in the Json file (optional)
	with open(match.output_filename) as data_file:    
		data = json.load(data_file)

if __name__ == "__main__":
    main()


# #graphAttacks(attack_list,1590,1605)

# #graphFights(attack_list,A,1590,1605)


################################################################################################


