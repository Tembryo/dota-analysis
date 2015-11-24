import csv
import json
import math
import re
import numpy as np
import scipy.sparse 
from mpl_toolkits.mplot3d import Axes3D
import matplotlib.pyplot as plt
from dota2_area_boxes_ver2 import area_matrix, areas

events = {}

class Match:

	def __init__(self,match_id,position_input_filename,events_input_filename,output_filename):
		self.match_id = match_id
		self.position_input_filename = position_input_filename
		self.events_input_filename = events_input_filename
		self.output_filename = output_filename
		self.kills_namespace = 10000
		self.normal_namespace = 11000
		self.fights_namespace = 12000
		self.col_per_player = 3
		self.num_players = 10
		self.sample_step_size = 150
		self.xmin = -8200
		self.xmax = 8000.0
		self.ymin = -8200.0
		self.ymax = 8000.0
		self.num_box = 32

	def matchInfo(self):

		# extract the match info from the files

		f = open(self.events_input_filename,'rb')
		events_reader = csv.reader(f)

		teams = {0:{"side":"radiant","name":"empty","short":"empty"},1:{"side":"dire","name":"empty","short":"empty"}}
		players = {0:{"name":"a"},1:{"name":"b"},2:{"name":"b"},3:{"name":"a"},4:{"name":"b"},5:{"name":"b"},6:{"name":"a"},7:{"name":"b"},8:{"name":"b"},9:{"name":"b"}}
		heros = {"spirit_breaker":{"side":"radiant","index":0,"hero_id":100},"queenofpain":{"side":"radiant","index":1,"hero_id":101},"antimage":{"side":"radiant","index":2,"hero_id":102},"dazzle":{"side":"radiant","index":3,"hero_id":103},"dark_seer":{"side":"radiant","index":4,"hero_id":104},\
		"undying":{"side":"dire","index":5,"hero_id":105},"witch_doctor":{"side":"dire","index":6,"hero_id":106},"necrolyte":{"side":"dire","index":7,"hero_id":107},"tusk":{"side":"dire","index":8,"hero_id":108},"alchemist":{"side":"dire","index":9,"hero_id":109}}


		for i, row in enumerate(events_reader):
			if row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "4":
				pregame_start_time = math.floor(float(row[0]))
			elif row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "5":
				match_start_time = math.floor(float(row[0]))
			elif row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "6":
				match_end_time  = math.floor(float(row[0]))

		# calculate the length of the match (time between states 5 and 6)

		match.teams = teams
		match.players = players
		match.heros = heros
		match.pregame_start_time = pregame_start_time
		match.match_start_time = match_start_time
		match.match_end_time = match_end_time
		match.total_match_time = match_end_time - match_start_time 

def headerInfo(match):

	# form the header
	header = {"id":match.match_id,"draft": {},"length":match.total_match_time ,"teams":match.teams,"players":match.players}

	return header

#############################################################################################

def killsInfo(match):

	k=0
	hero_deaths = {}
	heros = match.heros
	match_start_time = match.match_start_time
	kills_namespace = match.kills_namespace
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
				hero_name_list =split_deceased_string[3:]
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

	v_mat = {}
	t_vec = []
	heros = match.heros
	col_per_player = match.col_per_player
	num_players = match.num_players
	position_input_filename  = match.position_input_filename
	sample_step_size = match.sample_step_size
	match_start_time = match.match_start_time
	pregame_start_time = match.pregame_start_time

	for key in heros:
		v_mat[key] = []

	e = open(position_input_filename,'rb')
	reader = csv.reader(e)

	for i, row in enumerate(reader):
		if (i % sample_step_size==0) and (i > 0):
			# if the time stamp is after the state 4 transition
			tmp_time = float(row[col_per_player*num_players])-pregame_start_time
			if (tmp_time > 0):
				# append that time point to the time vector with the state 5 transition point set to equal zero
				t_vec.append(tmp_time + pregame_start_time - match_start_time)
				# and for each hero extract the [x,y] coordinate for that time point
				for key in heros:
					v_mat[key].append([float(row[col_per_player*heros[key]["index"]+1]),float(row[col_per_player*heros[key]["index"]+2])])

	return v_mat, t_vec

#####################
# hero trajectories #
#####################

def heroTrajectories(match,state,hero_deaths):

	entities = {}
	pregame_start_time = match.match_start_time
	match_end_time = match.match_end_time
	heros = match.heros
	#make a dictionary where each hero name is associated with a list of trajectories 
	hero_trajectories ={}
	for key in heros:
		hero_trajectories[key] = []

	hero_deaths_appended = {}
	for key in heros:
		padded_death_list = [-pregame_start_time]
		padded_death_list[1:] = hero_deaths[key]
		padded_death_list.append(match_end_time)
		hero_deaths_appended[key] = padded_death_list

	#for each hero
	for key in heros:
		tmp_list = []
		# look up the (appended) list of times in which they died
		death_time_list = hero_deaths_appended[key]
		# for each entry in the list of times in which they died up to the penultimate entry
	 	for i in range(0,len(death_time_list)-1):
	 		# for each time period between deaths make a list of dictionaries that are the samples between those times
	 		samples_list =[{"t":t,"v":state[0][key][j]} for j, t in enumerate(state[1]) if (t > death_time_list[i]) and (t <= death_time_list[i+1])]
			trajectory = {"time-start":samples_list[0]["t"],"time-end":samples_list[-1]["t"],"timeseries":{"format":"samples","samples":samples_list}}	
			tmp_list.append(trajectory)
		entities[heros[key]["hero_id"]] = {"unit":key,"team": heros[key]["side"],"control":heros[key]["index"],"position":tmp_list}

	return entities

##########################################################################################################
#                                       extract normal events
##########################################################################################################

# this reuses and modifies some old code from area_assignment and should probably be removed/rewritten at some point

def assignPlayerArea2(match,hero_name,state,area_matrix):

	xmax = match.xmax
	xmin = match.xmin
	ymax = match.ymax
	ymin = match.ymin
	num_box = match.num_box

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
	normal_namespace = match.normal_namespace
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

	bin_size = 2
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
					print "unknown gold status - was expecting 'receives or looses' but got:" + row[3]
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
	
	bin_size = 1

	damage_total = 0
	damage_log = []
	attack_list =[]

	heros = match.heros
	events_input_filename = match.events_input_filename
	pregame_start_time = match.pregame_start_time
	match_start_time = match.match_start_time
	match_end_time = match.match_end_time
	prior_timestamp = math.floor(pregame_start_time - match_start_time)

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

	fig = plt.figure()
	ax = fig.add_subplot(111, projection='3d')

	for attack in attack_list:	
		if (attack.t >= time_start) and (attack.t <= time_end): 
			xs = attack.v[0]
			ys = attack.v[1]
			zs = attack.t
			if attack.damage > 50:
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

def formAdjacencyMatrix(attack_list):

	threshold = 300 # picked by trial and error
	radius = 1500  #maximum spell range
	w_space1 = 0.02
	w_space2 = 0.3
	w_time = 80

	n = len(attack_list)
	A = np.zeros(shape=(n,n))

	for i in range(0,n):
		for j in range(i+1,n):
			d = fightDistMetric(attack_list[i],attack_list[j],radius,w_space1,w_space2,w_time)
			if d < threshold:
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

	xmax = match.xmax
	xmin = match.xmin
	ymax = match.ymax
	ymin = match.ymin
	num_box = match.num_box

	#takes in player data (x,y,t,g) and returns a list of areas they visit in that data set
	grid_size_x = (xmax-xmin)/num_box
	grid_size_y = (ymax-ymin)/num_box

	x = math.floor((v[0]-xmin)/grid_size_x)
	y = math.floor((v[1]-ymin)/grid_size_y)

	i = num_box-1-int(y)
	j = int(x)
	area_state = area_matrix[i][j]
	print area_state

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

		print min_key
		location = summary_to_events_mapping[min_key]
	else:
		location = summary_to_events_mapping[area_state]

	return location

def evaluateFightList(match,attack_list):

	alpha = 150
	kappa = 0.15  # based on 150 + kappa*t = 500 damage for a 2400 second long match
	time_threshold = 2

	fight_list = []
	pregame_start_time = match.pregame_start_time
	match_start_time = match.match_start_time
	match_end_time = match.match_end_time
	fights_namespace = match.fights_namespace
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
		print mean_position
		involved = list(involved)
		damage_threshold = alpha + kappa*time_start
		# fight evaluation
		if (total_damage > damage_threshold + kappa*time_start) and (time_end-time_start > time_threshold):
			id_num = fights_namespace + k
			location = lookUpLocation(match,area_matrix,mean_position)
			print location
			events[id_num] = {"type":"fight","involved":involved,"time-start":time_start,"time-end":time_end,"intensity":"battle","location":location}
			k=k+1


###################################################################################

match = Match(12342,"replay_data.csv","events_replay_data.csv","test3.json")
match.matchInfo()

header = headerInfo(match)

hero_deaths = killsInfo(match)

state = heroPositions(match)  #[[v_mat],t_vec]

entities = heroTrajectories(match,state,hero_deaths)

eventsMapping(match,state,area_matrix)

timeseries = goldXPInfo(match)

attack_list = makeAttackList(match,state)

#graphAttacks(attack_list,1590,1605)

A = formAdjacencyMatrix(attack_list)

#graphFights(attack_list,A,1590,1605)

evaluateFightList(match,attack_list)

#print hero_deaths


################################################################################################


data_to_write = {"header":header,"entities":entities,"events":events,"timeseries":timeseries}


g = open(match.output_filename,'wb')

g.write(json.dumps(data_to_write, sort_keys=False,indent=4, separators=(',', ': ')))
g.close()

with open(match.output_filename) as data_file:    
    data = json.load(data_file)

