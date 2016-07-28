import time

import tf_load
import tf_model

import numpy as np

import datetime
import pickle
import json

np.set_printoptions(suppress=True, precision=3)


logs_directory = "logs{:%Y-%m-%d_%H-%M}".format(datetime.datetime.now())
settings_filename = "settings{:%Y-%m-%d_%H-%M}.p".format(datetime.datetime.now())
eval_filename = "logs{:%Y-%m-%d_%H-%M}/evals.json".format(datetime.datetime.now())
predictions_filename = "logs{:%Y-%m-%d_%H-%M}/predictions.txt".format(datetime.datetime.now())
best_model_filename = "logs{:%Y-%m-%d_%H-%M}/best-model.ckpt".format(datetime.datetime.now())
parameters_file = "logs{:%Y-%m-%d_%H-%M}/pra".format(datetime.datetime.now())

step_delay_after_minimum  = 500
max_steps = 120000

def main():
    with open("files/data_train.csv") as  file:
        rows = tf_load.importCSV(file)
        data = tf_load.generateData(rows)
        full_data = tf_load.get_batch(data, batched=False)

    with open("files/data_test.csv") as test_file:
        test_rows = tf_load.importCSV(test_file)
        test_dataset = tf_load.generateData(test_rows)
        test_data = tf_load.get_batch(test_dataset, batched=False)

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

    #model.load(logs_directory)

    log_evals = True
    all_evals = {}
    best_selection_metric = - float("inf")
    best_step = 0
    best_eval = {}
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
            start_time_eval = time.time()
            cost_all,evals = model.evaluate(full_data)
            cost_all_test,evals_test = model.evaluate(test_data)
            duration_eval = time.time() - start_time_eval
            print "\n\n!Evaluation took %.3f sec"%duration_eval
            print "\n!overall loss: {}".format(cost_all)
            for subset in evals:
                evals[subset] = [float(evals[subset][i]) for i in range(len(evals[subset]))]
                print "{}: {}".format(subset, evals[subset])
            
            if log_evals:
                all_evals[step] = evals
                with open(eval_filename, "w") as eval_file:
                    eval_file.write(json.dumps(all_evals))

            print "\n!test loss: {}".format(cost_all_test)
            sum_test_r2s = 0
            for subset in evals_test:
                evals_test[subset] = [float(evals_test[subset][i]) for i in range(len(evals_test[subset]))]
                print "{}: {}".format(subset, evals_test[subset])
                sum_test_r2s += float(evals_test[subset][0])

            if sum_test_r2s > best_selection_metric:
                print "new best model at {}".format(step)
                model.save(step, filename=best_model_filename)
                best_selection_metric = sum_test_r2s
                best_step = step
                best_eval = evals_test

                test_predictions = model.predict(test_data)
                np.savetxt(predictions_filename, test_predictions)
                
            if step - best_step > step_delay_after_minimum:
                break
            if step % 1000 == 0 or (step + 1) == max_steps:
                #with open("{}/parameters_{}.json".format(logs_directory,step), "w") as parameters_file:
                #    model_params = model.get_parameters()
                #    for key in model_params:
                #        model_params[key] = model_params[key].tolist()
                #    parameters_file.write(json.dumps(model_params))
                model.save(step)
    print "done"

    print "Best model at step {}, cost {}".format(best_step, best_selection_metric)
    for subset in best_eval:
        print "{}: {}".format(subset, best_eval[subset])

if __name__ == "__main__":
    main()