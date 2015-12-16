// analysis - server.js
var child_process   = require("child_process"),
    async           = require("async");

var config          = require("./config.js"),
    database          = require("./database.js");

var check_interval = 5000;

checkJobs();

function checkJobs()
{
    console.log("checking jobs");
    locals = {};
    async.waterfall(
        [
            database.connect,
            function(client, done_client, callback)
            {
                locals.client = client;
                locals.done = done_client;
                console.log("got client");
                locals.client.query(
                    "SELECT rf.id FROM ReplayFiles rf, ProcessingStatuses ps WHERE rf.processing_status=ps.id AND ps.label = $1;",
                    ["uploaded"],
                    callback);
            },
            function(results, callback)
            {
                console.log("queried replay files");
                async.each(results.rows, processReplay, callback);
            }
        ],
        function(err)
        {
            if (err)
                console.log(err);
            console.log("schedule next");
            setTimeout(checkJobs, check_interval);
        }
    );
}

function processReplay(replay_row, callback_replay)
{
    locals = {};
    locals.replayfile_id = replay_row.id;
    async.waterfall(
        [
            database.connect,
            function(client, done_client, callback)
            {
                locals.client = client;
                locals.done = done_client;

                locals.client.query(
                    "UPDATE ReplayFiles rf SET processing_status=(SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$2) WHERE rf.id=$1 RETURNING rf.file;",
                    [locals.replayfile_id, "processing"],
                    callback);
            },
            function(results, callback)
            {
                console.log('starting extract: ' + results);
                if(results.rowCount != 1)
                {
                    callback("Setting replayfile as processing failed", results);
                }
                else
                {
                    child_process.execFile(
                        "java", 
                        ["-jar", "/extractor/extractor.jar", config.shared+results.rows[0].file, config.storage+"/"],
                        callback);
                }
            },
            function (stdout, stderr, callback) 
            {
                console.log('java stdout: ' + stdout);
                console.log('java stderr: ' + stderr);
                locals.match_id = parseInt(stdout);
                if (stderr.length > 0 || locals.match_id < 0)
                {
                    callback('exec error: bad matchid'+stdout);
                }
                else
                {
                    locals.client.query(
                        "UPDATE ReplayFiles rf SET match_id=$2, processing_status=(SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$3) WHERE rf.id=$1;",
                        [locals.replayfile_id, locals.match_id, "extracted"],
                        callback);
                }
            },
            function(results, callback)
            {
                if(results.rowCount != 1)
                {
                    callback("Failed when updating replayfile after extraction", results);
                    return;
                }
                var match_dir = config.storage+"/"+match_id;
                var analysis_file = config.shared+"/matches/"+match_id+".json";
                var header_file = config.shared+"/match_headers/"+match_id+".json";
                child_process.execFile(
                    "python",
                    ["/analysis/analysis.py", locals.match_id, match_dir, analysis_file, header_file],
                    callback);
            },
            function (stdout, stderr, callback) 
            {
                console.log('pystdout: ' + stdout);
                console.log('pystderr: ' + stderr);

                locals.client.query(
                    "UPDATE ReplayFiles rf SET processing_status=(SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$2) WHERE rf.id=$1;",
                    [locals.replayfile_id, "analysed"],
                    callback);
            },
            function(results, callback)
            {
                if(results.rowCount != 1)
                {
                    callback("Failed when updating replayfile after analysis", results);
                }
                locals.client.query(
                    "INSERT INTO Matches(id, label, file, header_file, replayfile_id) VALUES ($1, $2, $3, $4, $5);",
                    [locals.match_id, "", analysis_file, header_file, locals.replayfile_id],
                    callback);
            },
            function(results, callback)
            {
                locals.client.query(
                    "UPDATE ReplayFiles rf SET processing_status=(SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$2) WHERE rf.id=$1;",
                    [locals.replayfile_id, "registered"],
                    callback);
            }
        ],
        function(err, results)
        {
            if(err)
            {
                locals.client.query(
                    "UPDATE ReplayFiles rf SET processing_status=(SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$2) WHERE rf.id=$1;",
                    [locals.replayfile_id, "failed"],
                    function()
                    {
                        console.log("put replayfile as failed", locals.replayfile_id);
                    });
            }
            else
            {
                console.log("fin~", locals.replayfile_id);
            }
            callback_replay(null);
        }
    );
}
