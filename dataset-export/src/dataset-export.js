var async           = require("async"),
    fs              = require("fs"),
    child_process   = require("child_process");

var database        = require("/shared-code/database.js"),
    storage         = require("/shared-code/storage.js");

var samples         = require("./samples.js");

async.waterfall(
    [
        function(callback)
        {
            database.query(
                "SELECT matchid FROM mmrdata mmr, replayfiles rf, processingstatuses ps "+
                "WHERE mmr.solo_mmr IS NOT NULL AND mmr.matchid = rf.match_id AND rf.processing_status=ps.id AND ps.label='registered' group by mmr.matchid;",
                [], callback);
        },
        function(result, callback)
        {
            sample_filename = "/shared/full_dataset.csv";
            var csv_file = fs.createWriteStream(sample_filename);
            csv_file.on("close", function(){console.log("finished writing samples");callback();});
            var header = samples.header();
            header.label = "MMR";
            samples.writeSample(csv_file, header);

            //console.log(result.rows);
            console.log("building dataset from ", result.rowCount, " matches");

            var queue = async.queue(function(row, callback)
                {
                    appedMatchSamples(row["matchid"], csv_file, callback);
                }
                , 10); // Run 3 simultaneous uploads

            queue.drain = function() {
                console.log("done iterating");
                csv_file.end();
            };

            // Queue your files for upload
            queue.push(result.rows);
        },
        function(callback)
        {
            storage.store("full_dataset.csv", callback);
        }
    ],
    function(err, results)
    {
        console.log("done", err, results);
    }   
);

function appedMatchSamples(matchid, csv_file, callback)
{
    var locals = {};
    async.waterfall(
    [
        function(callback)
        {
            var stats_filename = "/shared/match_stats/"+matchid+".json";
            storage.retrieve(stats_filename, callback)
        },
        function(local_statsfile, callback)
        {
            fs.readFile(local_statsfile, 'utf8', callback);
        },
        function(statsfile, callback)
        {
            locals.match = JSON.parse(statsfile);
            database.query("SELECT slot, solo_mmr FROM mmrdata WHERE matchid=$1 AND solo_mmr IS NOT NULL;", [matchid], callback);
        },
        function(results, callback)
        {
            for(var i = 0; i < results.rowCount; i++)
            {
                var slot = results.rows[i]["slot"];
                if(slot >= 128)
                    slot = slot - 128 + 5;

                var fullsample = {"label": results.rows[i]["solo_mmr"], "data": samples.createSampleData(locals.match, slot)};
                samples.writeSample(csv_file,fullsample);
            }
            callback();
        }
    ],
    function(e, result)
    {
        //console.log("done with replay ", matchid, e);
        callback();
    });
}