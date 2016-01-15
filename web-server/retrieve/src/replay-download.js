var async       = require("async"),
    fs          = require('fs'),
    bz2         = require('unbzip2-stream'),
    request     = require('request');

var config          = require("./config.js");

var downloadAndDecompress = function(url, dest, cb) {
    var file = fs.createWriteStream(dest);
    var sendReq = request.get(url);

    // verify response code
    sendReq.on('response', function(response) {
        if (response.statusCode !== 200) {
            return cb('Response status was ' + response.statusCode);
        }
    });

    // check for request errors
    sendReq.on('error', function (err) {
        fs.unlink(dest);

        if (cb) {
            return cb(err.message);
        }
    });

    var decoder = bz2();
    decoder.on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
    
        if (cb) {
            return cb(err.message);
        }
    });

    try
    {
        sendReq.pipe(decoder).pipe(file);
    }
    catch(e)
    {
        cb(e);
    }
    
    file.on('finish', function() {
        file.close(cb);  // close() is async, call cb after close completes.
    });

    file.on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)

        if (cb) {
            return cb(err.message);
        }
    });
};


//Full download procedure of a match starting from the match ID
//Retrieves salt using a given Dota2 client, stores the downloaded/decompressed replay at shared/replays/<matchid>.dem
function downloadMatch(client, match_id, final_callback)
{   
    var file;
    async.waterfall(
        [
            client.requestMatchDetails.bind(client, match_id),
            function(result, callback)
            {
                if(result.result != 1)
                    callback("bad match details:", result);

                var replay_data = {
                    "cluster": result.match.cluster,
                    "match_id": result.match.match_id.low,
                    "replay_salt": result.match.replay_salt
                };
                if(result.match.replay_state != 0)
                {
                    callback("bad replay state", result.match.replay_state);
                }
                else
                {
                    file = "/replays/"+replay_data.match_id+".dem"
                    var replay_address = "http://replay"+replay_data.cluster+".valve.net/570/"+replay_data.match_id+"_"+replay_data.replay_salt+".dem.bz2";

                    console.log("Downloading from", replay_address);
                    console.log("Storing in shared - ", file);
                    downloadAndDecompress(replay_address, config.shared+file, callback);
                }
            }
        ],
        function(err, result)
        {
            console.log("finished match download", err, result);
            if(err)
            {
                final_callback(err, result);
            }
            else
            {
                final_callback(null, file);
            }
        }
    );
}

exports.downloadMatch = downloadMatch;
