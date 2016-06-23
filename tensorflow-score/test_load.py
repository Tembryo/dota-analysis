import tf_load
import pickle

settings_filename = "model_files/settings.p"

with open(settings_filename) as settings_file:
    settings = pickle.load(settings_file)

with open("files/data_test.csv") as  file:
    rows = tf_load.importCSV(file)
    data = tf_load.generateData(rows)