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



class SingleModel:
    def __init__(self, model_type):
        self.vectorizer = DictVectorizer()
        self.scaler = preprocessing.StandardScaler();
        self.model_type = model_type

        self.subsets = {
            "All": ["durationMins", "GPM", "XPM", "fraction-lasthits", "fraction-creeps-lasthit", "average-check-duration", "checks-per-minute", "initiation-score", "fightsPerMin", "deaths", "kills", "time-fraction-visible"],
            "IMR": ["GPM", "XPM", "fraction-lasthits","average-check-duration", "checks-per-minute","initiation-score", "fightsPerMin", "deaths", "kills","time-fraction-visible"],
            "mechanics": ["average-check-duration", "checks-per-minute"],
            "farming": ["GPM", "XPM", "fraction-lasthits"],
            "fighting": ["initiation-score", "fightsPerMin", "deaths", "kills"],
            "movement": ["time-fraction-visible"]
        }

        self.subset_indices = {} #fill dynamically

        self.models = {}
        for subset in self.subsets:
            self.models[subset] = createModel(model_type)

    def fit(self, imported):
        self.fitTransform(imported)
        (labels, data) = self.load(imported)
        self.fitModel(labels, data)

    def fitTransform(self, imported):
        (labels, data) = imported
        (X,) = data
        self.vectorizer.fit(X) 
        for subset in self.subsets:
            self.subset_indices[subset] = []
            for key in self.subsets[subset]:
                if key in self.vectorizer.vocabulary_:
                    self.subset_indices[subset].append(self.vectorizer.vocabulary_[key])

        print self.subsets
        print self.subset_indices
        vectorized_data = self.vectorizer.transform(X).toarray()

        self.scaler.fit(vectorized_data)
        #scaled_data = self.scaler.transform(vectorized_data)

    def fitModel(self, labels, data):
        (X,) = data

        for subset in self.subsets:
            X_subset = X[:,self.subset_indices[subset]]
            self.models[subset].fit(X_subset, labels)


    def load(self, imported):
        (labels, data) = imported
        (X,) = data
        vectorized_data = self.vectorizer.transform(X).toarray()
        scaled_data = self.scaler.transform(vectorized_data)

        y = np.array(labels)

        return (y, (scaled_data,))

    @staticmethod
    def importCSV(file):
        reader = csv.DictReader(file)
        labels = [] #either MMRs for training or steamids for rating
        heroes = []
        data = []
        for row in reader:
            label = None
            hero = None
            parsed_row = {}
            for key in row:
                if key == "MMR":
                    label = float(row[key])
                elif key == "steamid":
                   label = row[key] 
                elif key == "hero":
                    hero = row[key]
                else:
                    try:
                        parsed_row[key] = float(row[key])
                    except ValueError:
                        parsed_row[key] = row[key]
            heroes.append(hero)
            labels.append(label)
            data.append(parsed_row)
        return (labels, (data,))

    @staticmethod
    def separate(data, train_index, test_index):
        (X,) = data
        x_train = X[train_index]
        x_test = X[test_index]
        return ((x_train,), (x_test,))

    def predict(self, data):
        (X,) =  data

        result = {}
        for subset in self.subsets:
            X_subset = X[:,self.subset_indices[subset]]
            result[subset] = self.models[subset].predict(X_subset)
        return result

    def getLog(self):
        means = dict(zip(self.vectorizer.get_feature_names(), self.scaler.mean_.tolist()))
        stds = dict(zip(self.vectorizer.get_feature_names(), self.scaler.scale_.tolist()))

        model_data = {"type": "one-"+self.model_type,
                        "scaling": {"mean": means,"std": stds},
                        "models": {} 
                        }

        for subset in self.models:
            model_coeffs = {}
            if self.model_type == "linear" or self.model_type == "ridge":
                model_coeffs["coeffs"] = dict(zip(self.vectorizer.get_feature_names(), self.models[subset].coef_.tolist()))
                model_coeffs["intercept"] = self.models[subset].intercept_.tolist()
            model_data["models"][subset] = model_coeffs

        return model_data




model_types = [
                "linear",
                #"ridge",
                #"bayridge",
                #"logit",
                #"SVRrbf1",
                #"SVRrbf2",
                #"SVRrbf3",
                "SVRrbf4",
                #"SVRrbf5",
                #"SVRlin",
                #"SVRpoly",
                #"tree2",
                #"tree4",
                #"tree6"
                ]

composity_types = [#"herowin",
                    "single",
                    #"hero"
                     ]

def createModel(model_type):
    model = None
    if model_type == "linear":
        model = linear_model.LinearRegression()
    elif model_type == "ridge":
        model = linear_model.Ridge (alpha = 1)
    elif model_type == "bayridge":
        model = linear_model.BayesianRidge()
    elif model_type == "logit":
        model = linear_model.LogisticRegression(C=10, max_iter=1)
    elif model_type == "SVRrbf1":
        model = SVR(kernel='rbf',C=600.0, epsilon=75)
    elif model_type == "SVRrbf2":
        model = SVR(kernel='rbf',C=600.0, epsilon=100)
    elif model_type == "SVRrbf3":
        model = SVR(kernel='rbf',C=600.0, epsilon=150)
    elif model_type == "SVRrbf4":
        model = SVR(kernel='rbf',C=600.0, epsilon=200)
    elif model_type == "SVRrbf5":
        model = SVR(kernel='rbf',C=600.0, epsilon=250)
    elif model_type == "SVRlin":
        model = SVR(kernel='linear',C=50.0, epsilon=10)
    elif model_type == "SVRpoly":
        model = SVR(kernel='poly', degree=2, C=50.0, epsilon=10)
    elif model_type == "tree2":
        model = DecisionTreeRegressor(max_depth=2)
    elif model_type == "tree4":
        model = DecisionTreeRegressor(max_depth=4)
    elif model_type == "tree6":
        model = DecisionTreeRegressor(max_depth=6)

    return model

def evaluateModels(data_filename, logdir):
    n_folds = 10
    
    print "training models"
    for composite in composity_types:
        for model_type in model_types:

            print "learning model {}{}".format(composite,model_type)
            model = None
            if createModel(model_type) is None:
                print "reallyskipping unknown model {}".format(model_type)
                continue

            if composite == "single":
                model = SingleModel(model_type)
            #elif composite == "hero":
            #    model = HeroModel(model_type)
            #elif composite == "herowin":
            #    model = HeroWinModel(model_type)
            else:
                continue

            with open(data_filename) as datafile:
                imported = model.importCSV(datafile)

                model.fitTransform(imported)

                (labels, data) = model.load(imported)

                n = labels.shape[0]

                print "learning model {}".format(model_type)
                kf = KFold(n, n_folds=n_folds, shuffle=True)
                evaluation = {}
                score_types = ["explained variance", "mean absolute", "median absolute", "mean sqrt(squared err)","R2"]
                current_count = 0
                for subset in model.subsets:
                    evaluation[subset] = {}
                    for score_type in score_types:
                        evaluation[subset][score_type] = 0 

                for train_index, test_index in kf:
                    #print "learning fold {}/{}".format(current_count,n_folds)
                    data_train, data_test = model.separate(data, train_index, test_index)
                    y_train, y_test = labels[train_index], labels[test_index]
                    #print "Train X{} y{}".format(X_train.shape, y_train.shape)
                    #print "Test X{} y{}".format(X_test.shape, y_test.shape)

                    model.fitModel(y_train, data_train)
                    y_predicted = model.predict(data_test)

                    current_count += 1
                    for subset in model.subsets:
                        for score_type in score_types:
                            score = 0
                            if score_type == "explained variance":
                                score = metrics.explained_variance_score(y_test, y_predicted[subset])
                            elif score_type == "mean absolute":
                                score = metrics.mean_absolute_error(y_test, y_predicted[subset])
                            elif score_type == "median absolute":
                                score = metrics.median_absolute_error(y_test, y_predicted[subset])
                            elif score_type == "mean sqrt(squared err)":
                                score = metrics.mean_squared_error(y_test, y_predicted[subset])
                            elif score_type == "R2":
                                score = metrics.r2_score(y_test, y_predicted[subset])
                            evaluation[subset][score_type] += (score - evaluation[subset][score_type])/current_count

                print "Finished eval for model {}".format(model_type)

                with open(logdir+composite+"_"+model_type+"-log.json",'wb') as model_log:
                    model_report = model.getLog()
                    model_report["evaluation"] = evaluation
                    model_log.write(json.dumps(model_report, sort_keys=True, indent=4, separators=(',', ': ')))    
                    model_log.close()