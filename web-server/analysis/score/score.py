import json
import pickle
import sys

from model import *

def main():
    model_filename = sys.argv[1]
    samples_filename = sys.argv[2]

    with open(model_filename) as model_file:
        model = pickle.load(model_file)

        with open(samples_filename) as sample_file:
            (steamids, X) = model.load(model.importCSV(sample_file))

            y_predicted = model.predict(X)

            results = []
            for i in range(len(steamids)):
                score = {}
                for aspect in y_predicted:
                    score[aspect] = y_predicted[aspect][i]
                score["MMR"] = score["All"]
                score_result = {"steamid": steamids[i], "data": score}
                results.append(score_result)
            
            print json.dumps(results)


if __name__ == "__main__":
    main()#cProfile.run('main()')