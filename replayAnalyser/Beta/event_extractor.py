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

#extract areas for each hero

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

#have to be careful because the clarity extractor has a different naming convention for several of the heros
heros = {"spirit_breaker":"radiant","queenofpain":"radiant", "antimage":"radiant","dazzle":"radiant","dark_seer":"radiant", \
"undying":"dire","witch_doctor":"dire","necrolyte":"dire","tusk": "dire", "alchemist":"dire"}
teams = {0:{"side":"radiant","name":"empty","short":"empty"},1:{"side":"dire","name":"empty","short":"empty"}}
players = {0:{"name":"a"},1:{"name":"b"},2:{"name":"b"},3:{"name":"a"},4:{"name":"b"},5:{"name":"b"},6:{"name":"a"},7:{"name":"b"},8:{"name":"b"},9:{"name":"b"}}

header = {"id":0,"draft": {},"length": 600,"teams":teams,"players":players}

# extract the kill events

kills_namespace =10000
events =[]
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
			new_event = {str(id_num):{"type":"kill","time": math.floor(float(row[0])),"team":side}}	
			events.append(new_event)
			k=k+1

data_to_write = {"header":header,"events":events}

g.write(json.dumps(data_to_write, sort_keys=False,indent=4, separators=(',', ': ')))

f.close()
g.close()

with open(output_filename) as data_file:    
    data = json.load(data_file)