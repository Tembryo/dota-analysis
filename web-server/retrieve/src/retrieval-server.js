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
    steamClient.connect();
}

steamClient.on('error', function(){
        console.log("steam error");
        setTimeout(relog, reconnect_delay);}
    );
steamClient.on('loggedOff', function(){        console.log("steam logoff");setTimeout(relog, reconnect_delay);});

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
            checkJobs();
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

    sendReq.pipe(decoder).pipe(file);

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



function downloadMatch(match_id, final_callback)
{   
    var file;
    async.waterfall(
        [
            Dota2.requestMatchDetails.bind(Dota2, match_id),
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

function checkJobs()
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
                    "SELECT mrr.id FROM MatchRetrievalRequests mrr, MatchRetrievalStatuses mrs WHERE mrr.retrieval_status=mrs.id AND mrs.label = $1;",
                    ["requested"],
                    callback);
            },
            function(results, callback)
            {
                async.eachSeries(results.rows, processRequest, callback);
            }
        ],
        function(err)
        {
            if (err)
                console.log(err);
            locals.done();
            //console.log("finished check_jobs");
            setTimeout(checkJobs, check_interval);
        }
    );
}

function processRequest(request_row, callback_request)
{
    console.log("processing replay", request_row);
    var locals = {};
    locals.request_id = request_row.id;
    async.waterfall(
        [
            database.connect,
            function(client, done_client, callback)
            {
                console.log("got db client");
                locals.client = client;
                locals.done = done_client;

                locals.client.query(
                    "UPDATE MatchRetrievalRequests mrr SET retrieval_status=(SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label=$2) WHERE mrr.id=$1 RETURNING mrr.id, mrr.requester_id;",
                    [locals.request_id, "retrieving"],
                    callback);
            },
            function(results, callback)
            {
                console.log("set to retrieving");
                if(results.rowCount!=1)
                    callback("bad update result", results);
                else
                {
                    console.log("dl #id for #u", results.rows[0].id, results.rows[0].requester_id);
                    locals.requester_id = results.rows[0].requester_id;
                    downloadMatch(results.rows[0].id, callback);
                }
            },
            function(replay_file, callback)
            {
                console.log("downloaded match to", replay_file);

                locals.client.query(
                    "INSERT INTO ReplayFiles (file, upload_filename, processing_status, uploader_id) VALUES ($1, $2, (SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$3), $4);",
                    [replay_file,"retrieved", "uploaded", locals.requester_id],
                    callback);
            },
            function(results, callback)
            {
                if(results.rowCount!=1)
                    callback("inserting replayfile failed", results);
                else
                {
                    console.log("inserted replayfile");
                    locals.client.query(
                        "UPDATE MatchRetrievalRequests mrr SET retrieval_status=(SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label=$2) WHERE mrr.id=$1 RETURNING mrr.id;",
                        [locals.request_id, "retrieved"],
                        callback);
                }
            },
            function(results, callback)
            {
                if(results.rowCount!=1)
                    callback("setting status failed", results);
                else
                    callback();
            }
        ],
        function(err, results)
        {
            if(err === "bad replay state" && results == 2)
            {
                locals.client.query(
                    "UPDATE MatchRetrievalRequests mrr SET retrieval_status=(SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label=$2) WHERE mrr.id=$1 RETURNING mrr.id;",
                    [locals.request_id, "unavailable"],
                    function(err2, results2)
                    {
                        if(err2 || results2.rowsCount != 1)
                        {
                            console.log("put request unavailable failed", locals.request_id, err, results, err2, results2);
                        }
                        else
                        {
                            console.log("put request as unavailable", locals.request_id, err, results);
                        }

                        locals.done();
                        callback_request(null);
                    });
            }
            else if(err)
            {
                locals.client.query(
                    "UPDATE MatchRetrievalRequests mrr SET retrieval_status=(SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label=$2) WHERE mrr.id=$1 RETURNING mrr.id;",
                    [locals.request_id, "failed"],
                    function(err2, results2)
                    {
                        if(err2 || results2.rowsCount != 1)
                        {
                            console.log("put request as failed - failed again", locals.request_id, err, results, err2, results2);
                        }
                        else
                        {
                            console.log("put request as failed", locals.request_id, err, results);
                        }

                        locals.done();
                        callback_request(null);
                    });
            }
            else
            {

                console.log("retrieved", locals.request_id);
                locals.done();
                callback_request(null);
            }
        }
    );
}
