var async       = require("async"),
    fs          = require('fs');

var config          = require("./config.js");





//Full download procedure of a match starting from the match ID
//Retrieves salt using a given Dota2 client, stores the downloaded/decompressed replay 
function downloadMatch(replay_data, target, callback)
{   
    var details_timeout = 2000;
    var timeout_status = 0; 
    var file = target+replay_data.match_id+".dem"
    var replay_address = "http://replay"+replay_data.cluster+".valve.net/570/"+replay_data.match_id+"_"+replay_data.replay_salt+".dem.bz2";

    console.log("Downloading from", replay_address);
    console.log("Storing in ", file);
    downloadAndDecompress(replay_address, file, function(){callback(null, file);});
}



exports.getReplayData = getReplayData;
