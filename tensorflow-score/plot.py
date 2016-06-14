"""
Demo of the histogram (hist) function with a few features.

In addition to the basic histogram, this demo shows a few optional features:

    * Setting the number of data bins
    * The ``normed`` flag, which normalizes bin heights so that the integral of
      the histogram is 1. The resulting histogram is a probability density.
    * Setting the face color of the bars
    * Setting the opacity (alpha value).

"""
import numpy as np
import matplotlib.mlab as mlab
import matplotlib.pyplot as plt

import scipy
import scipy.stats

values = []
with open("baseline_means.csv") as file:
    for line in file:
        d = float(line)
        #if d > 0 and d <10000:
        values.append(d)
data = np.array(values)

num_bins = 100
# the histogram of the data
n, bins, patches = plt.hist(data, num_bins, normed=1, facecolor='green', alpha=0.5)
# add a 'best fit' line

names = ["norm", 'beta', 'chi']
for name in names:
    dist = getattr(scipy.stats, name)
    param = dist.fit(data)
    print "{}: {}".format(name, param)
    y = dist.pdf(bins, *param[:-2], loc=param[-2], scale=param[-1])

    plt.plot(bins, y, label=r'{}: $\mu={}$, $\sigma={}$'.format(name, param[-2], param[-1]))
plt.xlabel('Value')
plt.ylabel('Probability')

# Tweak spacing to prevent clipping of ylabel
plt.subplots_adjust(left=0.15)
plt.legend(loc='upper right')
plt.show()