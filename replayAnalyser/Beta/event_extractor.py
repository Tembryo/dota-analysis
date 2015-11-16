import csv
import json
import math
from dota2_area_boxes_ver2 import area_matrix, areas
from area_assignment import Dota2Replay, readPlayerData, assignPlayerArea, areaStateSummary

position_input_filename = "replay_data.csv"
events_input_filename = "events_replay_data.csv"
output_filename = "test.json"

#open up the files

e = open(position_input_filename,'rb')
position_reader = csv.reader(e)

f = open(events_input_filename,'rb')
events_reader = csv.reader(f)

g = open(output_filename,'wb')

# count the number of rows

row_count1 = sum(1 for row in position_reader)
print row_count1

#extract position data and areas for each hero

areas_dict = {}
for i in range(1,2):
	replay = Dota2Replay(position_input_filename)
	player_data = readPlayerData(replay,i,100000,row_count1,10)
	area_state = assignPlayerArea(replay,player_data,area_matrix)
	summary = areaStateSummary(player_data,area_state)
	player_summary = {"areas":summary[0],"times":summary[1]}
	areas_dict[i] = player_summary
e.close()

# start of the analysis

data_list =[]

# note that the clarity extractor has a different naming convention for several of the heros
heros = {"spirit_breaker":"radiant","queenofpain":"radiant", "antimage":"radiant","dazzle":"radiant","dark_seer":"radiant", \
"undying":"dire","witch_doctor":"dire","necrolyte":"dire","tusk": "dire", "alchemist":"dire"}
teams = {0:{"side":"radiant","name":"empty","short":"empty"},1:{"side":"dire","name":"empty","short":"empty"}}
players = {0:{"name":"a"},1:{"name":"b"},2:{"name":"b"},3:{"name":"a"},4:{"name":"b"},5:{"name":"b"},6:{"name":"a"},7:{"name":"b"},8:{"name":"b"},9:{"name":"b"}}

# extract data needed for header
for i, row in enumerate(events_reader):
	if row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "5":
		match_time_start = math.floor(float(row[0]))
	elif row[1] == "DOTA_COMBATLOG_GAME_STATE" and row[2] == "6":
		match_time_end  = math.floor(float(row[0]))

# calculate the length of the match (time between states 5 and 6)
total_match_time = match_time_end- match_time_start 
# form the header
header = {"id":0,"draft": {},"length":total_match_time ,"teams":teams,"players":players}


#make a dictionary containing each hero as a key, and a list of the times they died as the value
hero_deaths = {"spirit_breaker":[],"queenofpain":[], "antimage":[],"dazzle":[],"dark_seer":[], \
"undying":[],"witch_doctor":[],"necrolyte":[],"tusk":[], "alchemist":[]}

f = open(events_input_filename,'rb')
events_reader = csv.reader(f)
# extract the kill events
kills_namespace =10000
events ={}
k=0
for i, row in enumerate(events_reader):
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
			death_time = math.floor(float(row[0])) - match_time_start 
			new_event = {"type":"kill","time": death_time,"team":side}
			events[str(id_num)] = new_event
			# add death to the appropriate list in the hero_deaths dictionary
			hero_deaths[hero_name].append(death_time)
			k=k+1


# extract the data needed for the entities 
Step = 10


padded_death_list = [0]
padded_death_list[1:] = hero_deaths["spirit_breaker"]
padded_death_list.append(match_time_end)

position_sample_list =[]
trajectory_list = []

k=1
for i, row in enumerate(player_data):
	if (i % Step==0):
		print padded_death_list[k]
		print row[2]
		if row[2] > padded_death_list[k]:
			#trajectory = {"time-start":padded_death_list[k-1], "time-end": padded_death_list[k],{"timeseries":{"format":"samples","samples":position_sample_list}}}
			trajectory = {"time-start":padded_death_list[k-1]}
			print trajectory
			trajectory_list.append(trajectory)
			k=k+1
		else: 
			position_sample = {"t":row[2],"v":[row[0],row[1]]}
			position_sample_list.append(position_sample)




hero_position = position_sample_list
hero_data = {"unit":"spirit-breaker","team": "radiant","control": 0,"position":hero_position}


# extract gold and exp time series

gold_samples = [{"t": -90, 	"v": [0]},\
    		{"t": -60, 	"v": [0]}] 

exp_samples = [
				{"t": -90, 	"v": [0]},\
				{"t": -60, 	"v": [0]},]	
timeseries = {"gold-advantage":{"format":"samples","samples":gold_samples},"exp-advantage":{"format":"samples","samples":exp_samples}}

# form the dictionary and write the data to a json file

data_to_write = {"header":header,"events":events,"timeseries":timeseries}

g.write(json.dumps(data_to_write, sort_keys=False,indent=4, separators=(',', ': ')))

f.close()
g.close()

with open(output_filename) as data_file:    
    data = json.load(data_file)