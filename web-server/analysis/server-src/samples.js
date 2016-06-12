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
                                "initiation-score",
                                "camera-average-movement",
                                "camera-distance-average",
                                "camera-distance-stdev",
                                "camera-jumps-per-minute",
                                "camera-percent-far",
                                "camera-percent-moving",
                                "camera-percent-self",
                                "lasthits-per-minute",
                                "lasthits-total-contested",
                                "lasthits-contested-percent-lasthit",
                                "lasthits-taken-percent-free",
                                "lasthits-missed-free",
                                "lasthits-percent-taken-against-contest",
                                "tower-damage",
                                "rax-damage"
                                ]};
    return header;
}

function createSampleData(match, slot)
{
    if(slot >=10)
    {
        console.log("bad slot")
    }
    var match_stats = match["match-stats"];
    if(!match["player-stats"].hasOwnProperty(slot))
    {
        console.log("bad slot/match", slot, match);
        return [];
    }
    var player_stats = match["player-stats"][slot];
    var win = 0;
    if( (match_stats["winner"] === "radiant" && slot < 5) ||
        (match_stats["winner"] === "dire" && slot >= 5))
        win = 1;
    //console.log(match, match["player-stats"],id, match["player-stats"][id], player_stats);

    var durationMins =  (match_stats["duration"] /60);
    var fractionCreepsLasthit =  (match_stats["creeps-lasthit"] /match_stats["creeps-killed"]);
    var fractionLasthits =  (player_stats["lasthits"] /match_stats["creeps-lasthit"]);
    var checksPerMin = player_stats["n-checks"] / durationMins;
    var timeFractionVisible = player_stats["time-visible"] / durationMins;
    var fightsPerMin =  (player_stats["num-of-fights"] /durationMins);  

    var camJumpsPerMin =  player_stats["camera-stats"]["jumps"]/durationMins;
    var lasthitsPerMin =  player_stats["lasthits"]/durationMins;
    var contestedCreepsLasthit =  player_stats["contested-lasthit"]/Math.max(player_stats["contested-total"], 1);
    var percentFreeOfLasthits =  player_stats["lasthit-free"]/Math.max(player_stats["lasthits"], 1);
    var percentTakenAgainstContest = player_stats["lasthit-contested"]/Math.max((player_stats["lasthit-contested"]+player_stats["missed-contested"]), 1);

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
                        player_stats["initation-score"],
                        player_stats["camera-stats"]["avg_movement"],
                        player_stats["camera-stats"]["average_distance"],
                        player_stats["camera-stats"]["distance_std_dev"],
                        camJumpsPerMin,
                        player_stats["camera-stats"]["percentFar"],
                        player_stats["camera-stats"]["percentMove"],
                        player_stats["camera-stats"]["percentSelf"],
                        lasthitsPerMin,
                        player_stats["contested-total"],
                        contestedCreepsLasthit,
                        percentFreeOfLasthits,
                        player_stats["missed-free"],
                        percentTakenAgainstContest,
                        player_stats["tower-damage"],
                        player_stats["rax-damage"]
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


exports.header =  sampleHeader;
exports.createSampleData =  createSampleData;
exports.writeSample =  writeSample;
exports.version = "24/05/16";