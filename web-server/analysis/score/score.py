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
            (steamids, X) = model.load(sample_file)

            y_predicted = model.predict(X)

            for i in range(len(steamids)):
                score_result = {"steamid": steamids[i], "data": {"MMR": y_predicted[i]}}
                print json.dumps(score_result)


if __name__ == "__main__":
    main()#cProfile.run('main()')