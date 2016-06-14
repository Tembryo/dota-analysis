import csv
import json
import numpy as np

dataset_filename = "files/data.csv"
with open(dataset_filename) as data_file:
    reader = csv.DictReader(data_file)
    result = {}
    mmrs = []
    for row in reader:
        if row["hero"] in result:
            result[row["hero"]] +=1
        else:
            result[row["hero"]] = 1
        mmrs.append(float(row["MMR"]))

    np_mmrs = np.array(mmrs)
    print "MMR distribution N({},{})".format(np.mean(np_mmrs), np.std(np_mmrs))
    #print json.dumps(result)