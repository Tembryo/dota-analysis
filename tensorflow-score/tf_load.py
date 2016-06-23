import csv
import numpy as np
from sklearn.feature_extraction import DictVectorizer
from sklearn.preprocessing import StandardScaler
import collections
import random


def importCSV(file):
    reader = csv.DictReader(file)
    result = []
    for row in reader:

        ok = True
        for key in row:
            if row[key] is None:
                ok = False
                break
        if not ok:
            continue
        result.append(row)
    return result

Dataset = collections.namedtuple('Dataset', ['labels','steamids', 'features', 'features_hero', 'feature_encoder', 'hero_encoder', 'feature_scaler', 'rowset'])

#fraction_test = 0.1

def generateData(rows, settings = None):
    labels = [] #either MMRs for training or steamids for rating
    heroes = []
    own_team_heroes = [ [] for i in range(5) ]
    enemy_team_heroes = [ [] for i in range(5) ]
    parsed_features = []
    for row in rows:
        #print row
        label = None
        hero_dict = None
        own_team = []
        enemy_team = []
        parsed_row = {}
        for key in row:
            if key == "MMR":
                label = {"mmr": float(row[key])}
            elif key == "steamid":
                label = row[key] 
            elif key == "hero":
                hero_dict = {"hero": row[key]}
            elif key == "own_team":
                own_team = row[key].split("#")
            elif key == "enemy_team":
                enemy_team = row[key].split("#")
            else:
                try:
                    parsed_row[key] = float(row[key])
                except ValueError:
                    parsed_row[key] = row[key]

        heroes.append(hero_dict)
        for i in range(5):
            if i < len(own_team):
                own_team_heroes[i].append( {"hero": own_team[i]} )
            else:
                own_team_heroes[i].append( {} )
            if i < len(enemy_team):
                enemy_team_heroes[i].append( {"hero": enemy_team[i]} )
            else:
                enemy_team_heroes[i].append( {} )

        labels.append(label)
        parsed_features.append(parsed_row)

    if settings is None:
        hero_encoder = DictVectorizer(dtype=np.float32)
        heroes_encoded = hero_encoder.fit_transform(heroes).todense()
    else:
        hero_encoder = settings["hero-encoder"]
        heroes_encoded = hero_encoder.transform(heroes).todense()

    own_team_encoded =  np.zeros(heroes_encoded.shape, dtype=np.float32)
    enemy_team_encoded =  np.zeros(heroes_encoded.shape, dtype=np.float32)
    for i in range(5):
        own_team_encoded += hero_encoder.transform(own_team_heroes[i]).todense()
        enemy_team_encoded += hero_encoder.transform(enemy_team_heroes[i]).todense()

    collected_hero_features = np.concatenate([heroes_encoded, own_team_encoded, enemy_team_encoded], axis=1)

    if settings is None:
        feature_encoder = DictVectorizer(dtype=np.float32)
        features_encoded = feature_encoder.fit_transform(parsed_features).todense()
        scaler = StandardScaler().fit(features_encoded)
        features_scaled = scaler.transform(features_encoded)
    else:
        feature_encoder = settings["feature-encoder"]
        features_encoded = feature_encoder.transform(parsed_features).todense()
        scaler = settings["feature-scaler"]
        features_scaled = scaler.transform(features_encoded)

    if settings is None or settings["load_labels"]:
        labels_encoder = DictVectorizer(dtype=np.float32)
        labels_encoded = labels_encoder.fit_transform(labels).todense()
        steamids=[]
    else:
        #scoring, keep labels
        labels_encoded = np.zeros((len(labels),1),dtype=np.float32)
        steamids = labels

    row_set =  [i for i in range(len(labels))]

    result  = Dataset(
                labels=labels_encoded,
                steamids=steamids,
                features=features_scaled,
                features_hero=heroes_encoded,
                feature_encoder=feature_encoder,
                hero_encoder=hero_encoder,
                feature_scaler = scaler,
                rowset=row_set)

    return result

batch_size = 1000

def get_batch(data, batched = True):
    
    if batched:
        indices =  random.sample(data.rowset, batch_size)
        batch = {
            "features": data.features[indices],
            "features_hero": data.features_hero[indices],
            "labels": data.labels[indices]
        }
    else:
        batch = {
            "features": data.features,
            "features_hero": data.features_hero,
            "labels": data.labels
        }
    return batch