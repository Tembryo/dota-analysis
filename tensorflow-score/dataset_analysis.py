import csv
import json

dataset_filename = "files/data.csv"
with open(dataset_filename) as data_file:
    reader = csv.DictReader(data_file)
    result = {}
    for row in reader:
        if row["hero"] in result:
            result[row["hero"]] +=1
        else:
            result[row["hero"]] = 1

    print json.dumps(result)