var pg          = require("pg");

var config      = require("./config.js");

function getClient(){
    return new pg.Client("postgres://"+config.database_auth+"@"+config.database_host+"/wisdota");
}

exports.connect = pg.connect.bind(pg,"postgres://"+config.database_auth+"@"+config.database_host+"/wisdota"); // connect to our database
exports.getClient = getClient;