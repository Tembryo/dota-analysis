import sys
import json
import pickle

from model import *


def main():
    print "hello world - this is ml!"
    data_filename = sys.argv[1]
    model_filename = sys.argv[2]

    print "loading data"

    model = LinearRegression()
    with open(data_filename) as datafile:
        model.fit(datafile)

    with open(model_filename,'wb') as model_file:          
        pickle.dump(model, model_file)
    
    with open(model_filename+"-log.json",'wb') as model_log:

        model_log.write(json.dumps(model.getLog(), sort_keys=True, indent=4, separators=(',', ': ')))    
        model_log.close()

if __name__ == "__main__":
    main()#cProfile.run('main()')

