from matplotlib import pyplot as plt
from scipy.misc import imread
import csv
import math

#Select a player number (1-10), inital time t0 and number of time steps and plot the trajectory
#of that player on the minimap.

Num_Players = 10
Col_per_player =3
p = 1; # player number 
t0=16000 #The desired start time
N = 30000 # the number of steps
Step = 10 # the step size i.e., Step = 10 is a sampling rate of 1/10
Num_Box = 32 #the number of boxes in the grid

replay_data = open('replay_data.csv','rb')
reader = csv.reader(replay_data)

xmin = -8200
xmax = 8000.0
ymin = -8200.0
ymax = 8000.0

grid_size_x = (xmax-xmin)/32
grid_size_y = (ymax-ymin)/32

img = imread('minimap_annotated.png')

plt.axis([xmin, xmax, ymin, ymax])
plt.axis('off')
plt.imshow(img, zorder=0, extent=[xmin, xmax, ymin, ymax])

#make vectors of (x,y) coordinates of desired player
#with the offset added for convenience to line up with the grid
x = []
y= []
t = []

for i, row in enumerate(reader):
    if i >=t0 and i <= t0+N and i % Step==0:
    	x.append(float(row[Col_per_player*(p-1)+1]))
    	y.append(float(row[Col_per_player*(p-1)+2]))
    	t.append(float(row[Col_per_player*Num_Players]))

replay_data.close()
plt.plot(x,y,'*')

# xtext_offset = 0.6*grid_size_x #offsets so that text roughly in middle of box
# ytext_offset = 0.25*grid_size_y 
# for i in range(0,Num_Box):
# 	for j in range(0,Num_Box):
# 		tmp_string = "%d,%d" % (i,j)
# 		plt.text(i*grid_size_x+xmin +xtext_offset,j*grid_size_y+ymin+ytext_offset,tmp_string,fontsize =8)

#List of boxes for each area

radiant_ancient = [[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],\
[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8],[1,9],[1,10],\
[2,2],[2,3],[2,4],[2,5],[2,6],[2,7],[2,8],[2,9],[2,10],\
[3,2],[3,3],[3,4],[3,5],[3,6],[3,7],[3,8],[3,9],[3,10],\
[4,2],[4,3],[4,4],[4,5],[4,6],[4,7],[4,8],[4,9],[4,10],\
[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9],[5,10],\
[6,2],[6,3],[6,4],[6,5],[6,6],[6,7],[6,8],[6,9],\
[7,2],[7,3],[7,4],[7,5],[7,6],[7,7],[7,8],\
[8,2],[8,3],[8,4],[8,5],[8,6],[8,7],[9,2]]

radiant_mid = [[8,10],[8,11],[9,9],[9,10],[9,11],[9,12],\
[10,10],[10,11],[10,12],[10,13],[11,11],[11,12],[11,13],[11,14],\
[12,12],[12,13],[12,14],[12,15],[13,13],[13,14],[13,15],[14,14]]

radiant_top = [[1,13],[1,14],[1,15],[1,16],[1,17],[1,18],[1,19],[1,20],[1,21],\
[2,12],[2,13],[2,14],[2,15],[2,16],[2,17],[2,18],[2,19],[2,20],[2,21],\
[3,12],[3,13],[3,14],[3,15],[3,16],[3,17],[3,18],[3,19],[3,20],[3,21]]

radiant_bot =[[10,3],[10,4],[11,3],[11,4],[12,3],[12,4],[13,3],[13,4],\
[14,3],[14,4],[15,3],[15,4],[16,3],[16,4],[17,3],[17,4],[18,3],[18,4],[19,3],[19,4],\
[20,3],[20,4],[21,3],[21,4],[22,3],[22,4],[23,3],[23,4],[24,3],[24,4],\
[25,3],[25,4],[25,3],[25,4],[25,5],[26,3],[26,4],[26,5],[26,6],[26,7],\
[27,3],[27,4],[27,5],[27,6],[27,7],[27,8],\
[28,4],[28,5],[28,6],[28,7],[28,8],
[29,6],[29,7],[29,8],[30,8]]

dire_bot =[[27,10],[27,11],[27,12],[27,13],[27,14],[27,15],[27,16],[27,17],[27,18],[27,19],\
[28,10],[28,11],[28,12],[28,13],[28,14],[28,15],[28,16],[28,17],[28,18],[28,19],\
[29,10],[29,11],[29,12],[29,13],[29,14],[29,15],[29,16],[29,17],[29,18],[29,19]]

dire_mid = [[15,16],[15,17],[15,18],[16,16],[16,17],[16,18],\
[17,15],[17,16],[17,17],[17,18],[18,17],[18,18],[18,19],[19,18],[19,19],[19,20],\
[20,19],[20,20],[20,21],[21,20],[21,21],[21,22],[22,21]]

dire_ancient = [[22,24],[22,25],[22,26],[22,27],[22,28],[22,29],[22,30],\
[23,23],[23,24],[23,25],[23,26],[23,27],[23,28],[23,29],[23,30],\
[24,22],[24,23],[24,24],[24,25],[24,26],[24,27],[24,28],[24,29],[24,30],\
[25,22],[25,23],[25,24],[25,25],[25,26],[25,27],[25,28],[25,29],[25,30],\
[26,21],[26,22],[26,23],[26,24],[26,25],[26,26],[26,27],[26,28],[26,29],[26,30],\
[27,21],[27,22],[27,23],[27,24],[27,25],[27,26],[27,27],[27,28],[27,29],[27,30],\
[28,21],[28,22],[28,23],[28,24],[28,25],[28,26],[28,27],[28,28],[28,29],[28,30],\
[29,21],[29,22],[29,23],[29,24],[29,25],[29,26],[29,27],[29,28],[29,29],[29,30],\
[30,21],[30,22],[30,23],[30,24],[30,25],[30,26],[30,27],[30,28],[30,29],[30,30]]

dire_top = [[1,24],[1,25],[1,26],[1,27],[2,23],[2,24],[2,25],[2,26],[2,27],[2,28],\
[3,23],[3,24],[3,25],[3,26],[3,27],[3,28],[3,29],[4,27],[4,28],[4,29],\
[5,27],[5,28],[5,29],[6,27],[6,28],[6,29],[7,27],[7,28],[7,29],\
[8,27],[8,28],[8,29],[9,27],[9,28],[9,29],[10,27],[10,28],[10,29],\
[11,27],[11,28],[11,29],[12,27],[12,28],[12,29],[13,27],[13,28],[13,29],\
[14,27],[14,28],[14,29],[15,27],[15,28],[15,29],[16,27],[16,28],[16,29],\
[17,27],[17,28],[17,29],[18,27],[18,28],[18,29],[19,27],[19,28],[19,29],[20,27],[20,28],[20,29]]

dire_jungle =[[5,23],[5,24],[5,25],[6,23],[6,24],[6,25],[7,23],[7,24],[7,25],\
[8,23],[8,24],[8,25],[9,23],[9,24],[9,25],[10,23],[10,24],[10,25],\
[11,23],[11,24],[11,25],[12,21],[12,22],[12,23],[12,24],[12,25],\
[13,21],[13,22],[13,23],[13,24],[13,25],[14,21],[14,22],[14,23],[14,24],[14,25],\
[15,20],[15,21],[15,22],[15,23],[15,24],[15,25],[16,20],[16,21],[16,22],[16,23],[16,24],[16,25],\
[17,22],[17,23],[17,24],[17,25],[18,23],[18,24]]

radiant_jungle = [[12,8],[12,9],[13,7],[13,8],[13,9],[13,10],\
[14,6],[14,7],[14,8],[14,9],[14,10],[14,11],[15,6],[15,7],[15,8],[15,9],[15,10],[15,11],[15,12],\
[16,6],[16,7],[16,8],[16,9],[16,10],[16,11],[16,12],\
[17,6],[17,7],[17,8],[17,9],[17,10],[17,11],[18,6],[18,7],[18,8],[18,9],[18,10],[18,11],\
[19,6],[19,7],[19,8],[19,9],[19,10],[20,6],[20,7],[20,8],[20,9],\
[21,6],[21,7],[21,8],[21,9],[21,10],[22,6],[22,7],[22,8],[22,9],[22,10],\
[23,6],[23,7],[23,8],[23,9],[24,7],[24,8],[24,9],[25,8],[25,9]]

dire_secret = [[21,17],[22,16],[22,17],[22,18],[23,16],[23,17],[23,18],\
[24,16],[24,17],[25,16],[25,17]]

radiant_secret = [[5,17],[6,17],[6,18],[6,19],[6,20],[7,15],[7,16],[7,17],[7,18],[7,19],[7,20],\
[8,14],[8,15],[8,18],[8,19],[8,20],[9,19],[9,20]]

radiant_creep = [[9,16],[9,17],[10,15],[10,16],[10,17],[11,16]]

top_rune = [[10,19],[10,20],[11,18],[11,19],[11,20],[12,18],[12,19]]
bottom_rune = [[20,12],[21,11],[21,12],[22,11]]
roshan = [[22,12],[23,12],[23,13],[24,12],[24,13]]
dire_creep = [[21,14],[21,15],[22,14],[22,15],[23,14],[23,15],[24,14],[24,15]]

#dictionary associating area labels to lists
areas = {"RC":radiant_creep,"RS":radiant_secret,"DS":dire_secret,"RJ":radiant_jungle,"DJ":dire_jungle, "DT":dire_top, "DA":dire_ancient,"DM":dire_mid,"DB":dire_bot, "RB": radiant_bot,"RT":radiant_top,"RM":radiant_mid,"RA":radiant_ancient,"TR":top_rune,"BR":bottom_rune,"RH":roshan,"DC":dire_creep}

A = [[0 for i in range(Num_Box)] for i in range(Num_Box)] 

for key in areas:
	for elem in areas[key]:
		A[Num_Box-1-elem[1]][elem[0]] = key


#shift and scale the game coordinates so that 0,0 is at (xmin,ymin)
x_pos = [math.floor((i-xmin)/grid_size_x) for i in x]
y_pos = [math.floor((i-ymin)/grid_size_y)  for i in y]

print x, y
print x_pos, y_pos

area_state =[]
for k in range(0,len(x_pos)):
	i = Num_Box-1-int(y_pos[k])
	j = int(x_pos[k])
	area_state.append(A[i][j])

#print area_state

area_state_summary =["start"]
area_state_times = [t0]

for k in range(0,len(x_pos)):
	elem = area_state[k]
	if elem!=0 and elem!=area_state_summary[-1]:
		area_state_summary.append(elem)
		area_state_times.append(t[k])
	k=k+1

print area_state_summary



#Label boxes on the map to check that they are correct

# xtext_offset = 0.6*grid_size_x
# ytext_offset = 0.25*grid_size_y
# for key in areas:
# 	tmp_list = areas[key]
# 	for elem in areas[key]:
# 		i = elem[0]
# 		j = elem[1]
# 		tmp_string = key
		#plt.text(i*grid_size_x+xmin +xtext_offset,j*grid_size_y+ymin+ytext_offset,tmp_string,fontsize =6)
plt.show()




















