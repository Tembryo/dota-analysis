import csv
import json
import math
from dota2_area_boxes_ver2 import area_matrix, areas

position_input_filename = "replay_data.csv"
events_input_filename = "events_replay_data.csv"
output_filename = "test2.json"

#open up the files

f = open(events_input_filename,'rb')
events_reader = csv.reader(f)

g = open(output_filename,'wb')

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

data_to_write = {"header":header,"entities":entities,"events":events,"timeseries":timeseries}

g.write(json.dumps(data_to_write, sort_keys=False,indent=4, separators=(',', ': ')))

e.close()
f.close()
g.close()

with open(output_filename) as data_file:    
    data = json.load(data_file)








