// analysis - server.js
var child_process   = require("child_process"),
    fs              = require("fs"),
    async           = require("async");

var config          = require("./config.js"),
    database          = require("./database.js");

var concurrent_parse = require("semaphore")(7);
var concurrent_score = require("semaphore")(20);

var check_interval = 5000;
var max_extraction_time = 300000;
var max_analysis_time = 120000;
var max_score_time = 20000;

async.series(
    [
        registerListeners,
        resetStuff
    ]
);



function resetStuff(callback)
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
                    "UPDATE Replayfiles r "+
                    "SET processing_status =(SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label='uploaded') "+
                    "WHERE r.processing_status = (SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label='uploaded') OR "+
                        "r.processing_status = (SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label='analysing') OR "+
                        "r.processing_status = (SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label='extracting');",
                    [],
                    callback);
            },
            function(results, callback)
            {
                console.log("analyse reset:", results.rowCount)
                callback();
            }
        ],
        function(err, results)
        {
            if (err)
                console.log(err, results);
            locals.done();
            callback();
        }
    );
}
function registerListeners(callback)
{
    var client = database.getClient();
    client.connect(
        function(err)
        {
            if(err) {
                return console.error('could not connect to postgres', err);
            }

            client.on('notification', processNotification);

            client.query(
                "LISTEN replay_watchers;",
                [],
                function(err, results)
                {
                    if(!err)
                        console.log("added analyse listener");
                });
            client.query(
                "LISTEN score_watchers;",
                [],
                function(err, results)
                {
                    if(!err)
                        console.log("added score listener");
                });
          //no end -- client.end();
          callback();
        }
    );
}

function processNotification(msg)
{
    console.log("got notification", msg);
    var parts=msg.payload.split(",");
    if(parts.length != 2)
    {
        console.log("bad notification", msg);
        return;
    }
    switch(parts[0])
    {
        case "Analyse":
            var replay_id = parseInt(parts[1]);
            console.log("trying to analyse ",replay_id);
            concurrent_parse.take(
                function(){
                    console.log("got analyse ",replay_id);
                    processReplay(replay_id, function(){console.log("finished analysing", replay_id); concurrent_parse.leave();});

                });
            break;
        case "Score":
            var scoring_id = parseInt(parts[1]);
            concurrent_score.take(
                function(){
                    runScoreRequest(scoring_id,function(){console.log("finished scoring"); concurrent_score.leave();});
                });
            break;
        default:
            console.log("Unknown notification", msg);
    }
}

function processReplay(replay_id, callback_replay)
{
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
                    "INSERT INTO ScoreRequests (match_id) VALUES ($1);",
                    [locals.match_id],
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
                        callback_replay(null);
                    });
            }
            else
            {
                console.log("fin~", locals.replayfile_id, locals.match_id);
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

function runScoreRequest(scoring_id, callback_scored)
{
    var locals = {};
    async.waterfall(
        [
            database.connect,
            function(client, done_client, callback)
            {
                locals.client = client;
                locals.done = done_client;
                console.log("scsoring id ", scoring_id);
                locals.client.query(
                    "SELECT sr.id, m.stats_file, sr.match_id FROM ScoreRequests sr, Matches m WHERE m.id = sr.match_id AND sr.id=$1;",
                    [scoring_id],
                    callback);
            },
            function(results, callback)
            {
                if(results.rowCount != 1)
                {
                    callback("bad scorereq select", results);
                    return;
                }
                locals.request_id = results.rows[0]["id"];
                locals.match_id = results.rows[0]["match_id"];
                var filepath = results.rows[0]["stats_file"];
                fs.readFile(filepath, 'utf8', callback);
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
            if (err)
                console.log(err, results);
            locals.done();
            //console.log("finished check_jobs");
            //setTimeout(checkJobs, check_interval);
            callback_scored();
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