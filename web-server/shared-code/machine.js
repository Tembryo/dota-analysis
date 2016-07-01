var async       = require("async"),
    fs          = require("fs");

var loaded_block = require('semaphore')(1);

var config      = require("./config.js"),
    database    = require("./database.js");


var machine_filename = "machine_config.json";

var machine_config =  null;
var loaded = "Loading";
var callbacks = [];
function load()
{
    var full_machine_filepath = config.shared+"/"+machine_filename;
    async.waterfall(
        [
            function (callback)
            {
                fs.stat(full_machine_filepath, function(err, stat) {
                    if(err == null) {
                        callback(null, "exists");
                    } else if(err.code == 'ENOENT') {
                        callback(null, "no-file");
                    } else {
                        callback(err, stat);
                    }
                });
            },
            function(file_status, callback)
            {
                if(file_status === "no-file")
                {
                    database.query("INSERT INTO Machines(last_registered) VALUES(now()) RETURNING id;",[], function(err, results)
                    {
                        if(err || results.rowCount != 1)
                            callback(err, results);
                        else
                        {
                            machine_config = {"id": results.rows[0]["id"]};

                            fs.writeFile(full_machine_filepath, JSON.stringify(machine_config), function(err)
                                {
                                    if (err)
                                        callback(err);
                                    else
                                        callback();
                                });

                        }   
                    });
                }
                else if(file_status === "exists")
                {
                    fs.readFile(full_machine_filepath, 'utf8', function(err, file_content)
                        {
                            if(err)
                                callback(err, file_content);
                            else
                            {
                                machine_config = JSON.parse(file_content);
                                callback();
                            }

                        });
                }
                else
                {
                    callback("unknown machine file status", file_status);
                }
            },
            function(callback)
            {
                database.query("UPDATE Machines SET last_registered = now() WHERE id=$1;",[machine_config["id"]], callback); 
            }
        ],
        function (err, result)
        {
            loaded_block.take(function()
                {
                    if(err)
                    {
                        console.log(err);
                        for(var i = 0; i < callbacks.length; i++)
                        {
                            callbacks[i](err,result);
                        }
                        loaded = "Failed";
                    }
                    else
                    {
                        loaded = "Ready";
                        console.log("loaded machineID, running cbs", callbacks.length)
                        for(var i = 0; i < callbacks.length; i++)
                        {
                            callbacks[i](null, machine_config["id"]);
                        }
                    }    
                    loaded_block.leave();
                });
        }
    );
}

load();

exports.getMachineConfig = function(callback)
{
    loaded_block.take(function()
        {
            switch(loaded)
            {
                case "Loading":
                    console.log("machine config not loaded yet");
                    callbacks.push(callback);
                    break;
                case "Ready":
                    callback(null, machine_config);
                    break;
                case "Failed":
                    callback(loaded);
                    break;
            }
            loaded_block.leave();
        });
};
exports.getMachineID = function(callback)
{
    loaded_block.take(function()
        {
            switch(loaded)
            {
                case "Loading":
                    console.log("machine config not loaded yet");
                    callbacks.push(callback);
                    break;
                case "Ready":
                    callback(null, machine_config["id"]);
                    break;
                case "Failed":
                    callback(loaded);
                    break;
            }
            loaded_block.leave();
        });
};