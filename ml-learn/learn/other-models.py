
class HeroModel:
    def __init__(self, model_type):
        self.models = {}
        self.log_data = {}
        self.vectorizer = DictVectorizer()
        self.scalers = {}
        self.model_type = model_type

    def fit(self, imported):
        self.fitTransform(imported)
        (labels, data) = self.load(imported)
        self.fitModel(labels, data)

    def fitTransform(self, imported):
        (labels, (heroes, data)) = imported

        self.vectorizer.fit(data) 
        vectorized_data = self.vectorizer.transform(data).toarray()

        #individual scalers per hero
        #self.scaler.fit(vectorized_data)
        


    def fitModel(self, labels, data):
        (heroes, X) = data
        hero_list, reverse = np.unique(heroes, return_inverse = True)
        rows_dict = {}
        #print hero_list
        it = np.nditer(reverse, flags=['c_index'])
        while not it.finished:
            hero = hero_list[it[0]]
            if hero not in rows_dict:
                rows_dict[hero] = []
            rows_dict[hero].append(it.index)
            it.iternext()
        #print rows_dict
        for hero in hero_list:
            selected_X = X[rows_dict[hero]]
            selected_labels = labels[rows_dict[hero]]

            self.scalers[hero] = preprocessing.StandardScaler()
            self.scalers[hero].fit(selected_X)

            scaled_data = self.scalers[hero].transform(selected_X)
            #print "hero {} got {} samples".format(hero, len(rows_dict[hero]))
            self.models[hero] = createModel(self.model_type)

            self.models[hero].fit(scaled_data, selected_labels)

            means = dict(zip(self.vectorizer.get_feature_names(), self.scalers[hero].mean_.tolist()))
            stds = dict(zip(self.vectorizer.get_feature_names(), self.scalers[hero].scale_.tolist()))

            model_data = {}
            if self.model_type == "linear" or self.model_type == "ridge":
                model_data["coeffs"] = dict(zip(self.vectorizer.get_feature_names(), self.models[hero].coef_.tolist()))
                model_data["intercept"] = self.models[hero].intercept_.tolist()

            self.log_data[hero] = {"num_samples":len(rows_dict[hero]),
                                    "mmrstats": 
                                        {
                                        "mean":np.mean(selected_labels).tolist(),
                                        "std": np.std(selected_labels).tolist(),
                                        "min": np.min(selected_labels).tolist(),
                                        "max": np.max(selected_labels).tolist()
                                        },
                                    "scaling": {"mean": means, "stds": stds},
                                    "model": model_data }


    def load(self, imported):
        (labels, (heroes, data)) = imported
        vectorized_data = self.vectorizer.transform(data).toarray()
        #scaled_data = self.scaler.transform(vectorized_data)

        y = np.array(labels)
        vec_heroes =np.array( heroes, dtype=object)

        return (y, (vec_heroes, vectorized_data))

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
        return (labels, (heroes, data))

    @staticmethod
    def separate(data, train_index, test_index):
        (heroes, X,) = data
        x_train = X[train_index]
        x_test = X[test_index]
        heroes_train = heroes[train_index]
        heroes_test = heroes[test_index]
        return ((heroes_train, x_train), (heroes_test, x_test))

    def predict(self, data):
        (heroes, X) =  data
        y_array = []
        for i in range(len(heroes)):
            hero = heroes[i]
            #print "predicting {}".format(hero)
            sample = X[i].reshape(1, -1)
            scaled_sample = self.scalers[hero].transform(sample)
            y_predicted = self.models[hero].predict(scaled_sample)
            #print y_predicted.shape
            #print y_predicted
            y_array.append(y_predicted[0])

        return np.array(y_array)

    def getLog(self):
        model_data = {"type": "hero-"+self.model_type, "logdata": self.log_data}
        return model_data



class HeroWinModel:
    def __init__(self, model_type):
        self.models = {}
        self.log_data = {}
        self.vectorizer = DictVectorizer()
        self.scalers = {}
        self.model_type = model_type

    def fit(self, imported):
        self.fitTransform(imported)
        (labels, data) = self.load(imported)
        self.fitModel(labels, data)

    def fitTransform(self, imported):
        (labels, (heroes, wins, X))= imported

        self.vectorizer.fit(X) 
        #vectorized_data = self.vectorizer.transform(X).toarray()

        #individual scalers per hero
        #self.scaler.fit(vectorized_data)
        


    def fitModel(self, labels, data):
        (heroes, wins, X) = data
        hero_list, reverse = np.unique(heroes, return_inverse = True)
        rows_dict = {}
        #print hero_list
        it = np.nditer(reverse, flags=['c_index'])
        while not it.finished:
            hero = hero_list[it[0]]
            if hero not in rows_dict:
                rows_dict[hero] = {"win":[], "loss":[]}
            #print "{} {} {}".format(wins[it.index], wins[it.index], wins[it.index] >0 )
            if wins[it.index] > 0:
                rows_dict[hero]["win"].append(it.index)
            else:
                rows_dict[hero]["loss"].append(it.index)
            it.iternext()
        #print rows_dict
        for hero in hero_list:
            if len(rows_dict[hero]["win"]) == 0 or len(rows_dict[hero]["loss"]) == 0:
                print "{} wins {}".format(hero, len(rows_dict[hero]["win"]))
                print "{} losses {}".format(hero, len(rows_dict[hero]["loss"]))
                return
            selected_win_X = X[rows_dict[hero]["win"]]
            selected_win_labels = labels[rows_dict[hero]["win"]]
            selected_loss_X = X[rows_dict[hero]["loss"]]
            selected_loss_labels = labels[rows_dict[hero]["loss"]]

            self.scalers[hero] = {  "win":preprocessing.StandardScaler(),
                                    "loss": preprocessing.StandardScaler()}
            self.scalers[hero]["win"].fit(selected_win_X)
            self.scalers[hero]["loss"].fit(selected_loss_X)

            scaled_data_win = self.scalers[hero]["win"].transform(selected_win_X)
            scaled_data_loss = self.scalers[hero]["loss"].transform(selected_loss_X)
            #print "hero {} got {} samples".format(hero, len(rows_dict[hero]))
            self.models[hero] = {   "win":createModel(self.model_type),
                                    "loss": createModel(self.model_type)}

            self.models[hero]["win"].fit(scaled_data_win, selected_win_labels)
            self.models[hero]["loss"].fit(scaled_data_loss, selected_loss_labels)

            means_win = dict(zip(self.vectorizer.get_feature_names(), self.scalers[hero]["win"].mean_.tolist()))
            stds_win = dict(zip(self.vectorizer.get_feature_names(), self.scalers[hero]["win"].scale_.tolist()))
            means_loss = dict(zip(self.vectorizer.get_feature_names(), self.scalers[hero]["loss"].mean_.tolist()))
            stds_loss = dict(zip(self.vectorizer.get_feature_names(), self.scalers[hero]["loss"].scale_.tolist()))

            model_data_win = {}
            if self.model_type == "linear" or self.model_type == "ridge":
                model_data_win["coeffs"] = dict(zip(self.vectorizer.get_feature_names(), self.models[hero]["win"].coef_.tolist()))
                model_data_win["intercept"] = self.models[hero]["win"].intercept_.tolist()

            model_data_loss = {}
            if self.model_type == "linear" or self.model_type == "ridge":
                model_data_loss["coeffs"] = dict(zip(self.vectorizer.get_feature_names(), self.models[hero]["loss"].coef_.tolist()))
                model_data_loss["intercept"] = self.models[hero]["loss"].intercept_.tolist()

            self.log_data[hero+"-win"] = {"num_samples":len(rows_dict[hero]["win"]),
                                    "mmrstats": 
                                        {
                                        "mean":np.mean(selected_win_labels).tolist(),
                                        "std": np.std(selected_win_labels).tolist(),
                                        "min": np.min(selected_win_labels).tolist(),
                                        "max": np.max(selected_win_labels).tolist()
                                        },
                                    "scaling": {"mean": means_win, "stds": stds_win},
                                    "model": model_data_win }

            self.log_data[hero+"-loss"] = {"num_samples":len(rows_dict[hero]["loss"]),
                                    "mmrstats": 
                                        {
                                        "mean":np.mean(selected_loss_labels).tolist(),
                                        "std": np.std(selected_loss_labels).tolist(),
                                        "min": np.min(selected_loss_labels).tolist(),
                                        "max": np.max(selected_loss_labels).tolist()
                                        },
                                    "scaling": {"mean": means_loss, "stds": stds_loss},
                                    "model": model_data_loss }


    def load(self, imported):
        (labels, (heroes, wins, data)) = imported
        vectorized_data = self.vectorizer.transform(data).toarray()
        #scaled_data = self.scaler.transform(vectorized_data)

        y = np.array(labels)
        vec_heroes = np.array( heroes, dtype=object)
        vec_wins = np.array( wins, dtype=object)

        return (y, (vec_heroes, vec_wins, vectorized_data))

    @staticmethod
    def importCSV(file):
        reader = csv.DictReader(file)
        labels = [] #either MMRs for training or steamids for rating
        heroes = []
        wins = []
        data = []
        for row in reader:
            label = None
            hero = None
            win = None
            parsed_row = {}
            for key in row:
                if key == "MMR":
                    label = float(row[key])
                elif key == "steamid":
                   label = row[key] 
                elif key == "hero":
                    hero = row[key]
                elif key == "win":
                    win = float(row[key])
                else:
                    try:
                        parsed_row[key] = float(row[key])
                    except ValueError:
                        parsed_row[key] = row[key]
            heroes.append(hero)
            wins.append(win)
            labels.append(label)
            data.append(parsed_row)
        return (labels, (heroes, wins, data))

    @staticmethod
    def separate(data, train_index, test_index):
        (heroes, wins, X,) = data
        x_train = X[train_index]
        x_test = X[test_index]
        heroes_train = heroes[train_index]
        heroes_test = heroes[test_index]
        wins_train = wins[train_index]
        wins_test = wins[test_index]
        return ((heroes_train, wins_train, x_train), (heroes_test, wins_test, x_test))

    def predict(self, data):
        (heroes, wins, X) =  data
        y_array = []
        for i in range(len(heroes)):
            hero = heroes[i]
            win = None
            if wins[i]>0:
                win="win"
            else:
                win="loss"
            #print "predicting {}".format(hero)
            sample = X[i].reshape(1, -1)
            if not hero in self.scalers:
                y_array.append(0)
                continue
            scaled_sample = self.scalers[hero][win].transform(sample)
            y_predicted = self.models[hero][win].predict(scaled_sample)
            #print y_predicted.shape
            #print y_predicted
            y_array.append(y_predicted[0])

        return np.array(y_array)

    def getLog(self):
        model_data = {"type": "hero-"+self.model_type, "logdata": self.log_data}
        return model_data
