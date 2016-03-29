var pg          = require("pg"),
    async       = require("async");

var config      = require("./config.js");

var connection_string = "postgres://"+config.database_auth+"@"+config.database_host+"/wisdota";

function getClient(){
    return new pg.Client(connection_string);
}

function query(sql, data, result_callback)
{
    var db_locals = {};
    async.waterfall(
        [
            function(callback)
            {
                pg.connect(connection_string, callback);
            },
            function(client, done_client, callback)
            {
                db_locals.client = client;
                db_locals.done = done_client;
                db_locals.client.query(
                    sql,
                    data,
                    callback);
            }
        ],
        function(err, results){
            db_locals.done();
            result_callback(err, results);
        }
    );
}

function generateQueryFunction(sql, data)
{
    return function(callback)
            {
                query(sql, data, callback);
            };
}


//exports.connect = pg.connect.bind(pg,"postgres://"+config.database_auth+"@"+config.database_host+"/wisdota"); // connect to our database

exports.getClient = getClient;
exports.query = query;
exports.generateQueryFunction = generateQueryFunction;