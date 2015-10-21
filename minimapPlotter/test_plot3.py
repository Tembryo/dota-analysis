from matplotlib import pyplot as plt
from scipy.misc import imread
import csv

#Select a player number (1-10), inital time t0 and number of time steps and plot the trajectory
#of that player on the minimap.

p = 3; # player number 
t0=28000 #The desired start time
N = 200 # the number of steps
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

#offsets required to make game coordinates line up with grid
x_offset = 0.073*grid_size_x  
y_offset = -0.58*grid_size_y

#make vectors of (x,y) coordinates of desired player
#with the offset added for convenience to line up with the grid
x = []
y= []

for i, row in enumerate(reader):
    if i >=t0 and i <= t0+N and i % Step==0:
    	x.append(float(row[3*(p-1)+1])+x_offset)
    	y.append(float(row[3*(p-1)+2])+y_offset)

replay_data.close()
plt.plot(x,y,'*')

#plot the origin of the game coordinates of the game without the offset
plt.plot(0,0,'ro')
#plot the shift of the coordinates to show it lines up with grid
plt.plot(x_offset,y_offset,'xr')

#shift and scale the game coordinates so that 0,0 is at (xmin,ymin)
x_pos = [(i-xmin)/grid_size_x for i in x]
y_pos = [(i-ymin)/grid_size_y  for i in y]

print x, y
print "x_pos, y_pos"
print x_pos, y_pos

#print out some '*' symbols to show that boxes map onto the grid lines
x2= []
y2 =[]

for i in range(-Num_Box/2,Num_Box/2):
	for j in range(-Num_Box/2,Num_Box/2):
		x2.append(i*grid_size_x+x_offset)
		y2.append(j*grid_size_y+y_offset)

plt.plot(x2,y2,'*')

xtext_offset = 0.5*grid_size_x #offsets so that text roughly in middle of box
ytext_offset = 0.25*grid_size_y 
for i in range(0,Num_Box):
	for j in range(0,Num_Box):
		tmp_string = "%d,%d" % (i,j)
		plt.text(i*grid_size_x+xmin +xtext_offset,j*grid_size_y+ymin+ytext_offset,tmp_string,fontsize =6)

#List of boxes for each area

radiant_base = [[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],\
[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8],[1,9],[1,10],\
[2,2],[2,3],[2,4],[2,5],[2,6],[2,7],[2,8],[2,9],[2,10],\
[3,2],[3,3],[3,4],[3,5],[3,6],[3,7],[3,8],[3,9],[3,10],\
[4,2],[4,3],[4,4],[4,5],[4,6],[4,7],[4,8],[4,9],[4,10],\
[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9],[5,10],\
[6,2],[6,3],[6,4],[6,5],[6,6],[6,7],[6,8],[6,9],\
[7,2],[7,3],[7,4],[7,5],[7,6],[7,7],[7,8],\
[8,2],[8,3],[8,4],[8,5],[8,6],[8,7],[9,2]]

top_rune = [[10,19],[10,20],[11,18],[11,19],[11,20],[12,18],[12,19]]
bottom_rune = [[20,12],[21,11],[21,12],[22,11]]
roshan = [[22,12],[23,12],[23,13],[24,12],[24,13]]
dire_ancient = [[21,14],[21,15],[22,14],[22,15],[23,14],[23,15],[24,14],[24,15]]

#dictionary associating area labels to lists
areas = {"RB":radiant_base,"TR":top_rune,"BR":bottom_rune,"RS":roshan,"DA":dire_ancient}

xtext_offset = 0.5*grid_size_x
ytext_offset = 0.25*grid_size_y
for key in areas:
	tmp_list = areas[key]
	for elem in areas[key]:
		i = elem[0]
		j = elem[1]
		tmp_string = key
		#plt.text(i*grid_size_x+xmin +xtext_offset,j*grid_size_y+ymin+ytext_offset,tmp_string,fontsize =6)
plt.plot(x_offset,y_offset,'xr')
plt.show()




















