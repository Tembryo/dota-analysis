from matplotlib import pyplot as plt
from scipy.misc import imread
import csv

#Select a player number (1-10), inital time t0 and number of time steps and plot the trajectory
#of that player on the minimap.

p = 1; # player number 
t0=16000 #The desired start time
N = 10000 # the number of steps
Step = 10 # the step size i.e., Step = 10 is a sampling rate of 1/10
Num_Box = 32 #the number of boxes in the grid

replay_data = open('replay_data.csv','rb')
reader = csv.reader(replay_data)

xmin = -8200
#xmax = 7930.0
xmax = 8000.0
ymin = -8400.0
ymax = 8080.0

img = imread('minimap_annotated.png')

plt.axis([xmin, xmax, ymin, ymax])
plt.axis('off')
plt.imshow(img, zorder=0, extent=[xmin, xmax, ymin, ymax])

for i, row in enumerate(reader):
    if i >=t0 and i <= t0+N and i % Step==0:
        plt.plot(row[3*(p-1)+1], row[3*(p-1)+2],'*')

plt.show()
replay_data.close()

grid_size_x = (xmax-xmin)/32
grid_size_y = (ymax-ymin)/32

print grid_size_x
print grid_size_y




