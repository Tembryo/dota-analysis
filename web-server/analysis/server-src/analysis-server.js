// analysis - server.js
var child_process   = require("child_process"),
    fs              = require("fs"),
    async           = require("async"), 
    bz2             = require('unbzip2-stream');

var config          = require("./config.js"),
    samples         = require("./samples.js")

var database        = require("/shared-code/database.js"),
    services        = require("/shared-code/services.js"),
    storage         = require("/shared-code/storage.js");

var check_interval = 5000;
var max_extraction_time = 300000;
var max_analysis_time = 120000;
var max_score_time = 20000;




var service = null;
//THIS IS MAIN
async.series(
    [
        function(callback)
        {
            service = new services.Service("Analysis", handleAnalysisServerMsg, callback);
        },
        function(callback)
        {
            console.log("Analyse service started");
        }
    ]
);


function handleAnalysisServerMsg(server_identifier, message)
{
    switch(message["message"])
    {
        case "AnalyseResponse":
            //Sent by myself
            break;

        case "Analyse":
            var replay_id = message["id"];
            console.log("trying to analyse ",replay_id);
            processReplay(message,
                function()
                {
                    console.log("finished analysing", replay_id);
                });
            break;
        default:
            console.log("unknown message:", server_identifier, message);
            break;
    }
}


function processReplay(message, callback_replay)
{
    var replay_id = message["id"];
    console.log("processing replay", replay_id);
    var locals = {};
    locals.replayfile_id = replay_id;
    async.waterfall(
        [
            database.generateQueryFunction(
                "UPDATE ReplayFiles rf SET processing_status=(SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$2) WHERE rf.id=$1 RETURNING rf.file;",
                [locals.replayfile_id, "extracting"]),
            function(results, callback)
            {
                if(results.rowCount != 1)
                {
                    callback("Setting replayfile as extracting failed", results);
                }
                else
                {
                    storage.retrieve(results.rows[0].file, callback);
                }
            },
            function(local_filename, callback)
            {
                var bzip_extension = ".bz2";
                var dem_extension = ".dem";
                if(local_filename.substr(-bzip_extension.length) === bzip_extension)
                {
                    child_process.exec("bzip2 -d -f "+local_filename, function(err, stdout, stderr)
                    {
                        var decompressed_filename = local_filename.substr(0, local_filename.length - bzip_extension.length);
                        console.log("decompressed ", decompressed_filename);
                        callback(err, decompressed_filename)
                    });
                }
                else if(local_filename.substr(-dem_extension.length) === dem_extension)
                {
                    callback(null, local_filename);
                }
                else
                {
                    callback("Bad replay filename "+local_filename, local_filename);
                }
            },
            function(decompressed_filename, callback)
            {
                locals.decompressed_filename = decompressed_filename;
                try {
                    fs.accessSync(decompressed_filename, fs.F_OK);
                    console.log("starting java, file", decompressed_filename);
                    child_process.execFile(
                        "java", 
                        ["-jar", "/extractor/extractor.jar", decompressed_filename, config.storage+"/"],
                        {"timeout":max_extraction_time,
                            "killSignal": "SIGKILL" },
                        callback);
                } catch (e) {
                    callback("extracted file doesnt exist? "+decompressed_filename);
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
                    database.query(
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
                locals.analysis_file = "matches/"+locals.match_id+".json";
                locals.header_file = "match_headers/"+locals.match_id+".json";
                locals.stats_file = "match_stats/"+locals.match_id+".json";
                child_process.execFile(
                    "python",
                    ["/analysis/analysis.py", locals.match_id, locals.match_dir, config.shared+"/"+locals.analysis_file, config.shared+"/"+locals.header_file, config.shared+"/"+locals.stats_file],
                    {"timeout":max_analysis_time},
                    callback);
            },
            function (stdout, stderr, callback) 
            {
                console.log('pystdout: ' + stdout);
                console.log('pystderr: ' + stderr);

                storage.store(locals.analysis_file,callback);
            },
            function(store_path, callback)
            {
                locals.analysis_file = store_path;
                storage.store(locals.header_file,callback);
            },
           function(store_path, callback)
            {
                locals.header_file = store_path;
                database.query(
                    "SELECT id FROM Matches WHERE id=$1;",
                    [locals.match_id],
                    callback);
            },
            function(results, callback)
            {

                if(results.rowCount != 0)
                {
                    database.query(
                        "UPDATE Matches m SET label=$2, file=$3, header_file=$4, replayfile_id=$5, analysis_version=$6 WHERE m.id=$1;",
                        [locals.match_id, "", locals.analysis_file, locals.header_file, locals.replayfile_id, samples.version],
                        callback
                    );
                }
                else{
                    database.query(
                        "INSERT INTO Matches(id, label, file, header_file, replayfile_id, analysis_version) VALUES ($1, $2, $3, $4, $5, $6);",
                        [locals.match_id, "", locals.analysis_file, locals.header_file, locals.replayfile_id, samples.version],
                        callback);
                }
            },
            function(results, callback)
            {
                database.query(
                    "UPDATE ReplayFiles rf SET processing_status=(SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$2) WHERE rf.id=$1;",
                    [locals.replayfile_id, "registered"],
                    callback);
            },
            function(results, callback)
            {
                parseStatsFile(locals, callback);
            },
            function(results, callback)
            {
                database.query(
                    "DELETE FROM Results r WHERE r.match_id=$1;",
                    [locals.match_id],
                    callback);
            },
            function(results, callback)
            {
                var stats_filename = config.shared+"/"+locals.stats_file;
                console.log("stats at", stats_filename);
                fs.readFile(stats_filename, 'utf8', callback);
            },
            function (statsfile, callback) {
                var match = JSON.parse(statsfile);
                locals.sample_filename = "/storage/samples"+locals.match_id+".csv";
                locals.csv_file = fs.createWriteStream(locals.sample_filename);
                samples.writeSample(locals.csv_file, samples.header());
                locals.csv_file.on("close", function(){console.log("finished writing samples");callback();});

                for(var slot = 0; slot < 10; slot++)
                {
                    if(!match["player-stats"].hasOwnProperty(slot))
                        continue;
                    locals.csv_file.write("\n");
                    console.log("steamid", match["player-stats"][slot]["steamid"]);
                    var fullsample = {"label": match["player-stats"][slot]["steamid"], "data": samples.createSampleData(match, slot)};
                    samples.writeSample(locals.csv_file,fullsample);
                }
                locals.csv_file.end();
            },
            function(callback){
                child_process.execFile(
                    "python",
                    ["/score/score.py", "/score/model.p", locals.sample_filename],
                    {"timeout":max_score_time},
                    callback);
            },
            function(stdout, stderr, callback){
                console.log("after scoring:", stdout);
                console.log("----------------------");
                var results = JSON.parse(stdout);
                async.each(results, function(score_result, callback)
                {
                    database.query(
                        "INSERT INTO Results (match_id, steam_identifier, data) VALUES($1, $2, $3)",
                        [locals.match_id, score_result["steamid"], score_result["data"]],
                        callback);
                },
                callback);
            },
            function(callback)
            {
                fs.unlink(locals.decompressed_filename, callback);
            }
            ,
            function(callback)
            {
                fs.unlink(locals.sample_filename, callback);
            }
        ],
        function(err, results)
        {
            if(err)
            {
                console.log("analysis error", arguments);
                database.query(
                    "UPDATE ReplayFiles rf SET processing_status=(SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$2) WHERE rf.id=$1;",
                    [locals.replayfile_id, "failed"],
                    function()
                    {
                        console.log("put replayfile as failed", locals.replayfile_id, err);
                        var failed_message  =
                            {
                                "message": "AnalyseResponse",
                                "result": "failed",
                                "job": message["job"]
                            };
                        service.send(failed_message);

                        callback_replay(null);
                    });
            }
            else
            {
                console.log("fin~", locals.replayfile_id, locals.match_id);

                var finished_message  =
                {
                    "message": "AnalyseResponse",
                    "result": "finished",
                    "job": message["job"]
                };
                service.send(finished_message);

                callback_replay(null);
            }
        }
    );
}


function parseStatsFile(locals, callback)
{
    async.waterfall(
        [
            function(callback)
            {       
                fs.readFile(config.shared+"/"+locals.stats_file, 'utf8', callback);
            },
            function (statsfile, callback)
            {
                locals.stats = JSON.parse(statsfile);
                callback();
            },
            function(callback)
            {
                database.query(
                    "DELETE FROM MatchStats ms WHERE ms.id = $1;",
                    [locals.match_id],
                    callback);
            },
            function(results, callback)
            {
                database.query(
                    "DELETE FROM PlayerStats ps WHERE ps.match_id = $1;",
                    [locals.match_id],
                    callback);
            },
            function(results, callback)
            {
                database.query(
                    "INSERT INTO MatchStats(id, data) VALUES($1, $2);",
                    [locals.match_id, locals.stats["match-stats"]],
                    callback);
            },
            function(results, callback)
            {
                var slots = [];
                for(var i = 0; i < 10; ++i)
                {
                    slots.push(i);
                }
                async.each(
                    slots,
                    function(slot, callback_player)
                    {
                        if(locals.stats["player-stats"].hasOwnProperty(slot))
                        {
                            var ps = locals.stats["player-stats"][slot];
                            ps["slot"] = slot;
                            database.query(
                                "INSERT INTO PlayerStats(match_id, steam_identifier, data) VALUES($1, $2, $3);",
                                [locals.match_id, ps["steamid"], ps],
                                callback_player);
                        }
                        else
                        {
                            console.log("Slot not in statsfile ", slot);
                            callback_player();
                        }

                    }, 
                    callback
                );
            },
        ],
        function(err, results){
            if(!err)
                console.log("saved stats in db");
            callback(err, results);
        }
        
    );
}