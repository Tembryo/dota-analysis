import time

import tf_load
import tf_model

import numpy as np

import datetime
import pickle
import json


import os
dn = os.path.dirname(os.path.realpath(__file__))

settings_filename = dn+"/model_files/settings.p"
model_path = \
"logs2016-07-22_13-30/best-model.ckpt-1600"
#dn+"/model_files/wisdota-model.ckpt-99999"

test_data_filename = "files/data_test.csv"
prediction_filename = "test_prediction.txt"

def main():
    with open(settings_filename) as settings_file:
        settings = pickle.load(settings_file)
    settings["load_labels"] = True
    model = tf_model.Model(settings=settings["model-settings"], logging=False)
    model.load(model_path)

    with open(test_data_filename) as  file:
        rows = tf_load.importCSV(file)
        data = tf_load.generateData(rows, settings)

    batch = tf_load.get_batch(data, batched=False)
    prediction = model.predict(batch)

    cost, evaluation = model.evaluate(batch)

    print "Cost: {}".format(cost)
    for subset in evaluation:
        evaluation[subset] = [float(evaluation[subset][i]) for i in range(len(evaluation[subset]))]
        print "{}: {}".format(subset, evaluation[subset])

    prediction_with_labels=  np.concatenate((data.labels, prediction), axis=1)
    np.savetxt(prediction_filename, prediction_with_labels,  fmt='%.0f')

np.set_printoptions(suppress=True, precision=3)
if __name__ == "__main__":
    main()