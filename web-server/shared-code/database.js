var pg          = require("pg"),
    async       = require("async");

var config      = require("./config.js");

var connection_string = "postgres://wisdota:"+config.database_pw+"@"+config.database_host+"/wisdota";

pg.on('error', function(error, client)
    {
        console.log("db client error", error);
    });

function getClient(){
    return new pg.Client(connection_string);
}

function no_op(){}

function query(sql, data, result_callback)
{
    var db_locals = {};
    db_locals.done = no_op;
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
exports.pg = pg;
exports.connection_string = connection_string;
exports.getClient = getClient;
exports.query = query;
exports.generateQueryFunction = generateQueryFunction;