import random
random.seed()

filename_in = "files/data.csv"

filename_train = "files/data_train.csv"
filename_test = "files/data_test.csv"

fraction_test = 0.2

with open(filename_in, "r") as infile:
    with open(filename_train, "w") as train_file:
        with open(filename_test, "w") as test_file:
            done_header = False
            for line in infile:
                if not done_header:
                    train_file.write(line)
                    test_file.write(line)
                    done_header = True
                else:
                    if random.random() < fraction_test:
                        test_file.write(line)
                    else:
                        train_file.write(line)
