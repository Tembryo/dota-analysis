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
	if row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "5":
		match_start_time = math.floor(float(row[0]))
	elif row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "6":
		match_end_time  = math.floor(float(row[0]))

print match_start_time

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
			# now form a dictionary to s
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
	padded_death_list = [0]
	padded_death_list[1:] = hero_deaths[key]
	padded_death_list.append(match_end_time)
	hero_deaths_appended[key] = padded_death_list

#extract position data for each time step and store it in v_mat 
#e.g., v_mat["spirit_breaker"] = [[150,200],[152,201],..]
# v =[x,y]

v_mat = {"spirit_breaker":[],"queenofpain":[],"antimage":[],"dazzle":[],"dark_seer":[],\
"undying":[],"witch_doctor":[],"necrolyte":[],"tusk":[],"alchemist":[]}

t_vec = []

Col_per_player = 3
Num_Players = 10

e = open(position_input_filename,'rb')
reader = csv.reader(e)

Step =300  #Step size of 300 gives samples of roughly 5 second intervals
for i, row in enumerate(reader):
	if (i>0) and (i % Step==0):
		tmp_time = float(row[Col_per_player*Num_Players])-match_start_time
		if tmp_time > 0:
			t_vec.append(tmp_time)
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

#############################################
# extract jungling, laning, fountain-visit
#############################################

# this reuses old code from area_assignment and should be removed/rewritten at some point

def readPlayerData(replay,player,t0,N,Step):
	#takes in a replay object and read the x,y,t coordiantes of player p from the csv file called replay.filename. 
	replay_data = open(replay.filename,'rb')
	reader = csv.reader(replay_data)

	x = []
	y = []
	t = []
	g = []

	for i, row in enumerate(reader):
		if (i >=t0) and (i <= t0+N) and (i % Step==0):
			x.append(float(row[replay.Col_per_player*(player-1)+1]))
			y.append(float(row[replay.Col_per_player*(player-1)+2]))
			t.append(float(row[replay.Col_per_player*replay.Num_Players]))
			g.append(float(row[replay.Col_per_player*(player-1)]))

	replay_data.close()
	return x, y, t, g

def assignPlayerArea(replay,player_data,area_matrix):
	#takes in player data (x,y,t,g) and returns a list of areas they visit in that data set
	grid_size_x = (replay.xmax-replay.xmin)/replay.Num_Box
	grid_size_y = (replay.ymax-replay.ymin)/replay.Num_Box
	x = [math.floor((i-replay.xmin)/grid_size_x) for i in player_data[0]]
	y = [math.floor((i-replay.ymin)/grid_size_y) for i in player_data[1]]

	area_state =[]
	for k in range(0,len(x)):
		i = replay.Num_Box-1-int(y[k])
		j = int(x[k])
		area_state.append(area_matrix[i][j])
	return area_state

def areaStateSummary(player_data,area_state):
	#make two arrays that store the area visited and the time that area was first visited
	#the time is stored as an integer with second precision.
	area_state_summary =["start"]
	t= player_data[2]
	area_state_times = [[int(math.floor(t[0])),"x"]] #the string "x" is to denote an as yet unknown duration 

	for k in range(0,len(t)):
 		elem = area_state[k]
 		if elem!=0 and elem!=area_state_summary[-1]:
 			area_state_summary.append(elem)
 			tk = int(math.floor(t[k]))
 			tj = area_state_times[-1][0]
 			area_state_times[-1][1]=tk-tj
 			area_state_times.append([tk,"x"])
		k=k+1
	return area_state_summary,area_state_times


player_data = readPlayerData(replay,5,20000,50000,10)
#print player1data[1]

area_state = assignPlayerArea(replay,player_data,area_matrix)
#print area_state

summary = areaStateSummary(player_data,area_state)
print summary

# map = MapPlot("minimap_annotated_ver2.png")
# map.mapAreaLabel(areas)
# map.mapPlayerTrack(player_data)

summary_to_events_mapping = {"RS":"radiant-secret","DS":"dire-secret","RJ":"radiant-jungle","DJ":"dire-jungle","T1":"toplane-between-radiant-t2-t3","T2":"toplane-between-radiant-t1-t2","T3":"toplane-between-t1s", \
"T4":"toplane-between-dire-t1-t2","T5":"toplane-between-dire-t2-t3","M1":"midlane-radiant-between-t2-t3","M2":"midlane-radiant-between-t1-t2",\
"M3":"midlane-between-t1s","M4":"midlane-dire-between-t1-t2","M5":"midlane-dire-between-t2-t3","RB":"radiant-base","DB":"dire-base",\
"BR":"bottom-rune","TR":"top-rune","RH":"roshan","RA":"radiant-ancient","DA":"dire-ancient"}

normal_namespace = 12000
k=0
#create events from summary of the areas the player has visited
for i in range(1,len(summary[0])):
	if (summary[0][i]=="T1") or (summary[0][i]=="T2") or (summary[0][i]=="T4") or (summary[0][i]=="T4") or (summary[0][i]=="T5"):
		type = "laning"
		location = summary_to_events_mapping[summary[0][i]]
		time_start = summary[1][i][0]
		time_end = time_start + summary[1][i][1]
		involved = hero_id[hero_name]
		id_num = normal_namespace + k
		new_event = {"type":type,"location":location,"time-start":time_start,"time-end":time_end,"involved":involved}
		events[id_num] = new_event
		k=k+1
	elif (summary[0][i]=="M1") or (summary[0][i]=="M2") or (summary[0][i]=="M3")  or (summary[0][i]=="M4") or (summary[0][i]=="M5"):
		type = "laning"
		location = summary_to_events_mapping[summary[0][i]]
		time_start = summary[1][i][0]
		time_end = time_start + summary[1][i][1]
		involved = hero_id[hero_name]
		id_num = normal_namespace + k
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

gold_samples = [{"t": -90, 	"v": [0]},\
    		{"t": -60, 	"v": [0]}] 

exp_samples = [
				{"t": -90, 	"v": [0]},\
				{"t": -60, 	"v": [0]},]	
timeseries = {"gold-advantage":{"format":"samples","samples":gold_samples},"exp-advantage":{"format":"samples","samples":exp_samples}}

########################################################
# form the dictionary and write the data to a json file
#######################################################

#data_to_write = {"header":header,"entities":entities,"events":events,"timeseries":timeseries}
data_to_write = {"header":header,"events":events,"timeseries":timeseries}

g.write(json.dumps(data_to_write, sort_keys=False,indent=4, separators=(',', ': ')))

e.close()
f.close()
g.close()

with open(output_filename) as data_file:    
    data = json.load(data_file)








