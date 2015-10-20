from matplotlib import pyplot as plt
from scipy.misc import imread

img = imread('minimap_annotated.png')

plt.axis([-8200, 7930.0, -8400.0, 8080.0])
plt.axis('off')
plt.imshow(img, zorder=0, extent=[-8200, 7930.0, -8400.0, 8080.0])
plt.show()