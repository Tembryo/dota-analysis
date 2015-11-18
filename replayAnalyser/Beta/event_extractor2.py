import csv
import json
import math
from dota2_area_boxes_ver2 import area_matrix, areas
from area_assignment import MapPlot

position_input_filename = "replay_data.csv"
events_input_filename = "events_replay_data.csv"
output_filename = "test2.json"

# create a replay object

class Dota2Replay:

	def __init__(self,filename):
		#filename should be a string of the form "filename.csv"
		self.filename = filename
		self.replay_type = "Dota2"
		self.Num_Players = 10
		self.Col_per_player= 3
		self.xmin = -8200
		self.xmax = 8000.0
		self.ymin = -8200.0
		self.ymax = 8000.0
		self.Num_Box = 32

replay = Dota2Replay(position_input_filename)

#open up the files

e = open(replay.filename,'rb')
position_reader = csv.reader(e)

f = open(events_input_filename,'rb')
events_reader = csv.reader(f)

g = open(output_filename,'wb')


#count the number of rows in the position file

row_count = sum(1 for row in position_reader)
print row_count


###############################
# set up some initial variables
###############################

heros = {"spirit_breaker":"radiant","queenofpain":"radiant", "antimage":"radiant","dazzle":"radiant","dark_seer":"radiant", \
"undying":"dire","witch_doctor":"dire","necrolyte":"dire","tusk": "dire", "alchemist":"dire"}
teams = {0:{"side":"radiant","name":"empty","short":"empty"},1:{"side":"dire","name":"empty","short":"empty"}}
players = {0:{"name":"a"},1:{"name":"b"},2:{"name":"b"},3:{"name":"a"},4:{"name":"b"},5:{"name":"b"},6:{"name":"a"},7:{"name":"b"},8:{"name":"b"},9:{"name":"b"}}
hero_indexes = {"spirit_breaker":0,"queenofpain":1, "antimage":2,"dazzle":3,"dark_seer":4, \
"undying":5,"witch_doctor":6,"necrolyte":7,"tusk": 8, "alchemist":9}
hero_id = {"spirit_breaker":100,"queenofpain":101, "antimage":102,"dazzle":103,"dark_seer":104, \
"undying":105,"witch_doctor":106,"necrolyte":107,"tusk": 108, "alchemist":109}


################################
# extract data needed for header
###############################

for i, row in enumerate(events_reader):
	if row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "4":
		pregame_start_time = math.floor(float(row[0]))
	elif row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "5":
		match_start_time = math.floor(float(row[0]))
	elif row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "6":
		match_end_time  = math.floor(float(row[0]))

# calculate the length of the match (time between states 5 and 6)
total_match_time = match_end_time- match_start_time 

# form the header
header = {"id":0,"draft": {},"length":total_match_time ,"teams":teams,"players":players}

###########################################################
# extract the kill events and the times when each hero dies
###########################################################

#make a dictionary containing each hero as a key, and a list of the times they died as the value
hero_deaths = {"spirit_breaker":[],"queenofpain":[], "antimage":[],"dazzle":[],"dark_seer":[], \
"undying":[],"witch_doctor":[],"necrolyte":[],"tusk":[], "alchemist":[]}

f = open(events_input_filename,'rb')
reader = csv.reader(f)

kills_namespace =10000
events ={}
k=0
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
			side = heros[hero_name]
			# now form a dictionary 
			id_num = kills_namespace+k
			death_time = math.floor(float(row[0])) - match_start_time 
			new_event = {"type":"kill","time": death_time,"team":side}
			# put kill event in the events dictionary
			events[str(id_num)] = new_event
			# add death to the appropriate list in the hero_deaths dictionary
			hero_deaths[hero_name].append(death_time)
			k=k+1

#########################################
# extract the trajectories for each hero
#########################################

hero_deaths_appended = {}
for key in heros:
	padded_death_list = [-pregame_start_time]
	padded_death_list[1:] = hero_deaths[key]
	padded_death_list.append(match_end_time)
	hero_deaths_appended[key] = padded_death_list

#extract position data at 5 second intervals for each time step after the state 4 transistion
# with the time shifted so that 0 corresponds to the state 5 transtion and store it in v_mat 
#e.g., v_mat["spirit_breaker"] = [[150,200],[152,201],..]

v_mat = {"spirit_breaker":[],"queenofpain":[],"antimage":[],"dazzle":[],"dark_seer":[],\
"undying":[],"witch_doctor":[],"necrolyte":[],"tusk":[],"alchemist":[]}

t_vec = []

Col_per_player = 3
Num_Players = 10

e = open(position_input_filename,'rb')
reader = csv.reader(e)

Step = 10  #Step size of 300 gives samples of roughly 5 second intervals
for i, row in enumerate(reader):
	if (i>0) and (i % Step==0):
		tmp_time = float(row[Col_per_player*Num_Players])-pregame_start_time
		# if the time stamp is after the state 4 transition
		if tmp_time > 0:
			# append that time point to the time vector with the state 5 transition point set to equal zero
			t_vec.append(tmp_time + pregame_start_time - match_start_time)
			# and for each hero extract the [x,y] coordinate for that time point
			for key in hero_indexes:
				v_mat[key].append([float(row[Col_per_player*hero_indexes[key]+1]),float(row[Col_per_player*hero_indexes[key]+2])])

# makde a dictionary where each hero name is associated with a list of trajectories 
hero_trajectories = {"spirit_breaker":[],"queenofpain":[], "antimage":[],"dazzle":[],"dark_seer":[], \
"undying":[],"witch_doctor":[],"necrolyte":[],"tusk":[], "alchemist":[]}

entities = {}
#for each hero
for key in heros:
	tmp_list = []
	# look up the (appended) list of times in which they died
	death_time_list = hero_deaths_appended[key]
	# for each entry in the list of times in which they died up to the penultimate entry
 	for i in range(0,len(death_time_list)-1):
 		# for each time period between deaths make a list of dictionaries that are the samples between those times
 		samples_list =[{"t":t,"v":v_mat[key][j]} for j, t in enumerate(t_vec) if (t > death_time_list[i]) and (t <= death_time_list[i+1])]
		trajectory = {"time-start":samples_list[0]["t"],"time-end":samples_list[-1]["t"],"timeseries":{"format":"samples","samples":samples_list}}	
		tmp_list.append(trajectory)
	entities[hero_id[key]] = {"unit":key,"team": heros[key],"control":hero_indexes[key],"position":tmp_list}

#################################################################
# extract normal events such as jungling, laning, fountain-visit
################################################################

normal_namespace = 12000

summary_to_events_mapping = {"RS":"radiant-secret","DS":"dire-secret","RJ":"radiant-jungle","DJ":"dire-jungle","T1":"toplane-between-radiant-t2-t3","T2":"toplane-between-radiant-t1-t2","T3":"toplane-between-t1s", \
"T4":"toplane-between-dire-t1-t2","T5":"toplane-between-dire-t2-t3","M1":"midlane-radiant-between-t2-t3","M2":"midlane-radiant-between-t1-t2",\
"M3":"midlane-between-t1s","M4":"midlane-dire-between-t1-t2","M5":"midlane-dire-between-t2-t3",\
"B1":"botlane-radiant-between-t2-t3","B2":"botlane-radiant-between-t1-t2","B3":"botlane-between-t1s","B4":"botlane-dire-between-t1-t2","B5":"botlane-dire-between-t2-t3","RB":"radiant-base","DB":"dire-base",\
"BR":"bottom-rune","TR":"top-rune","RH":"roshan","RA":"radiant-ancient","DA":"dire-ancient"}

# this reuses and modifies some old code from area_assignment and should probably be removed/rewritten at some point

def assignPlayerArea2(replay,hero_name,v_mat,t_vec,area_matrix):
	#takes in player data (x,y,t,g) and returns a list of areas they visit in that data set
	grid_size_x = (replay.xmax-replay.xmin)/replay.Num_Box
	grid_size_y = (replay.ymax-replay.ymin)/replay.Num_Box
	x = [math.floor((i[0]-replay.xmin)/grid_size_x) for i in v_mat[hero_name]]
	y = [math.floor((i[1]-replay.ymin)/grid_size_y) for i in v_mat[hero_name]]

	area_state =[]
	for k in range(0,len(x)):
		i = replay.Num_Box-1-int(y[k])
		j = int(x[k])
		area_state.append(area_matrix[i][j])
	return area_state


def areaStateSummary2(t_vec,area_state):
	#make two arrays that store the area visited and the time that area was first visited
	#the time is stored as an integer with second precision.
	area_state_summary =["start"]
	area_state_times = [[int(math.floor(t_vec[0])),"x"]] #the string "x" is to denote an as yet unknown duration 

	for k in range(0,len(t_vec)):
 		elem = area_state[k]
 		if elem!=0 and elem!=area_state_summary[-1]:
 			area_state_summary.append(elem)
 			tk = int(math.floor(t_vec[k]))
 			tj = area_state_times[-1][0]
 			area_state_times[-1][1]=tk-tj
 			area_state_times.append([tk,"x"])
		k=k+1
	return area_state_summary,area_state_times

k=0
for key in hero_id:
	area_state = assignPlayerArea2(replay,key,v_mat,t_vec,area_matrix)
	summary = areaStateSummary2(t_vec,area_state)
	#create events from summary of the areas the hero has visited
	for i in range(1,len(summary[0])-1): #the first and last elements contain strings so we don't consider them
		location = summary_to_events_mapping[summary[0][i]]
		time_start = summary[1][i][0]
		time_end = time_start + summary[1][i][1]
		involved = [hero_id[key]]
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

######################################################################################################
# extract the fight events
# fight: one or more heros doing damage to another hero on the opposite team with total damage greater
# than x percentage of the total hp at the start of the fight (first hero to hero damage)
#######################################################################################################


f = open(events_input_filename,'rb')
reader = csv.reader(f)

fights_namespace =11000
k=0
for i, row in enumerate(reader):
	# for each row check if some damage occured (if a non-hero character dies sometimes you get null in row[2])
	if row[1]=="DOTA_COMBATLOG_DAMAGE" and row[2]!="null":
		# now check if the damage was between two heros
		attacker = row[2] 
		split_attacker_string = attacker.split("_")
		victim = row[3] 
		split_victim_string = victim.split("_")
		if (split_attacker_string[2] == "hero") and (split_victim_string[2] == "hero"):
			#record the time that the damage occured
			time_start = row[0]


##################################
# extract gold and exp time series
##################################

# make dictionaries to keep the gold and xp for each hero
hero_gold = {}
hero_xp = {}
hero_cumulative_gold ={}
hero_cumulative_xp = {}
for key in heros:
	hero_gold[key] = []	
	hero_xp[key] = []
	hero_cumulative_gold[key] = []
	hero_cumulative_xp[key] =[]

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

xp_difference_total = 0
gold_difference_total = 0

prior_timestamp = pregame_start_time
flag =0
for i, row in enumerate(reader):
	absolute_time  = float(row[0])
	timestamp = absolute_time-match_start_time
	if  (absolute_time-pregame_start_time > 0) and (absolute_time <= match_end_time):
		if row[1]=="DOTA_COMBATLOG_XP":
			receiver = row[2] 
			split_receiver_string = receiver.split("_")
			hero_name_list =split_receiver_string[3:]
			s = "_"
			hero_name = s.join(hero_name_list)
			xp_amount = int(float(row[3]))
			hero_xp[hero_name].append([xp_amount,timestamp]) 
			side = heros[hero_name]
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
			side = heros[hero_name]
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
		elif timestamp!=prior_timestamp:
			#update the xp_difference vector
			xp_difference.append([radiant_xp_total - dire_xp_total,timestamp])
			gold_difference.append([radiant_gold_total - dire_gold_total,timestamp])
			prior_timestamp = timestamp

for key in heros:
	total = 0
	for v in hero_xp[key]:
		total = total + v[0]
		hero_cumulative_xp[key].append([total,v[1]]) 
	total = 0
	for v in hero_gold[key]:
		total = total + v[0]
		hero_cumulative_gold[key].append([total,v[1]]) 


gold_samples = [{"t": x[1],"v":[x[0]]} for x in gold_difference]

exp_samples = [{"t": x[1],"v":[x[0]]} for x in xp_difference]

timeseries = {"gold-advantage":{"format":"samples","samples":gold_samples},"exp-advantage":{"format":"samples","samples":exp_samples}}

########################################################
# form the dictionary and write the data to a json file
#######################################################

data_to_write = {"header":header,"entities":entities,"events":events,"timeseries":timeseries}

g.write(json.dumps(data_to_write, sort_keys=False,indent=4, separators=(',', ': ')))

e.close()
f.close()
g.close()

with open(output_filename) as data_file:    
    data = json.load(data_file)








