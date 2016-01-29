var child_process   = require("child_process"),
    async           = require("async"),
    fs              = require("fs");

var config          = require("./config.js"),
    database          = require("./database.js");

var max_extraction_time = 120*1000;
var max_analysis_time = 120*1000;
var max_learn_time = 300*1000;

stats = fs.lstatSync('/extract.jar');
console.log("extract", stats.isFile());
stats = fs.lstatSync('/files');
console.log("file-dir", stats.isDirectory());
stats = fs.lstatSync('/files-crawl');
console.log("crawl-dir", stats.isDirectory());
analyseMatches();

function analyseMatches()
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
                    "SELECT matchid FROM matches WHERE matches.status='dled' LIMIT 2;",
                    [],
                    callback);
            },
            function(results, callback)
            {
                async.eachSeries(results.rows, analyseMatch, callback);
            }
        ],
        function(err)
        {
            if (err)
                console.log(err);
            locals.done();
            console.log("finished analyseMatch");
            gatherData();
        }
    );
}

function analyseMatch(row, callback)
{
    console.log("processing replay", row);
    var locals = {};
    locals.matchid = row["matchid"];
    async.waterfall(
        [
            database.connect,
            function(client, done_client, callback)
            {
                console.log("got db client");
                locals.client = client;
                locals.done = done_client;

                callback();
            },
            function(callback)
            {
                console.log("starting java");
                child_process.execFile(
                    "java", 
                    ["-jar", "/extract.jar", "/files-crawl/replays/"+locals.matchid+".dem", "/files/extract/"],
                    {"timeout":max_extraction_time},
                    callback);
            },
            function (stdout, stderr, callback) 
            {
                console.log('java stdout: ' + stdout);
                console.log('java stderr: ' + stderr);
                var match_id = parseInt(stdout);
                if (stderr.length > 0 || match_id < 0 || match_id != locals.matchid)
                {
                    callback('exec error: bad matchid'+stdout);
                }
                else
                {
                    locals.match_dir = "/files/extract/"+locals.matchid;
                    locals.analysis_file = "/files/analysis/"+locals.matchid+".json";
                    locals.header_file = "/files/header/"+locals.matchid+".json";
                    locals.stats_file = "/files/stats/"+locals.matchid+".json";
                    child_process.execFile(
                        "python",
                        ["/analysis/analysis.py", locals.matchid, locals.match_dir, locals.analysis_file, locals.header_file, locals.stats_file],
                        {"timeout":max_analysis_time},
                        callback);
                }
            },
            function (stdout, stderr, callback) 
            {
                //console.log('pystdout: ' + stdout);
                //console.log('pystderr: ' + stderr);

                locals.client.query(
                    "UPDATE Matches SET status='processed' WHERE matchid=$1;",
                    [locals.matchid],
                    callback);
            }
        ],
        function(err, results)
        {
            if(err)
            {
                console.log("error", err, results);
            }
            else
            {
                console.log("fin~", locals.replayfile_id);
                locals.done();
                callback();
            }
        }
    )


}


function gatherData()
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
                    "SELECT matches.matchid, array_to_json(array_agg(row_to_json(row(mmr, slot)))) as samples FROM matches, mmrsamples WHERE matches.matchid = mmrsamples.matchid and matches.status ='processed' GROUP BY matches.matchid;",
                    [],
                    callback);
            },
            function(results, callback)
            {
                var filename = "/files/data.csv";
                locals.csv_file = fs.createWriteStream(filename);
                locals.csv_file.on("close", function(){console.log("finished writing");callback();});
                async.eachSeries(results.rows, gatherMatchData.bind(this, locals.csv_file), function(){console.log("done iterating"); locals.csv_file.end();});
            }
        ],
        function(err)
        {
            if (err)
                console.log(err);
            locals.done();
            console.log("finished gatherData");
            trainModel();
        }
    );
}

function gatherMatchData(file, row, callback)
{
    var filepath = "/files/stats/"+row["matchid"]+".json";
    fs.readFile(filepath, 'utf8', function (err, statsfile) {
        if (err) {
        console.log('Error: ' + err);
        return;
        }

        var match = JSON.parse(statsfile);
            //load stats
        for(var row_i in row["samples"])
        {
            var sample = row["samples"][row_i];
            var fullsample = {"label": sample["f1"], "data": createSampleData(match, sample["f2"])};
            writeSample(file,fullsample);
        }
        callback();
    });

}

function createSampleData(match, slot)
{
    var features = [slot];

    return features;    
}

function writeSample(file, sample)
{
    var line = "";
    line += sample["label"]+",";
    for(var feature_i = 0; feature_i < sample["data"].length; feature_i ++)
    {
        line += sample["data"][feature_i];
        if(feature_i +1 < sample["data"].length )
            line += ",";
    }
    line+= "\n";
    file.write(line)
}

function trainModel(data)
{
    child_process.execFile(
        "python",
        ["/learn/learn.py", "/files/data.csv", "/files/model.json"],
        {"timeout":max_learn_time},
        function (stdout, stderr)
        {
            console.log("done", stdout, stderr);
        });
}

