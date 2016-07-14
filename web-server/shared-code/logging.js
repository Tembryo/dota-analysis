var async       = require("async"),
    fs          = require("fs");

var config = require("./config.js"),
    database = require("./database.js"),
    machine = require("./machine.js");

var fallback_logfile = "logfile.txt";

function combineFilters(a, b)
{
    var combined = {};

    for (var key in a)
        combined[key] = a[key];
    for (var key in b)
        combined[key] = b[key];

    return combined;
}

var global_filters = {};//For all modules in this program

function writeLogMessage(filters, entry)
{
    var time = Date.now();//milliseconds
    async.waterfall(
        [
            database.generateQueryFunction("INSERT INTO LogEntries (time, filters, entry) VALUES (TO_TIMESTAMP($1::double precision / 1000), $2, $3);", [time, filters, entry]),
            function(result, callback)
            {
                if(result.rowCount != 1)
                {
                    callback("bad db insert"+result);

                }
                else
                    callback();
            }
        ],
        function(err, result)
        {
            if(err)
            {
                var log_str = "";
                log_str += (new Date()).toDateString()+ ","+ err+","+JSON.stringify(filters)+","+JSON.stringify(entry);

                var full_logfile_path = config.shared+"/"+fallback_logfile;
                fs.writeFile(full_logfile_path, log_str, function(err){
                    if(err)
                    {            
                        console.log("logging completely failed", err);
                        console.log((new Date()).toDateString(), filters, entry);
                    }
                    else
                    {

                    }
                });
            }
            else
            {
                //no callback for now
            }
        }
    );

}

module.exports = function(module_name, added_global_filters){
    if(added_global_filters)
        global_filters = combineFilters(global_filters, added_global_filters);

    var fixed_filters = {};
    fixed_filters = combineFilters(fixed_filters, global_filters);

    var generated_exports = {};

    machine.getMachineID(
        function(err, id){
            if(err)
                writeLogMessage({"module": "logging"}, {"message": "Couldn't find machineID", "err": err});
            else
            {
                fixed_filters["machine"] = id;
            }

        });

    fixed_filters["module"] = module_name;

    generated_exports.log = function(message, filters){
        var combined_filters = {};
        if(!filters)
            combined_filters = fixed_filters;
        else
            combined_filters = combineFilters(filters, fixed_filters);

        combined_filters = combineFilters(combined_filters, global_filters);

        var json_message = {};
        if(typeof message === 'string')
            json_message["message"] = message;
        else
            json_message = message;

        writeLogMessage(combined_filters, json_message);
    };

    generated_exports.error = function(message, filters){
        var annotated_filters = {};
        var error_filter = 
            {
                "type": "error"
            };

        if(!filters)
            annotated_filters = error_filter;
        else
            annotated_filters = combineFilters(filters,error_filter);

        generated_exports.log(message, annotated_filters);
    }

    generated_exports.addGlolbalFilter = function(filters){
        global_filters = combineFilters(global_filters, filters);
    }

    return generated_exports;
}

