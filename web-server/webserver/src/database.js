var mongoose    = require("mongoose");

var config      = require("./config_local.js");

mongoose.connect("mongodb://"+config.database_host+"/wisdota"); // connect to our database

