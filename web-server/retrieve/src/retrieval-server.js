// retrieve - server.js
var async       = require("async");

var Steam = require('steam'),
    dota2 = require('dota2');

var config          = require("./config.js"),
    database          = require("./database.js"),
    replay_dl          = require("./replay-download.js");

var check_interval = 5000;

checkJobs();

function checkJobs()
{   
    //console.log("checking");
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
            function(requests, jobs_callback)
            {
                if(requests.rowCount > 0)
                {
                    performDotaAction(
                        function(dota_client, callback_dota)
                        {
                            async.eachSeries(
                                requests.rows,
                                function(request_row, callback_request)
                                {
                                    processRequest(request_row, dota_client, callback_request); 
                                },
                                callback_dota);
                        },
                        jobs_callback);
                }
                else
                    jobs_callback();
            }
        ],
        function(err, results)
        {
            if (err)
                console.log(err, results);
            locals.done();
            //console.log("finished check_jobs");
            setTimeout(checkJobs, check_interval);
        }
    );
}

function performDotaAction(main_call, callback_final)
{
    var steamClient     = new Steam.SteamClient(),
        steamUser       = new Steam.SteamUser(steamClient),
        steamFriends    = new Steam.SteamFriends(steamClient),
        Dota2           = new dota2.Dota2Client(steamClient, true);

    async.waterfall(
        [
            function(callback)
            {
                steamClient.on('connected', callback);
                steamClient.connect();
            },
            function(callback)
            {
                steamClient.on('logOnResponse', 
                    function(response)
                    {
                        if (response.eresult == Steam.EResult.OK)
                            callback();
                        else
                            callback("bad logOn response", response);
                    });
                steamClient.on('error', function(){ callback("steamClient error"); });
                steamClient.on('loggedOff', function(){ callback("steamClient logged off"); });

                steamUser.logOn({
                    account_name: config.steam_user,
                    password: config.steam_pw
                });
            },
            function(callback)
            {
                steamFriends.setPersonaState(Steam.EPersonaState.Busy);
                steamFriends.setPersonaName("Wisdota Bot");
                console.log("Logged on.");

                Dota2.on("ready", callback);
                Dota2.launch();
            },
            function(callback)
            {
                console.log("Node-dota2 ready.");

                main_call(Dota2, callback);
            },
            function(callback)
            {
                Dota2.on("unready", function() {
                            console.log("Node-dota2 unready.");
                        });
                Dota2.exit();
                callback();
            },
            function(callback)
            {
                steamClient.disconnect();
                callback();
            }
        ],
        function(err, result){
            console.log("Dota action finished", err, result);
            callback_final(err, result);
        }
    );


}

function processRequest(request_row, dota_client, callback_request)
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
                    replay_dl.downloadMatch(dota_client, results.rows[0].id, callback);
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
