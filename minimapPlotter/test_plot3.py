from matplotlib import pyplot as plt
from scipy.misc import imread
import csv

#Select a player number (1-10), inital time t0 and number of time steps and plot the trajectory
#of that player on the minimap.

p = 1; # player number 
t0=25000 #The desired start time
N = 2000 # the number of steps
Step = 10 # the step size i.e., Step = 10 is a sampling rate of 1/10
Num_Box = 32 #the number of boxes in the grid

replay_data = open('replay_data.csv','rb')
reader = csv.reader(replay_data)

xmin = -8200
#xmax = 7930.0
xmax = 8000.0
ymin = -8400.0
ymax = 8080.0

grid_size_x = (xmax-xmin)/32
grid_size_y = (ymax-ymin)/32

img = imread('minimap_annotated.png')

plt.axis([xmin, xmax, ymin, ymax])
plt.axis('off')
plt.imshow(img, zorder=0, extent=[xmin, xmax, ymin, ymax])

x = []
y= []
x_offset = 0.1*grid_size_x
y_offset = 0.4*grid_size_y


for i, row in enumerate(reader):
    if i >=t0 and i <= t0+N and i % Step==0:
    	x.append(float(row[3*(p-1)+1])+x_offset)
    	y.append(float(row[3*(p-1)+2])+y_offset)

replay_data.close()
plt.plot(x,y,'*')
plt.plot(0,0,'ro')


scaled_x = [i/grid_size_x for i in x]
scaled_y = [i/grid_size_y for i in y]

x2= []
y2 =[]

for i in range(-Num_Box/2,Num_Box/2):
	for j in range(-Num_Box/2,Num_Box/2):
		x2.append(i*grid_size_x+x_offset)
		y2.append(j*grid_size_y+y_offset)

#plt.plot(x2,y2,'*')
plt.plot(x_offset,y_offset,'xr')
plt.show()














