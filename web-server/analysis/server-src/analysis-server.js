// analysis - server.js
var child_process   = require("child_process"),
    async           = require("async");

var config          = require("./config.js"),
    database          = require("./database.js");

var check_interval = 5000;

checkJobs();

function checkJobs()
{
    var locals = {};
    async.waterfall(
        [
            database.connect,
            function(client, done_client, callback)
            {
                locals.client = client;
                locals.done = done_client;
                locals.client.query(
                    "SELECT rf.id FROM ReplayFiles rf, ProcessingStatuses ps WHERE rf.processing_status=ps.id AND ps.label = $1;",
                    ["uploaded"],
                    callback);
            },
            function(results, callback)
            {
                async.eachSeries(results.rows, processReplay, callback);
            }
        ],
        function(err)
        {
            if (err)
                console.log(err);
            locals.done();
            console.log("finished check_jobs");
            setTimeout(checkJobs, check_interval);
        }
    );
}

function processReplay(replay_row, callback_replay)
{
    console.log("processing replay", replay_row);
    var locals = {};
    locals.replayfile_id = replay_row.id;
    async.waterfall(
        [
            database.connect,
            function(client, done_client, callback)
            {
                console.log("got db client");
                locals.client = client;
                locals.done = done_client;

                locals.client.query(
                    "UPDATE ReplayFiles rf SET processing_status=(SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$2) WHERE rf.id=$1 RETURNING rf.file;",
                    [locals.replayfile_id, "extracting"],
                    callback);
            },
            function(results, callback)
            {
                if(results.rowCount != 1)
                {
                    callback("Setting replayfile as processing failed", results);
                }
                else
                {
                    console.log("starting java");
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
                        "SELECT id FROM Matches WHERE id=$1;",
                        [locals.match_id],
                        callback);
                }
            },
            function(results, callback)
            {
                if(results.rowCount != 0)
                {
                    locals.client.query(
                        "UPDATE ReplayFiles rf SET match_id=$2, processing_status=(SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$3) WHERE rf.id=$1;",
                        [locals.replayfile_id, locals.match_id, "registered"],
                        function(err, results)
                        {
                            if(err) callback(err,results);
                            else callback("Duplicate replay", results);
                        }
                    );
                    
                    return;
                }
                else{
                    locals.client.query(
                                        "UPDATE ReplayFiles rf SET match_id=$2, processing_status=(SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$3) WHERE rf.id=$1;",
                                        [locals.replayfile_id, locals.match_id, "analysing"],
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
                locals.match_dir = config.storage+"/"+locals.match_id;
                locals.analysis_file = config.shared+"/matches/"+locals.match_id+".json";
                locals.header_file = config.shared+"/match_headers/"+locals.match_id+".json";
                child_process.execFile(
                    "python",
                    ["/analysis/analysis.py", locals.match_id, locals.match_dir, locals.analysis_file, locals.header_file],
                    callback);
            },
            function (stdout, stderr, callback) 
            {
                console.log('pystdout: ' + stdout);
                console.log('pystderr: ' + stderr);

                locals.client.query(
                    "INSERT INTO Matches(id, label, file, header_file, replayfile_id) VALUES ($1, $2, $3, $4, $5);",
                    [locals.match_id, "", locals.analysis_file, locals.header_file, locals.replayfile_id],
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
                        console.log("put replayfile as failed", locals.replayfile_id, err);
                        locals.done();
                        callback_replay(null);
                    });
            }
            else
            {
                console.log("fin~", locals.replayfile_id);
                locals.done();
                callback_replay(null);
            }
        }
    );
}
