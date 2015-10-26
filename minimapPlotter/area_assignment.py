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


class Dota2Replay:

	def __init__(self,filename):
		self.filename = filename
		self.replay_type = "Dota2"
		self.Num_Players = 10
		self.Col_per_player= 3
		self.xmin = -8200
		self.xmax = 8000.0
		self.ymin = -8200.0
		self.ymax = 8000.0
		self.Num_Box = 32


def readPlayerXYT(replay,player,t0,N,Step):
	#takes in a replay object and read the x,y,t coordiantes of player p from the csv file called replay.filename. 
	replay_data = open(replay.filename,'rb')
	reader = csv.reader(replay_data)

	x = []
	y = []
	t = []

	for i, row in enumerate(reader):
		if (i >=t0) and (i <= t0+N) and (i % Step==0):
			x.append(float(row[replay.Col_per_player*(player-1)+1]))
			y.append(float(row[replay.Col_per_player*(player-1)+2]))
			t.append(float(row[replay.Col_per_player*replay.Num_Players]))

	replay_data.close()
	return x, y, t

def assignPlayerArea(replay,player,t0,N,Step,area_matrix):

	replay_data = readPlayerXYT(replay,player,t0,N,Step)

	grid_size_x = (replay.xmax-replay.xmin)/replay.Num_Box
	grid_size_y = (replay.ymax-replay.ymin)/replay.Num_Box
	x = [math.floor((i-replay.xmin)/grid_size_x) for i in data[0]]
	y = [math.floor((i-replay.ymin)/grid_size_y)  for i in data[1]]

	area_state =[]
	for k in range(0,len(x)):
		i = replay.Num_Box-1-int(y[k])
		j = int(x[k])
		area_state.append(area_matrix[i][j])
	print area_state


replay1= Dota2Replay('replay_data.csv')

player1data = readPlayerXYT(replay1,1,16000,100,10)
print player1data[1]

# #shift and scale the game coordinates so that 0,0 is at (xmin,ymin)
# x_pos = [math.floor((i-xmin)/grid_size_x) for i in x]
# y_pos = [math.floor((i-ymin)/grid_size_y)  for i in y]

# print x, y
# print x_pos, y_pos

# area_state =[]
# for k in range(0,len(x_pos)):
# 	i = Num_Box-1-int(y_pos[k])
# 	j = int(x_pos[k])
# 	area_state.append(A[i][j])

# #print area_state

# area_state_summary =["start"]
# area_state_times = [t0]

# for k in range(0,len(x_pos)):
# 	elem = area_state[k]
# 	if elem!=0 and elem!=area_state_summary[-1]:
# 		area_state_summary.append(elem)
# 		area_state_times.append(t[k])
# 	k=k+1

# print area_state_summary


# map_axis = (-8200,8000.0,-8200.0,8000.0)
# map1 = MapPlot('minimap_annotated.png',map_axis)
# map1.mapBoxNum()	







