# a first version of the analysis code taking the CSV -> JSon 

import csv
import json

input_filename = "replay_data_real.csv"
output_filename = "analysed_data.json"


f = open(output_filename,"w")
#open bracket
f.write("{\n")
# write header of json file to output file
f.write("    \"header\":{ \n")
# write id in header
f.write("        \"id\": 0,\n" )
# write teams in header
f.write("    	\"teams\": {\n")
f.write("			\"0\":{ \n")
f.write("				\"side\":\"radiant\",\n")
f.write("				\"name\":\"R\", \n")
f.write("				\"short\":\"R\" \n")
f.write("			},\n")
f.write("			\"0\":{ \n")
f.write("				\"side\":\"dire\",\n")
f.write("				\"name\":\"D\", \n")
f.write("				\"short\":\"D\" \n")
f.write("			}\n")
f.write("		},\n")
# write players in header
f.write("		\"players\": {\n")
#write each player name:
#player 0
f.write("			\"0\": {\n")
f.write("				\"name\":\"string\" \n")
f.write("			},\n")			
#player 1
f.write("			\"1\": {\n")
f.write("				\"name\":\"string\" \n")
f.write("			},\n")	
#player 2
f.write("			\"2\": {\n")
f.write("				\"name\":\"string\" \n")
f.write("			},\n")	
#player 3
f.write("			\"3\": {\n")
f.write("				\"name\":\"string\" \n")
f.write("			},\n")	
#player 4
f.write("			\"4\": {\n")
f.write("				\"name\":\"string\" \n")
f.write("			},\n")	
#player 5
f.write("			\"5\": {\n")
f.write("				\"name\":\"string\" \n")
f.write("			},\n")	
#player 6
f.write("			\"6\": {\n")
f.write("				\"name\":\"string\" \n")
f.write("			},\n")	
#player 7
f.write("			\"7\": {\n")
f.write("				\"name\":\"string\" \n")
f.write("			},\n")	
#player 8
f.write("			\"8\": {\n")
f.write("				\"name\":\"string\" \n")
f.write("			},\n")	
#player 9
f.write("			\"9\": {\n")
f.write("				\"name\":\"string\" \n")
f.write("			}\n")	
# close players bracket
f.write("		},\n")
# write draft in header
f.write("		\"draft\": {},\n")
# write length in header
f.write("		\"length\": 0,\n")
# write entities in header
f.write("		\"entities\":{\n")
#close entities bracket
f.write("		}\n")
#close headers bracket
f.write("    }\n")

#close bracket
f.write("}")


f.close()


#test have not made an error with json file format

with open(output_filename) as data_file:    
    data = json.load(data_file)




