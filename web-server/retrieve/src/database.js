var pg          = require("pg");

var config      = require("./config.js");

exports.connect = pg.connect.bind(pg,"postgres://"+config.database_auth+"@"+config.database_host+"/wisdota"); // connect to our database
