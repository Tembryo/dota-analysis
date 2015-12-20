// retrieve - server.js
var async       = require("async");

var Steam = require('steam'),
    dota2 = require('dota2');

var config          = require("./config.js"),
    database          = require("./database.js");

var reconnect_delay = 2000;
var check_interval = 5000;

var steamClient     = new Steam.SteamClient(),
    steamUser       = new Steam.SteamUser(steamClient),
    steamFriends    = new Steam.SteamFriends(steamClient),
    Dota2           = new dota2.Dota2Client(steamClient, true);

steamClient.connect();
steamClient.on('connected', function() {
  steamUser.logOn({
    account_name: config.steam_user,
    password: config.steam_pw
  });
});

function relog()
{
    console.log("relogging");
    steamUser.logOn({
        account_name: config.steam_user,
        password: config.steam_pw
      });
}

steamClient.on('error', function(){setTimeout(relog, reconnect_delay);});
steamClient.on('loggedOff', function(){setTimeout(relog, reconnect_delay);});

steamClient.on('logOnResponse', function(response) {
    if (response.eresult == Steam.EResult.OK)
    {
        steamFriends.setPersonaState(Steam.EPersonaState.Busy);
        steamFriends.setPersonaName("Wisdota Bot");
        console.log("Logged on.");

        Dota2.launch();
        Dota2.on("ready", function()
        {
            console.log("Node-dota2 ready.");
            var user_steam_id = "76561198019532009";
            var user_account_id = Dota2.ToAccountID(user_steam_id);
            console.log("account id", user_account_id);
            //Dota2.requestPlayerMatchHistory(user_account_id, {"start_at_match_id": 2000000000, "matches_requested": 10}, function(err, response){console.log("history", JSON.stringify(response));})

            var match_id = 2003170341;
            downloadMatch(match_id);
            //checkJobs();
            console.log("done");
        });
    }
    else console.log(response);

});


var fs = require('fs');
var bz2 = require('unbzip2-stream');
var request = require('request');

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
        console.log("req got error",err);
        if (cb) {
            return cb(err.message);
        }
    });

    /*sendReq.on('data', function (d) {
        console.log("req data",d);
    });*/

    var decoder = bz2();
    decoder.on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        console.log("decoder got error",err);
    
        if (cb) {
            return cb(err.message);
        }
    });

    sendReq.pipe(decoder).pipe(file);

    file.on('finish', function() {
        file.close(cb);  // close() is async, call cb after close completes.
    });

    file.on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        console.log("file got error",err);
        if (cb) {
            return cb(err.message);
        }
    });

    console.log("done download and decompress");
};



function downloadMatch(match_id, final_callback)
{   
    console.log("download");
    var file;
    async.waterfall(
        [
            Dota2.requestMatchDetails.bind(Dota2, match_id),
            function(result, callback)
            {
                if(result.result != 1)
                    callback("bad match details:", result);
                console.log(result);
                var replay_data = {
                    "cluster": result.match.cluster,
                    "match_id": result.match.match_id.low,
                    "replay_salt": result.match.replay_salt
                };
                file = "/replays/"+replay_data.match_id+".dem"
                var replay_address = "http://replay"+replay_data.cluster+".valve.net/570/"+replay_data.match_id+"_"+replay_data.replay_salt+".dem.bz2";

                console.log("Downloading from", replay_address);
                console.log("Storing in shared - ", file);
                downloadAndDecompress(replay_address, config.shared+file, callback);
            }
        ],
        function(err, result)
        {
            console.log("fin", err, result);
            if(err)
            {
                if(final_callback)
                    final_callback(err, result);
            }
            else
            {
                if(final_callback)
                    final_callback(null, file);
            }
        }
    );
}

