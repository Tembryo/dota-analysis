import time

import tf_load
import tf_model

import numpy as np

import json
import pickle
import math
import sys

settings_filename = "settings2016-05-30_22-47.p"
model_path = "logs2016-05-30_17-00"
representatives_filename = "feature_representatives.json"
samples_filename = sys.argv[1]

n_representatives = 99

feature_to_subscore = {}

#feature_to_subscore["hero"] = ""
#feature_to_subscore["win"] = ""
#feature_to_subscore["durationMins"] = ""
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

def make_sampled_variations(batch, representatives, feature_to_col):
    result = {}
    for i in range(batch["features"].shape[0]):
        result[i] = {}
        feature_row = batch["features"][i,:]
        feature_row = feature_row.reshape([1,-1]) #reshape into row
        #print feature_row.shape
        repeated_row = np.repeat(feature_row, n_representatives, axis=0)
        #print repeated_row.shape

        hero_row = batch["features_hero"][i,:]
        hero_row = hero_row.reshape([1,-1])#reshape into row
        hero_repeated = np.repeat(hero_row, n_representatives, axis=0)
        result[i]["hero"] = hero_repeated
        result[i]["label"] = np.zeros((n_representatives,1),dtype=np.float32)
        result[i]["features"] = {}
        for feature in representatives:
            result[i]["features"][feature] = np.copy(repeated_row)
            #print "{} {}".format(feature, result[i]["features"][feature])
            for j in range(len(representatives[feature])):
                result[i]["features"][feature][j, feature_to_col[feature]] = representatives[feature][j]
                #print result[i]["features"][feature][j, feature_to_col[feature]]
    return result

def median(lst):
    lst = sorted(lst)
    if len(lst) <= 2:
            return None
    if len(lst) %2 == 1:
            return lst[((len(lst)+1)/2)-1]
    else:
            return float(sum(lst[(len(lst)/2)-1:(len(lst)/2)+1]))/2.0

def mean(lst):
    mean = 0
    n =0
    for i in lst:
        n += 1
        mean += (i-mean)/n
    if n > 2:
        return mean
    else:
        return None 

def feature_map(value, feature, settings):
    if value is None:
        return None
    scaler_settings = (settings["feature-scaler"].mean_, settings["feature-scaler"].scale_)
    feature_to_col = settings["feature-encoder"].vocabulary_
    return (value - scaler_settings[0][feature_to_col[feature]])/scaler_settings[1][feature_to_col[feature]]

def feature_inv_map(value, feature, settings):
    if value is None:
        return None
    scaler_settings = (settings["feature-scaler"].mean_, settings["feature-scaler"].scale_)
    feature_to_col = settings["feature-encoder"].vocabulary_
    return (value*scaler_settings[1][feature_to_col[feature]]) + scaler_settings[0][feature_to_col[feature]]

with open(settings_filename) as settings_file:
    settings = pickle.load(settings_file)
    model = tf_model.Model(settings=settings["model-settings"])
    model.load(model_path)

    feature_to_col = settings["feature-encoder"].vocabulary_

    with open(representatives_filename) as representatives_file:
        representatives = json.load(representatives_file)

        for feature in representatives:
            for i in range(len(representatives[feature])):
                representatives[feature][i] = feature_map(representatives[feature][i], feature, settings)

    with open(samples_filename) as  file:
        rows = tf_load.importCSV(file)
        data = tf_load.generateData(rows, settings)

    batch = tf_load.get_batch(data, batched=False)
    predictions = model.predict(batch)

    results = []
    for i in range(predictions.shape[0]):
        score_result = {"steamid": data.steamids[i], "data": {}}
        for subscore in model.result_entries:
            score_result["data"][subscore] = {
                "score": float(predictions[i][model.result_entries[subscore]]),
                "skills":  {}
            }
        results.append(score_result)



    sampled_inputs = make_sampled_variations(batch, representatives, feature_to_col )
    target_offset = 1
    for i in sampled_inputs:
        for feature in sampled_inputs[i]["features"]:
            if feature in feature_to_subscore:
                sample_batch = {
                        "features": sampled_inputs[i]["features"][feature],
                        "features_hero": sampled_inputs[i]["hero"],
                        "labels": sampled_inputs[i]["label"]
                    }
                sample_predictions = model.predict(sample_batch)
                sampled_pairs = [(j, float(representatives[feature][j]), float(sample_predictions[j][model.result_entries["IMR"]])) for j in range(n_representatives)]
           
                my_value = float(batch["features"][i,feature_to_col[feature]])
                my_imr = float(predictions[i][model.result_entries["IMR"]])
                sampled_pairs.append((n_representatives, my_value, my_imr))

                sampled_pairs.sort(key=(lambda entry: entry[2]))
                index = None

                improved_imrs = []
                improved_values = []
                improved_pairs = []
                for j in range(len(sampled_pairs)):
                    if sampled_pairs[j][0] == n_representatives:
                        index = j
                    elif index is not None:
                        improved_values.append(sampled_pairs[j][1])
                        improved_imrs.append(sampled_pairs[j][2])
                        improved_pairs.append(sampled_pairs[j])

                imrs = np.array([ent[2] for ent in sampled_pairs])
                values = np.array([ent[1] for ent in sampled_pairs])
                coeffs, residual,_,_,_  =  np.polyfit(values, imrs, 1, full=True)

                optimal_distance = 0.5

                improved_pairs.sort(key=(lambda entry:
                     (entry[2] - (float(coeffs[1])+float(coeffs[0])*entry[1]))**2  + #sample should represent the general trend - squared distance to line
                     ((abs(entry[1] - my_value) - optimal_distance) * float(coeffs[0]) )**2 + #sample should be about <optimal dstance> away from real - squared distance from 0.5 offset(), penalized in IMR score(scaled by coeff)
                      (float(coeffs[0]) *3)/(entry[2] - my_imr + 1)**2 #sample should be better - penalise closeness to real solution
                     ))
                skill_analysis = {
                    "value": feature_inv_map(float(batch["features"][i,feature_to_col[feature]]), feature, settings),
                    "index": index,
                    "improved-score": improved_pairs[0][2] if len(improved_pairs) > 0 else None,#mean(improved_imrs),
                    "improved-value": feature_inv_map(improved_pairs[0][1], feature, settings) if len(improved_pairs) > 0 else None,#feature_inv_map(mean(improved_values), feature, settings),
                    "impact": float(coeffs[0]),
                    "certainty": math.sqrt(float(residual[0])/len(sampled_pairs))
                    #,"scaling": [float(settings["feature-scaler"].mean_[settings["feature-encoder"].vocabulary_[feature]]), float(settings["feature-scaler"].scale_[settings["feature-encoder"].vocabulary_[feature]])]
                    #,"samples": sampled_pairs
                }

                results[i]["data"][feature_to_subscore[feature]]["skills"][feature] = skill_analysis

    print json.dumps(results)


   
            
