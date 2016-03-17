// analysis - server.js
var child_process   = require("child_process"),
    fs              = require("fs"),
    async           = require("async");

var config          = require("./config.js");

var database        = require("/shared-code/database.js"),
    services        = require("/shared-code/services.js");

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
            database.connect,
            function(client, done_client, callback)
            {
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
                        {"timeout":max_extraction_time,
                            "killSignal": "SIGKILL" },
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
                locals.stats_file = config.shared+"/match_stats/"+locals.match_id+".json";
                child_process.execFile(
                    "python",
                    ["/analysis/analysis.py", locals.match_id, locals.match_dir, locals.analysis_file, locals.header_file, locals.stats_file],
                    {"timeout":max_analysis_time},
                    callback);
            },
            function (stdout, stderr, callback) 
            {
                console.log('pystdout: ' + stdout);
                console.log('pystderr: ' + stderr);
                locals.client.query(
                    "SELECT id FROM Matches WHERE id=$1;",
                    [locals.match_id],
                    callback);
            },
            function(results, callback)
            {

                if(results.rowCount != 0)
                {
                    locals.client.query(
                        "UPDATE Matches m SET label=$2, file=$3, header_file=$4, stats_file=$5, replayfile_id=$6 WHERE m.id=$1;",
                        [locals.match_id, "", locals.analysis_file, locals.header_file, locals.stats_file, locals.replayfile_id],
                        callback
                    );
                }
                else{
                    locals.client.query(
                        "INSERT INTO Matches(id, label, file, header_file, stats_file, replayfile_id) VALUES ($1, $2, $3, $4, $5, $6);",
                        [locals.match_id, "", locals.analysis_file, locals.header_file, locals.stats_file, locals.replayfile_id],
                        callback);
                }
            },
            function(results, callback)
            {
                locals.client.query(
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
                locals.client.query(
                    "DELETE FROM Results r WHERE r.match_id=$1;",
                    [locals.match_id],
                    callback);
            },
            function(results, callback)
            {
                fs.readFile(locals.stats_file, 'utf8', callback);
            },
            function (statsfile, callback) {
                var match = JSON.parse(statsfile);
                locals.sample_filename = "/storage/samples"+locals.match_id+".csv";
                locals.csv_file = fs.createWriteStream(locals.sample_filename);
                writeSample(locals.csv_file, sampleHeader());
                locals.csv_file.on("close", function(){console.log("finished writing samples");callback();});

                for(var slot = 0; slot < 10; slot++)
                {
                    if(!match["player-stats"].hasOwnProperty(slot))
                        continue;
                    locals.csv_file.write("\n");
                    var fullsample = {"label": match["player-stats"][slot]["steamid"], "data": createSampleData(match, slot)};
                    writeSample(locals.csv_file,fullsample);
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
                var out = stdout.split("\n");
                async.each(out, function(score_line, callback)
                {
                    if(score_line.length == 0)
                    {
                        callback();
                        return;
                    }    
                    var score_result = JSON.parse(score_line);
                    locals.client.query(
                        "INSERT INTO Results (match_id, steam_identifier, data) VALUES($1, $2, $3)",
                        [locals.match_id, score_result["steamid"], score_result["data"]],
                        callback);
                },
                callback);
            }
        ],
        function(err, results)
        {
            if(err)
            {
                console.log("analysis error", arguments);
                locals.client.query(
                    "UPDATE ReplayFiles rf SET processing_status=(SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$2) WHERE rf.id=$1;",
                    [locals.replayfile_id, "failed"],
                    function()
                    {
                        console.log("put replayfile as failed", locals.replayfile_id, err);
                        locals.done();
                        var failed_message  =
                            {
                                "message": "AnalyseResponse",
                                "result": "failed",
                                "job": message["job"]
                            };
                        service.send(finished_message,
                            function(err, results){
                                callback();
                            });

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

                locals.done();
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
                fs.readFile(locals.stats_file, 'utf8', callback);
            },
            function (statsfile, callback)
            {
                locals.stats = JSON.parse(statsfile);
                callback();
            },
            function(callback)
            {
                locals.client.query(
                    "DELETE FROM MatchStats ms WHERE ms.id = $1;",
                    [locals.match_id],
                    callback);
            },
            function(results, callback)
            {
                locals.client.query(
                    "DELETE FROM PlayerStats ps WHERE ps.match_id = $1;",
                    [locals.match_id],
                    callback);
            },
            function(results, callback)
            {
                locals.client.query(
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
                            locals.client.query(
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

function sampleHeader()
{
    var header = {  "label":"steamid", 
                    "data": [   "hero",
                                "win",
                                "durationMins",
                                "GPM",
                                "XPM",
                                "fraction-creeps-lasthit",
                                "fraction-lasthits",
                                "checks-per-minute",
                                "average-check-duration",
                                "time-fraction-visible",
                                "kills",
                                "deaths",
                                "fightsPerMin",
                                "initiation-score"]};
    return header;
}

function createSampleData(match, slot)
{
    var id;
    if(slot < 128)
        id = slot;
    else
        id = slot - 128 + 5;
    var match_stats = match["match-stats"];
    if(!match["player-stats"].hasOwnProperty(id))
        return [];
    var player_stats = match["player-stats"][id];
    var win = 0;
    if( (match_stats["winner"] === "radiant" && slot < 128) ||
        (match_stats["winner"] === "dire" && slot >= 128))
        win = 1;
    //console.log(match, match["player-stats"],id, match["player-stats"][id], player_stats);

    var durationMins =  (match_stats["duration"] /60);
    var fractionCreepsLasthit =  (match_stats["creeps-lasthit"] /match_stats["creeps-killed"]);
    var fractionLasthits =  (player_stats["lasthits"] /match_stats["creeps-lasthit"]);
    var checksPerMin = player_stats["n-checks"] / durationMins;
    var timeFractionVisible = player_stats["time-visible"] / durationMins;
    var fightsPerMin =  (player_stats["num-of-fights"] /durationMins);  
    var features =  [   player_stats["hero"],
                        win,
                        durationMins.toFixed(3),
                        player_stats["GPM"],
                        player_stats["XPM"],
                        fractionCreepsLasthit,
                        fractionLasthits,
                        checksPerMin,
                        player_stats["average-check-duration"],
                        timeFractionVisible,
                        player_stats["num-of-kills"],
                        player_stats["num-of-deaths"],
                        fightsPerMin,
                        player_stats["initation-score"]
                        ];
    return features;    
}

function writeSample(file, sample)
{
    if(sample.length == 0)
        return;
    var line = "";
    line += sample["label"]+",";
    for(var feature_i = 0; feature_i < sample["data"].length; feature_i ++)
    {
        line += sample["data"][feature_i];
        if(feature_i +1 < sample["data"].length )
            line += ",";
    }
    file.write(line)
}