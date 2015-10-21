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

plt.plot(x2,y2,'*')
# xtext_offset = 0.5*grid_size_x
# ytext_offset = 0.25*grid_size_y
# for i in range(0,Num_Box):
# 	for j in range(0,Num_Box):
# 		tmp_string = "%d,%d" % (i,j)
# 		plt.text(i*grid_size_x+xmin +xtext_offset,j*grid_size_y+ymin+ytext_offset,tmp_string,fontsize =6)


# plt.plot(x_offset,y_offset,'xr')
# plt.show()


#Top Rune
top_rune = [[10,19],[10,20],[11,18],[11,19],[11,20],[12,18],[12,19]]
bottom_rune = [[20,12],[21,11],[21,12],[22,11]]
roshan = [[22,12],[23,12],[23,13],[24,12],[24,13]]
dire_ancient = [[21,14],[21,15],[22,14],[22,15],[23,14],[23,15],[24,14],[24,15]]

# xtext_offset = 0.5*grid_size_x
# ytext_offset = 0.25*grid_size_y
# for elem in top_rune:
# 	i = elem[0]
# 	j = elem[1]
# 	tmp_string = "TR"
# 	plt.text(i*grid_size_x+xmin +xtext_offset,j*grid_size_y+ymin+ytext_offset,tmp_string,fontsize =6)
# plt.plot(x_offset,y_offset,'xr')
# plt.show()

areas = {"TR":top_rune,"BR":bottom_rune,"RS":roshan,"DA":dire_ancient}

xtext_offset = 0.5*grid_size_x
ytext_offset = 0.25*grid_size_y
for key in areas:
	tmp_list = areas[key]
	for elem in areas[key]:
		i = elem[0]
		j = elem[1]
		tmp_string = key
		plt.text(i*grid_size_x+xmin +xtext_offset,j*grid_size_y+ymin+ytext_offset,tmp_string,fontsize =6)
plt.plot(x_offset,y_offset,'xr')
plt.show()



















