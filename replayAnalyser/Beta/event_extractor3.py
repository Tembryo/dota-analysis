import csv
import json
import math

events = {}

class Match:

	def __init__(self,match_id,position_input_filename,events_input_filename,output_filename):
		self.match_id = match_id
		self.position_input_filename = position_input_filename
		self.events_input_filename = events_input_filename
		self.output_filename = output_filename
		self.kills_namespace = 10000

	def matchInfo(self):

		f = open(self.events_input_filename,'rb')
		events_reader = csv.reader(f)

		# extract the match info from the files

		teams = {0:{"side":"radiant","name":"empty","short":"empty"},1:{"side":"dire","name":"empty","short":"empty"}}
		players = {0:{"name":"a"},1:{"name":"b"},2:{"name":"b"},3:{"name":"a"},4:{"name":"b"},5:{"name":"b"},6:{"name":"a"},7:{"name":"b"},8:{"name":"b"},9:{"name":"b"}}
		heros = {"spirit_breaker":{"side":"radiant"},"queenofpain":{"side":"radiant"},"antimage":{"side":"radiant"},"dazzle":{"side":"radiant"},"dark_seer":{"side":"radiant"},\
		"undying":{"side":"dire"},"witch_doctor":{"side":"dire"},"necrolyte":{"side":"dire"},"tusk":{"side":"dire"},"alchemist":{"side":"dire"}}

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


match = Match(12342,"replay_data.csv","events_replay_data.csv","test3.json")
match.matchInfo()

header = headerInfo(match)

hero_deaths = killsInfo(match)


entities = []
events = []
timeseries = []


################################################################################################


data_to_write = {"header":header,"entities":entities,"events":events,"timeseries":timeseries}


g = open(match.output_filename,'wb')

g.write(json.dumps(data_to_write, sort_keys=False,indent=4, separators=(',', ': ')))
g.close()

with open(match.output_filename) as data_file:    
    data = json.load(data_file)

