// analysis - server.js
var child_process   = require("child_process"),
    fs              = require("fs"),
    async           = require("async"), 
    bz2             = require('unbzip2-stream');

var config          = require("./config.js"),
    samples         = require("./samples.js")

var database        = require("/shared-code/database.js"),
    services        = require("/shared-code/services.js"),
    storage         = require("/shared-code/storage.js"),
    logging         = require("/shared-code/logging.js")("analysis-server");

var check_interval = 5000;
var max_extraction_time = 10*60*1000;
var max_analysis_time = 3*60*1000;
var max_score_time = 2*60*1000;




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
            logging.log("Analyse service started");
        }
    ]
);


function handleAnalysisServerMsg(server_identifier, message)
{
    switch(message["message"])
    {
        case "Analyse":
            var replay_id = message["id"];
            logging.log({"message": "trying to analyse ", "matchid": replay_id});
            processReplay(message,
                function()
                {
                    logging.log({"message": "finished analysing", "matchid": replay_id});
                });
            break;
        case "Score":
            var match_id = message["id"];
            logging.log({"message": "trying to score ", "matchid": replay_id});
            scoreReplay(message,
                function()
                {
                    logging.log({"message": "finished scoring", "matchid": replay_id});
                });
            break;
        default:
            logging.log({"message": "unknown message:", "server": server_identifier, "data": message});
            break;
    }
}


function processReplay(message, callback_replay)
{
    var replay_id = message["id"];
    logging.log({"message":"processing replay", "matchid": replay_id});
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
                        logging.log({"message":"decompressed "+decompressed_filename, "matchid": replay_id});
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
                    logging.log({"message":"starting java, file"+ decompressed_filename, "matchid": replay_id});
                    child_process.execFile(
                        "java", 
                        ["-jar", "/extractor/extractor.jar", decompressed_filename, config.storage+"/"],
                        {
                            //"timeout":max_extraction_time,
                            //"killSignal": "SIGKILL"
                        },
                        callback);
                } catch (e) {
                    callback("extracted file doesnt exist? "+decompressed_filename);
                }

            },
            function (stdout, stderr, callback) 
            {
                logging.log({"message":"java stdout: " + stdout, "matchid": replay_id});
                logging.log({"message":"java stderr: " + stderr, "matchid": replay_id});
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
                logging.log({"message":"pystdout: " + stdout, "matchid": replay_id});
                logging.log({"message":"pystderr: " + stderr, "matchid": replay_id});

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
                database.query("SELECT md.data as match_details FROM MatchDetails md WHERE md.matchid=$1;", [locals.match_id], callback);
            },
            function(results, callback)
            {
                if(results.rowCount!= 1)
                {
                    callback("bad match detailes from DB"+results.rows);   
                    return;
                }
                else if(!checkMatchDetails(results.rows[0]["match_details"]))
                {
                    callback("bad match details "+results.rows);   
                    return;
                }
                locals.match_details = results.rows[0]["match_details"];
                
                var stats_filename = config.shared+"/"+locals.stats_file;
                logging.log({"message": "stats at"+ stats_filename, "matchid": replay_id});
                fs.readFile(stats_filename, 'utf8', callback);
            },
            function (statsfile, callback) {
                var match = JSON.parse(statsfile);
                locals.sample_filename = "/storage/samples"+locals.match_id+".csv";
                locals.csv_file = fs.createWriteStream(locals.sample_filename);
                samples.writeSample(locals.csv_file, samples.header());
                locals.csv_file.on("close", 
                    function()
                    {
                        logging.log({"message":"finished writing samples", "matchid": replay_id});
                        callback();
                    });
                match["match-details"] = locals.match_details;
                for(var slot = 0; slot < 10; slot++)
                {
                    if(!match["player-stats"].hasOwnProperty(slot))
                        continue;
                    //TODO fix match details
                    locals.csv_file.write("\n");
                    //logging.log({"message": "steamid"+ match["player-stats"][slot]["steamid"], "matchid": replay_id});
                    var fullsample = {"label": match["player-stats"][slot]["steamid"], "data": samples.createSampleData(match, slot)};
                    samples.writeSample(locals.csv_file,fullsample);
                }
                locals.csv_file.end();
            },
            function(callback){
                child_process.execFile(
                    "python",
                    ["/score/score.py", locals.sample_filename],
                    {"timeout":max_score_time},
                    callback);
            },
            function(stdout, stderr, callback){
                logging.log({"message": "finished scoring", "matchid": replay_id});
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
                logging.error({"message": "analysis error", "err": err, "result": results});
                database.query(
                    "UPDATE ReplayFiles rf SET processing_status=(SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$2) WHERE rf.id=$1;",
                    [locals.replayfile_id, "failed"],
                    function()
                    {
                        logging.log({"message": "put replayfile as failed", "matchid":locals.replayfile_id, "err": err});
                        var failed_message  =
                            {
                                "message": "JobResponse",
                                "result": "failed",
                                "job": message["job"]
                            };
                        services.notifyScheduler(failed_message);

                        callback_replay();
                    });
            }
            else
            {
                logging.log({"message": "fin~", "replayid":locals.replayfile_id, "matchid": locals.match_id});

                var finished_message  =
                {
                    "message": "JobResponse",
                    "result": "finished",
                    "job": message["job"]
                };
                services.notifyScheduler(finished_message);

                callback_replay();
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
                            logging.log("Slot not in statsfile "+ slot);
                            callback_player();
                        }

                    }, 
                    callback
                );
            },
        ],
        function(err, results){
            if(!err)
                logging.log("saved stats in db");
            callback(err, results);
        }
        
    );
}


function scoreReplay(message, callback_replay)
{
    var match_id = message["id"];
    logging.log({"message":"scoring replay", "matchid":match_id});
    var locals = {};
    locals.match_id = match_id;
    async.waterfall(
        [
            function(callback)
            {
                database.query(
                    "DELETE FROM Results r WHERE r.match_id=$1;",
                    [locals.match_id],
                    callback);
            },

            function(result, callback)
            {
                locals.sample_filename = "/storage/samples"+locals.match_id+".csv";
                locals.csv_file = fs.createWriteStream(locals.sample_filename);
                samples.writeSample(locals.csv_file, samples.header());
                locals.csv_file.on("close", 
                    function()
                    {
                        logging.log("finished writing samples");
                        callback();
                    });

                appedMatchSamples(locals.match_id, locals.csv_file, 
                    function(e)
                    {
                        if(e)
                            callback(e);
                        else
                        {
                            locals.csv_file.end();
                        }
                    });
            },
            function(callback){
                child_process.execFile(
                    "python",
                    ["/score/score.py", locals.sample_filename],
                    {"timeout":max_score_time},
                    callback);
            },
            function(stdout, stderr, callback){
                var results = JSON.parse(stdout);
                logging.log("finished scoring" + results.length);
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
                fs.unlink(locals.sample_filename, callback);
            }
        ],
        function(err, results)
        {
            if(err)
            {
                logging.error({"message": "scoring error", "err": err, "result": results});
                database.query(
                    "UPDATE ReplayFiles rf SET processing_status=(SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$2) WHERE rf.match_id=$1;",
                    [locals.match_id, "failed"],
                    function()
                    {
                        logging.log({"message": "score-put replayfile as failed", "matchid":locals.match_id,"err": err});
                        var failed_message  =
                            {
                                "message": "JobResponse",
                                "result": "failed",
                                "job": message["job"]
                            };
                        services.notifyScheduler(failed_message);

                        callback_replay();
                    });
            }
            else
            {
                logging.log({"message": "scored~", "matchid":locals.match_id});

                var finished_message  =
                {
                    "message": "JobResponse",
                    "result": "finished",
                    "job": message["job"]
                };
                services.notifyScheduler(finished_message);

                callback_replay();
            }
        }
    );
}

function appedMatchSamples(matchid, csv_file, match_callback)
{
    var locals = {};
    async.waterfall(
    [
        function(callback)
        {
            database.query("SELECT ps.steam_identifier as steam_identifier, ms.data as match_data, ps.data as player_data, md.data as match_details "+
                "FROM MatchStats ms, PlayerStats ps, MatchDetails md WHERE ms.id=$1 AND ps.match_id=ms.id  AND md.matchid=ms.id;", [matchid], callback);
        },
        function(results, callback)
        {
            //console.log("writing samples", matchid, results.rows.length)
            for(var i = 0; i < results.rowCount; i++)
            {
                //console.log("writing",i);
                csv_file.write("\n");
                var slot = results.rows[i]["slot"];
                if(slot >= 128)
                    slot = slot - 128 + 5;

                if(!checkMatchDetails(results.rows[i]["match_details"]))
                {
                    callback("bad match details:"+(results.rows[i]["match_details"]));
                    return;
                }
                else
                {
                    //console.log("good match details");
                }

                var match = 
                {
                    "match-stats": results.rows[i]["match_data"], 
                    "match-details": results.rows[i]["match_details"], 
                    "player-stats": {}
                }
                match["player-stats"][slot] = results.rows[i]["player_data"];
                
                var fullsample = {"label": results.rows[i]["steam_identifier"], "data": samples.createSampleData(match, slot)};
                samples.writeSample(csv_file,fullsample);
            }
            callback();
        }
    ],
    match_callback);
}

function checkMatchDetails(details)
{
    if(!details)
        return false;
    else if(!details["players"])
        return false;
    else if(details["players"].length < 10)
        return false;
    else
        return true;
}