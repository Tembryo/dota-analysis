var async       = require("async");
var child_process   = require("child_process");

var database    = require("/shared-code/database.js"),
    storage     = require("/shared-code/storage.js");

async.waterfall(
    [
        function(callback)
        {
            database.query(
                "SELECT id, file, upload_filename FROM replayfiles WHERE file like '/replays/%';",
                [], callback);
        },
        function(result, callback)
        {
            //console.log(result.rows);
            console.log("fixing rows ", result.rows.length);

            var queue = async.queue(function(row, callback)
                {
                    fixReplay(row["id"], row["file"], row["upload_filename"], callback);
                }
                , 10); // Run 3 simultaneous uploads

            queue.drain = function() {
                console.log("All replays fixed");
                callback();
            };

            // Queue your files for upload
            queue.push(result.rows);
        }
    ],
    function(err, results)
    {
        console.log("done", err, results);
    }   
);

function fixReplay(replay_id, file, local_filename, callback)
{
    var locals = {};
    async.waterfall(
    [
        function(callback)
        {
            var full_filename = "/shared"+ file;
            //console.log(full_filename);
            child_process.exec("bzip2 "+full_filename, callback);
        },
        function(stdout, stderr, callback)
        {
            //console.log("compressed with output <", stdout, stderr,">");
            locals["stored_filename"]  = "replays/"+local_filename+".dem.bz2";
            //console.log("store as ", locals["stored_filename"]);
            storage.store(locals["stored_filename"],callback);
        },
        function(filename, callback)
        {
            database.query("UPDATE replayfiles SET file= $2 WHERE id=$1;", [replay_id, locals["stored_filename"]], callback);
        }
    ],
    function(e, result)
    {
        console.log("done with replay ",e,  local_filename);
        callback();
    });
}