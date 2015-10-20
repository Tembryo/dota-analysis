from matplotlib import pyplot as plt
from scipy.misc import imread
import csv


replay_data = open('replay_data.csv','rb')
reader = csv.reader(replay_data)

t0=16000 #The desired start time
N = 10000 # the number of steps

p = 3; # player number 

xmin = -8200
xmax = 7930.0
ymin = -8400.0
ymax = 8080.0

img = imread('minimap_annotated.png')

plt.axis([xmin, xmax, ymin, ymax])
plt.axis('off')
plt.imshow(img, zorder=0, extent=[xmin, xmax, ymin, ymax])

for i, row in enumerate(reader):
    if i >=t0 and i <= t0+N:
        plt.plot(row[3*(p-1)+1], row[3*(p-1)+2],'*')

plt.show()
replay_data.close()





