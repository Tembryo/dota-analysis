var async       = require("async");

var database = require("./database.js");

var config = {};

function loadConfig()
{
    async.waterfall(
        [
            function (callback)
            {

            }
        ],
        function (err, result)
        {

        }
    );
}

// main - run once to configure logging
loadConfig();

exports.log()