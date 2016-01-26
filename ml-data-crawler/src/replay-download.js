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
//Retrieves salt using a given Dota2 client, stores the downloaded/decompressed replay 
function downloadMatch(client, match_id, target, final_callback)
{   
    var details_timeout = 2000;
    var timeout_status = 0; 
    var file;
    async.waterfall(
        [
            function(callback){
                client.requestMatchDetails(match_id, callback);
                timeout_status = 0; 
                setTimeout(function(){if(timeout_status == 0){callback("details-timeout"); timeout_status = 2;}else return;}, details_timeout);
            },
            function(result, callback)
            {
                timeout_status = 1;
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
                    file = target+replay_data.match_id+".dem"
                    var replay_address = "http://replay"+replay_data.cluster+".valve.net/570/"+replay_data.match_id+"_"+replay_data.replay_salt+".dem.bz2";

                    console.log("Downloading from", replay_address);
                    console.log("Storing in ", file);
                    downloadAndDecompress(replay_address, file, callback);
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
