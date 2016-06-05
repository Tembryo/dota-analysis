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
            console.log("Collectiong stuff for version", samples.version);
            database.query(
                "SELECT matchid FROM mmrdata mmr, replayfiles rf, processingstatuses ps, Matches m "+
                "WHERE mmr.solo_mmr IS NOT NULL AND mmr.matchid = rf.match_id AND rf.processing_status=ps.id AND ps.label='registered' AND m.id=rf.match_id AND m.analysis_version= $1 group by mmr.matchid;",
                [samples.version], callback);
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
                , 10);

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
            database.query("SELECT mmr.solo_mmr,mmr.slot, ms.data as match_data, ps.data as player_data FROM mmrdata mmr, MatchStats ms, PlayerStats ps WHERE mmr.matchid=$1 AND ms.id=mmr.matchid AND ps.match_id=mmr.matchid AND ps.steam_identifier = mmr.player_steamid AND solo_mmr IS NOT NULL;", [matchid], callback);
        },
        function(results, callback)
        {
            for(var i = 0; i < results.rowCount; i++)
            {
                csv_file.write("\n");
                var slot = results.rows[i]["slot"];
                if(slot >= 128)
                    slot = slot - 128 + 5;

                var match = 
                {
                    "match-stats": results.rows[i]["match_data"], 
                    "player-stats": {}
                }
                match["player-stats"][slot] = results.rows[i]["player_data"];
                //console.log(match);
                var fullsample = {"label": results.rows[i]["solo_mmr"], "data": samples.createSampleData(match, slot)};
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