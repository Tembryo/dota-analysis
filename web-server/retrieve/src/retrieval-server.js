// retrieve - server.js
var 
    async           = require("async");
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
  /*  steamUser.logOn({
        account_name: config.steam_user,
        password: config.steam_pw
      });*/
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
        });
    }
    else console.log(response);

});

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

function processRequest(request_row, callback_replay)
{
    console.log("processing replay", replay_row);
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
                callback();

                //
                locals.client.query(
                    "UPDATE ReplayFiles rf SET retrieval_status=(SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label=$2) WHERE mrr.id=$1 RETURNING rf.file;",
                    [locals.replayfile_id, "retrieving"],
                    callback);
            },
        ],
        function(err, results)
        {
            if(err)
            {
                locals.client.query(
                    "UPDATE MatchRetrievalRequests mrr SET processing_status=(SELECT ps.id FROM MatchRetrievalStatuses mrs WHERE mrs.label=$2) WHERE mrr.id=$1;",
                    [locals.request_id, "failed"],
                    function()
                    {
                        console.log("put request as failed", locals.request_id, err);
                        locals.done();
                        callback_replay(null);
                    });
            }
            else
            {
                console.log("retreved", locals.request_id);
                locals.done();
                callback_replay(null);
            }
        }
    );
}
