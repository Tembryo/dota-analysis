// retrieve - server.js
var async       = require("async");



var config      = require("./config.js"),
    database    = require("./database.js"),
    replay_dl   = require("./replay-download.js"),
    dota        = require("./dota.js");

var check_interval = 5000;
var check_interval_history = 60*1000*5;
var matches_per_request = 20;
var history_retrieve_delay = 100;

resetStuff();
registerListener();
checkAPIHistoryData();

function resetStuff()
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
                    "DELETE FROM MatchRetrievalRequests mrr "+
                    "WHERE mrr.retrieval_status = (SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label='retrieving') OR "+
                    "mrr.retrieval_status = (SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label='requested');",
                    [],
                    callback);
            },
            function(results, callback)
            {
                console.log("retrieve reset:", results.rowCount)
                callback();
            }
        ],
        function(err, results)
        {
            if (err)
                console.log(err, results);
            locals.done();
        }
    );
}

function checkAPIHistoryData()
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
                    "SELECT u.id, u.steam_identifier, u.last_match FROM Users u;",
                    [],
                    callback);
            },
            function(users, jobs_callback)
            {
                console.log("updating user histories");
                if(users.rowCount > 0)
                {
                    dota.performAction(
                        config,
                        function(dota_client, callback_dota)
                        {
                            async.eachSeries(
                                users.rows,
                                function(user_row, callback_request)
                                {
                                    updateUserHistory(user_row, dota_client, callback_request); 
                                },
                                function(err, results){callback_dota(err, results);});
                        },
                        jobs_callback);
                }
                else
                    jobs_callback(null, "no users to update");
            },
            function(results, callback)
            {
                //auto-request matches for plus users.
                //console.log("results", results);
                /*locals.client.query(
                    "INSERT INTO MatchRetrievalRequests(id, retrieval_status, requester_id) (SELECT umh.match_id, mrs.id, MAX(umh.user_id) FROM UserMatchHistory umh, UserStatuses us, UserStatusTypes ust, MatchRetrievalStatuses mrs WHERE umh.user_id=us.user_id AND us.statustype_id=ust.id  AND ust.label=$1 AND mrs.label=$2 AND NOT EXISTS (SELECT id FROM Matches m WHERE m.id=umh.match_id) AND NOT EXISTS (SELECT id FROM MatchRetrievalRequests mrr2 WHERE mrr2.id=umh.match_id) AND to_timestamp((umh.data->>'start_time')::int) > current_timestamp - interval '7 days' GROUP BY umh.match_id, mrs.id);",
                    ["plus", "requested"],
                    callback);*/
                //disabled auto retrieve
                callback(null, -1);
            },
            function(results, callback)
            {
                console.log("auto request added:", results.rowCount)
                callback();
            }
        ],
        function(err, results)
        {
            if (err)
                console.log(err, results);
            locals.done();
            //console.log("finished check_jobs");
            setTimeout(checkAPIHistoryData, check_interval_history);
        }
    );
}

function updateUserHistory(user_row, dota_client, callback_request)
{
    var locals = {};
    locals.user_id = user_row["id"];
    locals.user_account_id = dota_client.ToAccountID(user_row["steam_identifier"]);
    locals.user_last_match = user_row["last_match"];
    locals.user_new_last_match = locals.user_last_match;
    locals.user_min_match_checked = Number.MAX_VALUE;
    locals.dota_client = dota_client;
    //console.log("history", user_row, locals.user_min_match_checked);
    async.waterfall(
        [
            database.connect,
            function(client, done_client, callback)
            {
                locals.client = client;
                locals.done = done_client;

                dota_client.requestPlayerMatchHistory(
                    locals.user_account_id,
                    {
                        "matches_requested": matches_per_request
                    },
                    callback);
            },
            function(history, callback)
            {
                processMatchHistory(history, locals, callback);
            },
            function(callback)
            {
                locals.client.query(
                        "UPDATE Users u SET last_match=$2 WHERE u.id=$1;",
                        [locals.user_id, locals.user_new_last_match],
                        callback);
            },
            function(results, callback)
            {
                if(results.rowCount!=1)
                    callback("setting new last match failed", results);
                else
                    callback(null, "done");
            }
        ],
        function(err, results)
        {
            locals.done();
            callback_request(err, results);
        }
    );
}

function processMatchHistory(history, locals, callback)
{
    async.eachSeries(
        history["matches"],
        function (match, callback_foreach) {
            //console.log(JSON.stringify(match));

            locals.user_new_last_match = Math.max(locals.user_new_last_match, match["match_id"]["low"]);

            locals.user_min_match_checked = Math.min(locals.user_min_match_checked, match["match_id"]["low"]);
            //console.log(match["match_id"]);
            if(match["match_id"]["low"] > locals.user_last_match)
            {           
                console.log("inserting matchhist", match["match_id"]["low"]);
                locals.client.query(
                    "INSERT INTO UserMatchHistory (user_id, match_id, data) VALUES ($1, $2, $3);",
                    [locals.user_id, match["match_id"]["low"], match],
                    callback_foreach);
            }
            else
            {
                callback_foreach();
            }
        },
        function(err, result){
            if(err)
            {
                console.log("got err", err, result);
                callback(err, result);
            }
            else if(locals.user_min_match_checked >  locals.user_last_match &&
                    history["matches"].length == matches_per_request)
            {
                console.log("keep fetching", locals.user_id, locals.user_last_match, locals.user_new_last_match, locals.user_min_match_checked);
                setTimeout(function()
                    {
                        locals.dota_client.requestPlayerMatchHistory(
                            locals.user_account_id,
                            {
                                "start_at_match_id": locals.user_min_match_checked,
                                "matches_requested": matches_per_request
                            },
                            function(err, next_history)
                            {
                                if(err)
                                {
                                    console.log(err, next_history);
                                    callback(err, next_history);
                                }
                                else
                                    processMatchHistory(next_history, locals, callback);
                            }
                        );
                    },
                    history_retrieve_delay
                );
            }
            else
            {
                callback();
            }
            
        });
}



function registerListener()
{
    var client = database.getClient();
    client.connect(
        function(err)
        {
            if(err) {
                return console.error('could not connect to postgres', err);
            }

            client.on('notification', processNotification);

            client.query(
                "LISTEN retrieval_watchers;",
                [],
                function(err, results)
                {
                    console.log("added retrieve listener");
                });

            client.query(
                "LISTEN newuser_watchers;",
                [],
                function(err, results)
                {
                    console.log("added user listener");
                });
          //no end -- client.end();
        }
    );
}

function processNotification(msg)
{
    console.log("got notification", msg);
    var parts=msg.payload.split(",");
    if(parts.length != 2)
    {
        console.log("bad notification", msg);
        return;
    }
    switch(parts[0])
    {
        case "Retrieve":
            var request_id = parseInt(parts[1]);
            dota.performAction(
                config,
                function(dota_client, callback_dota)
                {
                    processRequest(request_id, dota_client, callback_dota);
                },
                function(){console.log("finished retrieve");}
            );
            break;
        case "User":
            var user_id = parseInt(parts[1]);
            var locals = {};
            async.waterfall(
                [
                    database.connect,
                    function(client, done_client, callback)
                    {
                        locals.client = client;
                        locals.done = done_client;
                        locals.client.query(
                            "SELECT u.id, u.steam_identifier, u.last_match FROM Users u WHERE u.id=$1;",
                            [user_id],
                            callback);
                    },
                    function(users, callback)
                    {
                        console.log("updating notified user", users.rows);
                        if(users.rowCount != 1)
                        {
                            callback("bad user count", users);
                        }
                        else
                        {
                            dota.performAction(
                                config,
                                function(dota_client, callback_dota)
                                {
                                    updateUserHistory(users.rows[0], dota_client, callback_dota); 
                                },
                                function(err, results)
                                {
                                    callback(err, results);
                                }
                            );
                        }
                    }
                ],
                function(err, results)
                {
                    locals.done();
                    console.log("finished notified user", user_id);
                }
            );
            break;
        default:
            console.log("Unknown notification", msg);
    }
}


function processRequest(request_id, dota_client, callback_request)
{
    console.log("processing replay", request_id);
    var locals = {};
    locals.request_id = request_id;
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
                    locals.match_id = results.rows[0].id;
                    replay_dl.downloadMatch(dota_client, locals.match_id, config.shared+"/replays/", callback);
                }
            },
            function(replay_file, callback)
            {
                console.log("downloaded match to", replay_file);
                var path = replay_file.substring(replay_file.indexOf('/',1));//cut off the /shared folder
                locals.client.query(
                    "INSERT INTO ReplayFiles (file, upload_filename, processing_status, uploader_id) VALUES ($1, $2, (SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$3), $4);",
                    [path, locals.match_id, "uploaded", locals.requester_id],
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
                        callback_request(null, "");
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
                        callback_request(null, "");
                    });
            }
            else
            {

                console.log("retrieved", locals.request_id);
                locals.done();
                callback_request(null, "");
            }
        }
    );
}
