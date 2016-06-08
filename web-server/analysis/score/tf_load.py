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

Dataset = collections.namedtuple('Dataset', ['labels','steamids', 'features', 'features_hero', 'feature_encoder', 'hero_encoder', 'feature_scaler', 'test_set', 'training_set'])

fraction_test = 0.30

def generateData(rows, settings = None):
    labels = [] #either MMRs for training or steamids for rating
    heroes = []
    parsed_features = []
    for row in rows:
        #print row
        label = None
        hero_dict = None
        parsed_row = {}
        for key in row:
            if key == "MMR":
                label = {"mmr": float(row[key])}
            elif key == "steamid":
                label = row[key] 
            elif key == "hero":
                hero_dict = {"hero": row[key]}
            else:
                try:
                    parsed_row[key] = float(row[key])
                except ValueError:
                    parsed_row[key] = row[key]
        heroes.append(hero_dict)
        labels.append(label)
        parsed_features.append(parsed_row)

    if settings is None:
        hero_encoder = DictVectorizer(dtype=np.float32)
        heroes_encoded = hero_encoder.fit_transform(heroes).todense()
    else:
        hero_encoder = settings["hero-encoder"]
        heroes_encoded = hero_encoder.transform(heroes).todense()


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

    if settings is None:
        labels_encoder = DictVectorizer(dtype=np.float32)
        labels_encoded = labels_encoder.fit_transform(labels).todense()
        steamids=[]
    else:
        #scoring, keep labels
        labels_encoded = np.zeros((len(labels),1),dtype=np.float32)
        steamids = labels

    full_set =  [i for i in range(len(labels))]
    if settings is None:
        n_test = int(fraction_test*len(full_set))
        test_set = random.sample(full_set, n_test)
    else:
        n_test = 0
        test_set = []
    training_set = [i for i in full_set if i not in test_set]

    result  = Dataset(
                labels=labels_encoded,
                steamids=steamids,
                features=features_scaled,
                features_hero=heroes_encoded,
                feature_encoder=feature_encoder,
                hero_encoder=hero_encoder,
                feature_scaler = scaler,
                test_set=test_set,
                training_set=training_set)

    return result

batch_size = 1000

def get_batch(data, batched = True):
    
    if batched:
        indices =  random.sample(data.training_set, batch_size)
        batch = {
            "features": data.features[indices],
            "features_hero": data.features_hero[indices],
            "labels": data.labels[indices]
        }
    else:
        batch = {
            "features": data.features[data.training_set],
            "features_hero": data.features_hero[data.training_set],
            "labels": data.labels[data.training_set]
        }
    return batch

def get_test_set(data):
    test_batch = {
            "features": data.features[data.test_set],
            "features_hero": data.features_hero[data.test_set],
            "labels": data.labels[data.test_set]
        }
    return test_batch