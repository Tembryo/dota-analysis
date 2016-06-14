import time

import tf_load
import tf_model

import numpy as np

import json
import pickle
import math
import sys

import random
random.seed()

import os
dn = os.path.dirname(os.path.realpath(__file__))

settings_filename = dn+"/model_files/settings.p"
model_path = dn+"/model_files/wisdota-model.ckpt-99999"
representatives_filename = dn+"/model_files/feature_representatives.json"
heroes_filename = dn+"/model_files/counted_heroes.json"

file_out = "baseline_distributions.json"

feature_to_subscore = {}

#feature_to_subscore["hero"] = ""
feature_to_subscore["win"] = ""
feature_to_subscore["durationMins"] = ""
feature_to_subscore["GPM"] = "farming"
feature_to_subscore["XPM"] = "farming"
#feature_to_subscore["fraction-creeps-lasthit"] = ""
#feature_to_subscore["fraction-lasthits"] = ""
feature_to_subscore["checks-per-minute"] = "mechanics"
feature_to_subscore["average-check-duration"] = "mechanics"
feature_to_subscore["time-fraction-visible"] = "movement"
feature_to_subscore["kills"] = "fighting"
feature_to_subscore["deaths"] = "fighting"
feature_to_subscore["fightsPerMin"] = "fighting"
feature_to_subscore["initiation-score"] = "fighting"
feature_to_subscore["camera-average-movement"] = "mechanics"
feature_to_subscore["camera-distance-average"] = "mechanics"
feature_to_subscore["camera-distance-stdev"] = "mechanics"
feature_to_subscore["camera-jumps-per-minute"] = "mechanics"
feature_to_subscore["camera-percent-far"] = "mechanics"
feature_to_subscore["camera-percent-moving"] = "mechanics"
feature_to_subscore["camera-percent-self"] = "mechanics"
feature_to_subscore["lasthits-per-minute"] = "farming"
feature_to_subscore["lasthits-total-contested"] = "farming"
feature_to_subscore["lasthits-contested-percent-lasthit"] = "farming"
feature_to_subscore["lasthits-taken-percent-free"] = "farming"
feature_to_subscore["lasthits-missed-free"] = "farming"
feature_to_subscore["lasthits-percent-taken-against-contest"] = "farming"
feature_to_subscore["tower-damage"] = "objectives"
feature_to_subscore["rax-damage"] = "objectives"


n_samples = 500
def make_csv_variations_one_fixed(hero, feature_fixed, index, representatives):
    fixed_value = representatives[feature_fixed][index]
    rows = []
    base_row = {
        "steamid": "",
        "hero": hero
        }
    for j in range(n_samples):
        for feature in representatives:
            if feature == feature_fixed:
                base_row[feature] = fixed_value
            else:
                base_row[feature] = random.choice(representatives[feature])
        rows.append(base_row)
    return rows

n_sampled_sets = 50000
with open(settings_filename) as settings_file:
    settings = pickle.load(settings_file)
    model = tf_model.Model(settings=settings["model-settings"], logging=False)
    model.load(model_path)

    feature_to_col = settings["feature-encoder"].vocabulary_

    with open(representatives_filename) as representatives_file:
        representatives = json.load(representatives_file)

    with open(heroes_filename) as  heroes_file:
        heroes = json.load(heroes_file)

    means = {}
    means["all"] = []
    for i in range(n_sampled_sets):
        hero = random.choice(heroes.keys())
        feature =  random.choice(representatives.keys())
        index = random.choice(range(len(representatives[feature])))
        print "{}: sample hero {} {} {}".format(i, hero, feature, index)

        rows = make_csv_variations_one_fixed(hero, feature, index, representatives)

        data = tf_load.generateData(rows, settings)
        batch = tf_load.get_batch(data, batched=False)
        predictions = model.predict(batch)
        mean_imr = np.mean(predictions[:, model.result_entries["IMR"]])
        means["all"].append(float(mean_imr))
        if hero not in means:
            means[hero] = []
        means[hero].append(float(mean_imr))

    distributions = {}
    for group in means:
        np_array = np.array(means[group])
        distributions[group] = {
            "mean": float(np.mean(np_array)),
            "std": float(np.std(np_array)),
            "sample_means": means[group]
        }

    with open(file_out, "w") as outfile:
        json.dump(distributions, outfile)

    print "done"


   
            
