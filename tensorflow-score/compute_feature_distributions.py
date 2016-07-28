import csv
import json

def importCSV(file):
    reader = csv.DictReader(file)
    feature_dict = None

    for row in reader:
        ok = True
        for key in row:
            if row[key] is None:
                ok = False
                break
        if not ok:
            continue

        if feature_dict is None:
            feature_dict = {}
            for feature in row:
                if feature == "MMR" or feature == "steamid" or feature == "hero" or feature == "own_team" or feature == "enemy_team":
                    continue
                feature_dict[feature] = []
        else:
            for feature in row:
                if feature == "MMR" or feature == "steamid" or feature == "hero" or feature == "own_team" or feature == "enemy_team":
                    continue
                else:
                    try:
                        feature_dict[feature].append(float(row[feature]))
                    except ValueError:
                        print"bad feature value {}, {}".format(row, feature)

    return feature_dict

data_filename= "files/data.csv"
out_filename= "feature_representatives.json"

n_target_samples = 100

with open(data_filename) as file:
    data = importCSV(file)
    result = {}
    for feature in data:
        data[feature].sort()
        step_size = int(len(data[feature])/n_target_samples)
        result[feature] = [ data[feature][i*step_size] for i in range(1,n_target_samples)]

    with open(out_filename, "w") as  out_file:
        json.dump(result, out_file)