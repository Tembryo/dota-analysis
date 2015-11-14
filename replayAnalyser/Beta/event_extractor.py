import csv
import json

input_filename = "events_replay_data.csv"
output_filename = "test.json"

f = open(input_filename,'rb')
reader = csv.reader(f)

g = open(output_filename,'wb')

data_list =[]

#have to be careful because the clarity extractor has a different naming convention for several of the heros
heros = {"spirit_breaker":"radiant","queenofpain":"radiant", "antimage":"radiant","dazzle":"radiant","dark_seer":"radiant", \
"undying":"dire","witch_doctor":"dire","necrolyte":"dire","tusk": "dire", "alchemist":"dire"}

events =[]

header = {"id":0,"draft": {},"length": 600}

events.append(header)

kills_namespace =10000

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
			new_event = {str(id_num):{"type":"kill","time":row[0],"team":side}}	
			events.append(new_event)
			k=k+1

data_to_write = {"header":header,"events":events}

g.write(json.dumps(data_to_write, sort_keys=False,indent=4, separators=(',', ': ')))

f.close()
g.close()

with open(output_filename) as data_file:    
    data = json.load(data_file)