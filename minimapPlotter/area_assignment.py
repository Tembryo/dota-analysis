from matplotlib import pyplot as plt
from scipy.misc import imread
import csv
import math
from dota2_area_boxes import area_matrix, areas

class MapPlot:
	
	def __init__(self,filename):

		self.img =imread(filename)
		self.xmin = -8200
		self.xmax = 8000.0
		self.ymin = -8200.0
		self.ymax = 8000.0
		self.Num_Box = 32

	def gridPrep(self):
		# calculate the grid sizes (i.e., height and widths of boxes in game coordinates)
		grid_size_x = (self.xmax-self.xmin)/self.Num_Box
		grid_size_y = (self.ymax-self.ymin)/self.Num_Box
		xtext_offset = 0.6*grid_size_x #offsets so that text roughly in middle of box
		ytext_offset = 0.25*grid_size_y 
		return grid_size_x, grid_size_y, xtext_offset, ytext_offset


	def mapPlot(self):
		# standard plot of the image with axes given by [xmin,xmax,ymin,ymax]
		plt.axis([self.xmin, self.xmax, self.ymin, self.ymax])
		plt.axis('off')
		plt.imshow(self.img, zorder=0, extent=[self.xmin, self.xmax, self.ymin, self.ymax])
		plt.show()

	def mapBoxNum(self):
		# assign each box on the map to a coordinate e.g., (2,4) is the 3rd box in x direction on 5th row up from (xmin,ymin)
		grid_params = self.gridPrep()
		plt.axis([self.xmin, self.xmax, self.ymin, self.ymax])
		plt.axis('off')
		plt.imshow(self.img, zorder=0, extent=[self.xmin, self.xmax, self.ymin, self.ymax])
		for i in range(0,self.Num_Box):
			for j in range(0,self.Num_Box):
				tmp_string = "%d,%d" % (i,j)
				plt.text(i*grid_params[0]+self.xmin +grid_params[2],j*grid_params[1]+self.ymin+grid_params[3],tmp_string,fontsize =8)
		plt.show()

	def mapAreaLabel(self,areas):
		#Label boxes on the map so can visually inspect that they are correct
		grid_params = self.gridPrep()

		plt.axis([self.xmin, self.xmax, self.ymin, self.ymax])
		plt.axis('off')
		plt.imshow(self.img, zorder=0, extent=[self.xmin, self.xmax, self.ymin, self.ymax])

		for key in areas:
			tmp_list = areas[key]
			for elem in areas[key]:
				i = elem[0]
				j = elem[1]
				tmp_string = key
				plt.text(i*grid_params[0]+self.xmin +grid_params[2],j*grid_params[1]+self.ymin+grid_params[3],tmp_string,fontsize =6)
		plt.show()

	def mapPlayerTrack(self,player_data):

		plt.axis([self.xmin, self.xmax, self.ymin, self.ymax])
		plt.axis('off')
		plt.imshow(self.img, zorder=0, extent=[self.xmin, self.xmax, self.ymin, self.ymax])
		plt.plot(player_data[0],player_data[1],'*')
		plt.show()


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

def writeToJson(replay):
	s = replay.filename.split(".") 
	filename = s[0]+ ".json"
	f = open(filename,"w")
	f.write("hello world")
	f.close()

def summaryToJson(replay,t0,N,Step,area_matrix):
	#write all 10 players summaries to a json file
	s = replay.filename.split(".") 
	filename = s[0]+ ".json"
	f = open(filename,"w")
	for player in range (1,11):
		player_data = readPlayerData(replay,player,t0,N,Step)
		area_state = assignPlayerArea(replay,player_data,area_matrix)
		summary = areaStateSummary(player_data,area_state)
		if player == 1:
			f.write("{\"movement\":[{\"areas\":" + str(summary[0]) + ",")
			f.write("\"times\":" + str(summary[1]) +"},") 
		elif (player >1) and (player <10):	
			f.write("{\"areas\":" + str(summary[0]) + ",")
			f.write("\"times\":" + str(summary[1]) +"},") 
		else:
			f.write("{\"areas\":" + str(summary[0]) + ",")
			f.write("\"times\":" + str(summary[1]) +"}]}")
	f.close()

replay1= Dota2Replay('replay_data_real.csv')

player1data = readPlayerData(replay1,2,30000,30000,10)
#print player1data[1]

area_state = assignPlayerArea(replay1,player1data,area_matrix)
#print area_state

summary = areaStateSummary(player1data,area_state)
print summary[0]
print summary[1]

map = MapPlot("minimap_annotated.png")
map.mapPlayerTrack(player1data)

summaryToJson(replay1,30000,30000,10,area_matrix)











