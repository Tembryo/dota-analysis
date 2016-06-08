import time

import tf_load
import tf_model

import numpy as np

import datetime
import pickle
import json


logs_directory = "logs{:%Y-%m-%d_%H-%M}".format(datetime.datetime.now())
settings_filename = "settings{:%Y-%m-%d_%H-%M}.p".format(datetime.datetime.now())
eval_filename = "logs{:%Y-%m-%d_%H-%M}/evals.json".format(datetime.datetime.now())
error_filename = "logs{:%Y-%m-%d_%H-%M}/error.csv".format(datetime.datetime.now())
max_steps = 100000

with open("files/data.csv") as  file:
    rows = tf_load.importCSV(file)
    data = tf_load.generateData(rows, )

    settings = {
        "logs-dir": logs_directory,
        "n-features": data.features.shape[1],
        "n-hero-features": data.features_hero.shape[1],
        "feature-dict": dict([(v, i) for (i, v) in enumerate(data.feature_encoder.get_feature_names())])
    }

    all_settings = {}
    all_settings["model-settings"] = settings
    all_settings["hero-encoder"] = data.hero_encoder
    all_settings["feature-encoder"] = data.feature_encoder
    all_settings["feature-scaler"] = data.feature_scaler
    with open(settings_filename, "wb") as settings_file:
        pickle.dump(all_settings, settings_file)

    print "settings done"
    model = tf_model.Model(settings=settings)
    print model.result_entries

    with open(error_filename, "w") as error_file:
        error_file.write("step,train_error_all,test_error_all,train_error_imr,test_error_imr\n")
    #model.load(logs_directory)

    all_evals = {}
    for step in xrange(max_steps):
        start_time = time.time()

        batch = tf_load.get_batch(data)
        cost_value,imr_cost = model.train(batch)

        duration = time.time() - start_time

        # Write the summaries and print an overview fairly often.
        if step % 50 == 0:
            # Print status to stdout.
            print('Step %d: loss = %.2f (%.3f sec)' % (step, cost_value, duration))
            # Update the events file.
            model.update_log(step)

        if step % 200 == 0 or (step + 1) == max_steps:
            test_set = tf_load.get_test_set(data)
            predictions = model.predict(batch)
            cost_test,evals = model.evaluate(batch)
            both_labels = np.concatenate((batch["labels"],predictions), axis=1)
            np.savetxt("{}/results_{}.txt".format(logs_directory,step), both_labels, fmt='%.0f')
            for subset in evals:
                evals[subset] = [float(evals[subset][i]) for i in range(len(evals[subset]))]
                print "{}: {}".format(subset, evals[subset])
            all_evals[step] = evals
            print "!overall losses: train {} test {} \n\n".format(cost_value, cost_test)
            with open(eval_filename, "w") as eval_file:
                eval_file.write(json.dumps(all_evals))
            with open(error_filename, "a") as error_file:
                error_file.write("{},{},{},{},{}\n".format(step, float(cost_value), float(cost_test), float(imr_cost), evals["IMR"][2]))
            if step % 1000 == 0 or (step + 1) == max_steps:
                model.save(step)

