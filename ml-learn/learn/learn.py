import sys
import json
import csv
import numpy as np
from sklearn.feature_extraction import DictVectorizer
from sklearn import preprocessing

from sklearn.cross_validation import KFold
from sklearn.metrics import mean_squared_error,mean_absolute_error

from sklearn.svm import SVR
from sklearn import linear_model
from sklearn.tree import DecisionTreeRegressor
from sklearn import gaussian_process



n_folds = 20

def loadData(data_filename):
    labels = []
    data = []
    with open(data_filename) as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            label = None
            parsed_row = {}
            for key in row:
                if key == "MMR":
                    label = float(row[key])
                elif key == "hero":
                    pass
                else:
                    try:
                        parsed_row[key] = float(row[key])
                    except ValueError:
                        parsed_row[key] = row[key]
            labels.append(label)
            data.append(parsed_row)
    vectorizer = DictVectorizer()
    vectorized_data = vectorizer.fit_transform(data).toarray()
    vectorized_labels = np.array(labels)
    print vectorizer.get_feature_names()
    np.savetxt("/files/X.data", vectorized_data)
    np.savetxt("/files/Y.data", vectorized_labels)

    normalized_data = preprocessing.scale(vectorized_data)
    return (normalized_data,vectorized_labels)

model_types = ["linear", "SVRrbf","SVRlin","SVRpoly", "tree"]


def main():
    print "hello world - this is ml!"
    data_filename = sys.argv[1]
    model_filename = sys.argv[2]

    (X, y) = loadData(data_filename)
    n = y.shape[0]

    for model_type in model_types:
        kf = KFold(n, n_folds=n_folds)
        avg_sq_score = 0
        avg_abs_score = 0
        current_count = 0
        for train_index, test_index in kf:
            X_train, X_test = X[train_index], X[test_index]
            y_train, y_test = y[train_index], y[test_index]
            #print "Train X{} y{}".format(X_train.shape, y_train.shape)
            #print "Test X{} y{}".format(X_test.shape, y_test.shape)

            if model_type == "SVRrbf":
                clf = SVR(kernel='rbf',C=150.0, epsilon=50)
                clf.fit(X_train, y_train)
                y_predicted = clf.predict(X_test)
            if model_type == "SVRlin":
                clf = SVR(kernel='linear',C=150.0, epsilon=50)
                clf.fit(X_train, y_train)
                y_predicted = clf.predict(X_test)
            if model_type == "SVRpoly":
                clf = SVR(kernel='poly', degree=2, C=150.0, epsilon=50)
                clf.fit(X_train, y_train)
                y_predicted = clf.predict(X_test)
            elif model_type == "linear":
                lr = linear_model.LinearRegression()
                lr.fit(X_train, y_train)
                y_predicted = lr.predict(X_test)
            elif model_type == "tree":
                tree_reg = DecisionTreeRegressor(max_depth=5)
                tree_reg.fit(X_train, y_train)
                y_predicted = tree_reg.predict(X_test)
            #print "scoring"
            sq_score = mean_squared_error(y_test, y_predicted)
            abs_score = mean_absolute_error(y_test, y_predicted)
            #print "sq {}, abs {}".format(sq_score, abs_score)
            current_count += 1
            avg_sq_score += (sq_score - avg_sq_score)/current_count
            avg_abs_score += (abs_score - avg_abs_score)/current_count

        print "Model: {}\n Total averages: sqme {} absme {}".format(model_type, avg_sq_score, avg_abs_score)

    model = {"type": "mega-accurate ml model"}
    with open(model_filename,'wb') as model_file:
        model_file.write(json.dumps(model, sort_keys=True,indent=4, separators=(',', ': ')))    
        model_file.close()

if __name__ == "__main__":
    main()#cProfile.run('main()')

