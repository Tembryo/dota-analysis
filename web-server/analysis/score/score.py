import json
#from sklearn.feature_extraction import DictVectorizer
#from sklearn import preprocessing
import pickle
import sys
import csv

def loadData(data_filename, vectorizer, scaler):
    labels = []
    data = []
    with open(data_filename) as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            label = None
            parsed_row = {}
            for key in row:
                if key == "steamid":
                    label = row[key]
                else:
                    try:
                        parsed_row[key] = float(row[key])
                    except ValueError:
                        parsed_row[key] = row[key]
            labels.append(label)
            data.append(parsed_row)

    vectorized_data = vectorizer.transform(data).toarray()
    scaled_data = scaler.transform(vectorized_data)

    return (labels, scaled_data)

def main():
    model_filename = sys.argv[1]
    samples_filename = sys.argv[2]

    with open(model_filename) as model_file:
        model_data = pickle.load(model_file)

        (steamids, X) = loadData(samples_filename, model_data["vectorizer"], model_data["scaler"])

        y_predicted = model_data["model"].predict(X)

        for i in range(len(steamids)):
            score_result = {"steamid": steamids[i], "data": {"MMR": y_predicted[i]}}
            print json.dumps(score_result)


if __name__ == "__main__":
    main()#cProfile.run('main()')