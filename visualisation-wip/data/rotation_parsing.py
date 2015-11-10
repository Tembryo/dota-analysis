import json
from pprint import pprint

input_filename = "monkey_vs_nip.json"
#input_filename = "replay_data_real.json"
#input_filename = "basic.json"

intermediate_filename = "intermediate_output.json"
output_filename = "rotation_output.json"

with open(input_filename) as data_file:    
    data = json.load(data_file)

entities = data["entities"]
unit_list = [100,101,102,103,104,105,106,107,108,109]

events = data["events"]
counter =0
namebase = 14000 

f = open(intermediate_filename,"w")
g = open(output_filename,"w")
for unit in unit_list:
	rotation_dict= {}

	for key in events:
		if "involved" and "time-start" and "time-end" in events[key]:
			if events[key]["type"] != "fight":
				involved = events[key]["involved"]
				for item in involved:
					if item == unit:
						time_start = events[key]["time-start"]
						rotation_dict[time_start]= key

	my_keys= rotation_dict.keys()
	my_keys.sort()

	for item in my_keys:
		f.write("\"" + str(rotation_dict[item]) + "\": { \n") 
		f.write("    " + "\"type\":" + "\"" +  events[rotation_dict[item]]["type"] + "\",\n")
		f.write("    " + "\"time-start\": " + str(events[rotation_dict[item]]["time-start"]) + ",\n" )
		f.write("    " + "\"time-end\": " + str(events[rotation_dict[item]]["time-end"]) + ",\n" )
		f.write("    " + "\"location\": " + "\"" + events[rotation_dict[item]]["location"] + "\",\n" )
		f.write("    " + "\"involved\": " + str(events[rotation_dict[item]]["involved"]) + ",\n" )
		f.write("},\n") 

	for i in range(0,len(my_keys)-1):
		event_id = namebase+counter
	 	time_end = events[rotation_dict[my_keys[i]]]["time-end"]
	 	time_start1 = events[rotation_dict[my_keys[i+1]]]["time-start"]
	 	time_start2 = events[rotation_dict[my_keys[i+1]]]["time-end"]
	 	time_start3 = min(time_start1,time_start2)
	 	if time_end != time_start3:
	 		g.write("\"" + str(event_id) + "\": { \n") 
	 		g.write("    " + "\"type\": \"rotation\", \n")
		 	g.write("    " + "\"time-start\": " + str(time_end) + ",\n" )
		 	g.write("    " + "\"time-end\": " + str(min(time_start1,time_start2)) + ",\n" )
		 	g.write("    " + "\"location-start\": " + "\"" + events[rotation_dict[my_keys[i]]]["location"] + "\",\n" )
		 	g.write("    " + "\"location-end\": " + "\"" + events[rotation_dict[my_keys[i+1]]]["location"] + "\",\n" )
		 	g.write("    " + "\"involved\": " + "[" + str(unit) + "], \n")
			g.write("    " + "\"rotation-type\": \"normal\" \n")
		 	g.write("},\n") 
		 	counter = counter+1
	
f.close()
g.close()















	
