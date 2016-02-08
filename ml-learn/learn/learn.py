import sys
import json
import csv
import numpy as np
from sklearn.feature_extraction import DictVectorizer
from sklearn import preprocessing

from sklearn.cross_validation import KFold
import sklearn.metrics as metrics 

from sklearn.svm import SVR
from sklearn import linear_model
from sklearn.tree import DecisionTreeRegressor
from sklearn import gaussian_process

import pickle

n_folds = 10


def loadData(data_filename):
    labels = []
    data = []
    print "loading"
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
    print "vectorizing"
    vectorizer = DictVectorizer()
    vectorized_data = vectorizer.fit_transform(data).toarray()
    vectorized_labels = np.array(labels)

    #np.savetxt("/files/X.data", vectorized_data)
    #np.savetxt("/files/Y.data", vectorized_labels)
    scaler = preprocessing.StandardScaler();
    scaler.fit(vectorized_data)
    scaled_data = scaler.transform(vectorized_data)
    #normalized_labels = label_scaler.transform(vectorized_labels)
    return (scaled_data,vectorized_labels, vectorizer, scaler)

model_types = [
                #"linear",
                #"ridge",
                #"bayridge",
                #"logit",
                #"SVRrbf",
                #"SVRlin",
                #"SVRpoly",
                #"tree"
                ]


def main():
    print "hello world - this is ml!"
    data_filename = sys.argv[1]
    model_filename = sys.argv[2]

    print "loading data"
    (X, y, vectorizer, scaler) = loadData(data_filename)
    n = y.shape[0]

    print "training models"
    for model_type in model_types:
        print "learning model {}".format(model_type)
        kf = KFold(n, n_folds=n_folds, shuffle=True)
        avg_var_score = 0
        avg_abs_score = 0
        avg_med_score = 0
        avg_sq_score = 0
        avg_r2_score = 0
        current_count = 0
        for train_index, test_index in kf:
            #print "learning fold {}/{}".format(current_count,n_folds)
            X_train, X_test = X[train_index], X[test_index]
            y_train, y_test = y[train_index], y[test_index]
            #print "Train X{} y{}".format(X_train.shape, y_train.shape)
            #print "Test X{} y{}".format(X_test.shape, y_test.shape)

            model = None
            if model_type == "linear":
                model = linear_model.LinearRegression()
            elif model_type == "ridge":
                model = linear_model.Ridge (alpha = 1)
            elif model_type == "bayridge":
                model = linear_model.BayesianRidge()
            elif model_type == "logit":
                model = linear_model.LogisticRegression(C=10, max_iter=1)
            elif model_type == "SVRrbf":
                model = SVR(kernel='rbf',C=50.0, epsilon=10)
            elif model_type == "SVRlin":
                model = SVR(kernel='linear',C=50.0, epsilon=10)
            elif model_type == "SVRpoly":
                model = SVR(kernel='poly', degree=2, C=50.0, epsilon=10)
            elif model_type == "tree":
                model = DecisionTreeRegressor(max_depth=4)

            model.fit(X_train, y_train)
            y_predicted = model.predict(X_test)

            #print "scoring"
            explained_variance_score = metrics.explained_variance_score(y_test, y_predicted)
            abs_score = metrics.mean_absolute_error(y_test, y_predicted)
            med_score = metrics.median_absolute_error(y_test, y_predicted)
            sq_score = metrics.mean_squared_error(y_test, y_predicted)
            r2_score = metrics.r2_score(y_test, y_predicted)
            #print "sq {}, abs {}".format(sq_score, abs_score)
            current_count += 1
            avg_var_score += (explained_variance_score - avg_var_score)/current_count
            avg_abs_score += (abs_score - avg_abs_score)/current_count
            avg_med_score += (med_score - avg_med_score)/current_count
            avg_sq_score += (sq_score - avg_sq_score)/current_count
            avg_r2_score += (r2_score - avg_r2_score)/current_count

        print "Model: {}\n Total averages: expvar {} absme {} abs medi {} sqme {} r2 {}".format(model_type, avg_var_score, avg_abs_score, avg_med_score, avg_sq_score, avg_r2_score)

    final_model = linear_model.LinearRegression()
    final_model.fit(X, y)
    #print final_model
    #print "coeffs {}".format(final_model.coef_)

    coeffs = dict(zip(vectorizer.get_feature_names(), final_model.coef_.tolist()))
    model = {"type": "LinearRegression",
                "vectorizer": vectorizer,
                "scaler": scaler,
                "model": final_model
                }

    with open(model_filename,'wb') as model_file:          
        pickle.dump(model, model_file)
    
    with open(model_filename+".log",'wb') as model_log:
        model_data = {"type": "LinearRegression", "coefficients": coeffs}
        model_log.write(json.dumps(model_data, sort_keys=True, indent=4, separators=(',', ': ')))    
        model_log.close()

if __name__ == "__main__":
    main()#cProfile.run('main()')

