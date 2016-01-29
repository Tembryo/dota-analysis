import sys
import json

def main():
    print "hello world - this is ml!"
    data_filename = sys.argv[1]
    model_filename = sys.argv[2]

    model = {"type": "mega-accurate ml model"}
    with open(model_filename,'wb') as model_file:
    	model_file.write(json.dumps(model, sort_keys=True,indent=4, separators=(',', ': ')))    
    	model_file.close()

if __name__ == "__main__":
    main()#cProfile.run('main()')

