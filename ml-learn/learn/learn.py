import sys
import json
import pickle
import sklearn
from model import *


def main():
    print "hello world - this is ml!"
    data_filename = sys.argv[1]
    model_dir = sys.argv[2]
    model_filename= model_dir+"model.p"

    print "evaluation"




    evaluateModels(data_filename,model_dir)

    print "creating real model"
    model = SingleModel("SVRrbf4")

    with open(data_filename) as datafile:
        imported = model.importCSV(datafile)
        model.fit(imported)


    with open(model_filename,'wb') as model_file:          
        pickle.dump(model, model_file)


if __name__ == "__main__":
    print 'The scikit-learn version is {}.'.format(sklearn.__version__)
    main()#cProfile.run('main()')

