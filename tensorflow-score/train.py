import time

import tf_load
import tf_model

import numpy as np

import datetime
import pickle


logs_directory = "logs{:%Y-%m-%d_%H-%M}".format(datetime.datetime.now())
settings_filename = "settings{:%Y-%m-%d_%H-%M}.p".format(datetime.datetime.now())
max_steps = 100000

with open("files/data.csv") as  file:
    rows = tf_load.importCSV(file)
    data = tf_load.generateData(rows)

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


    #model.load(logs_directory)

    for step in xrange(max_steps):
        start_time = time.time()

        batch = tf_load.get_batch(data)
        cost_value = model.train(batch)

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
            evals = model.evaluate(batch)
            both_labels = np.concatenate((batch["labels"],predictions), axis=1)
            np.savetxt("{}/results_{}.txt".format(logs_directory,step), both_labels, fmt='%.0f')
            r2_dict = {}
            for subset in model.result_entries:
                r2_dict[subset] = float(evals[model.result_entries[subset]][0])
            print r2_dict
            model.save(step)

