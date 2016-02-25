// retrieve - server.js
var async       = require("async");
var shortid = require("shortid");

var retrieve_concurrency =  require("semaphore")(3);
    //Only one dota client, so the history updates are sequential anyway - no sema needed



var config      = require("./config.js"),
    database    = require("./database.js"),
    replay_dl   = require("./replay-download.js"),
    dota        = require("./dota.js"),
    steam_accs  = require("./steam-accs.js");

var check_interval = 5000;
var matches_per_request = 20;
var history_retrieve_delay = 100;

var current_acc = 0;
var current_account_i = 0;
var account_loop_stop = 0;

function markAccountStart()
{
    account_loop_stop = current_acc;
}

function getLogin()
{
    return steam_accs.account_list[current_acc];
}

function iterateAccount()
{
    console.log("done with acc", current_acc, current_account_i);
    current_acc = (current_acc+1) % steam_accs.account_list.length;
    current_account_i = 0;
    if(current_acc == account_loop_stop)
        return false;
    else return true;
}

//THIS IS MAIN
async.series(
    [
        registerListeners,
        resetStuff,
        startHistoryRefresh
    ]
);

var listener_client;
var my_identifier;

function registerListeners(callback)
{
    listener_client = database.getClient();
    listener_client.connect(
        function(err)
        {
            if(err) {
                return console.error('could not connect to postgres', err);
            }

            listener_client.on('notification', processNotification);

            my_identifier = shortid.generate();
            listener_client.query(
                "LISTEN \""+my_identifier+"\";",
                [],
                function(err, results)
                {
                    console.log("added listener on own channel");
                    listener_client.query(
                        "SELECT pg_notify('scheduler', 'RegisterService,Retrieve,'||$1);",
                        [my_identifier],
                        function(){
                            console.log("Registered retriever as ", my_identifier);
                            }
                        );
                });

            listener_client.query(
                "LISTEN scheduler_broadcast;",
                [],
                function(err, results)
                {
                    console.log("added scheduler_broadcast listener");
                });

            listener_client.query(
                "LISTEN newuser_watchers;",
                [],
                function(err, results)
                {
                    console.log("added user listener");
                });

            callback();
          //no end -- listener_client.end();
        }
    );
}

function processNotification(msg)
{
    console.log("got notification", msg);
    var parts=msg.payload.split(",");
    if(parts.length < 1)
    {
        console.log("bad notification", msg);
        return;
    }
    switch(parts[0])
    {
        case "RetrieveResponse":
            //Sent by myself
            break;
        case "UpdateHistoryResponse":
            //Sent by myself
            break;
        case "Retrieve":
            var request_id = parseInt(parts[1]);
            retrieve_concurrency.take(
                function(){
                    processRequest(request_id, function(){console.log("finished retrieve reqid", request_id);retrieve_concurrency.leave()});
                });
            break;
        case "SchedulerReset":
            listener_client.query(
                        "SELECT pg_notify('scheduler', 'RegisterService,Retrieve,'||$1);",
                        [my_identifier],
                        function(){
                            console.log("re-registered retriever as ", my_identifier);
                            }
                        );
            break;

        case "UpdateHistory":
            var interval = [ parseInt(parts[1]), parseInt(parts[2])];
            checkAPIHistoryData(interval);
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
                    function(results, callback){
                        locals.done();
                        callback(null, results)
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
                    console.log("finished notified user", user_id);
                }
            );
            break;
        default:
            console.log("Unknown notification", msg);
    }
}





function resetStuff(callback)
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
                    "UPDATE MatchRetrievalRequests "+
                    "SET retrieval_status = (SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label='requested') "+
                    "WHERE retrieval_status = (SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label='retrieving') OR "+
                        "retrieval_status = (SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label='requested');",
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
            callback(err, results);
        }
    );
}

function startHistoryRefresh(callback){
    //checkAPIHistoryData();
    callback();
}

function checkAPIHistoryData(user_id_range)
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
                    "SELECT u.id, u.steam_identifier, u.last_match FROM Users u WHERE u.id >= $1 AND u.id <= $2;",
                    [user_id_range[0], user_id_range[1]],
                    callback);
            },
            function(users, jobs_callback)
            {
                console.log("updating user histories", users.rowCount);
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
                locals.client.query("SELECT pg_notify($1, 'UpdateHistoryResponse,finished,'||$2||','||$3);",[my_identifier, user_id_range[0], user_id_range[1]],
                            function(){
                                callback(null, "");
                            });
            },

        ],
        function(err, results)
        {
            if (err)
            {
                locals.client.query("SELECT pg_notify($1, 'UpdateHistoryResponse,failed,'||$2);",[my_identifier, JSON.dumps(results)],
                            function(){
                                locals.done();

                                console.log("history update failed", err, results, user_id_range);
                            });
            }
            else
            {
                console.log(err, results);
                locals.done();
                //console.log("finished check_jobs");
            }


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
            //console.log("history doing m ",JSON.stringify(match));

            //cast matchid to unsigned int!
            var fixed_match_id = match["match_id"]["low"]>>>0;

            locals.user_new_last_match = Math.max(locals.user_new_last_match, fixed_match_id);

            locals.user_min_match_checked = Math.min(locals.user_min_match_checked, fixed_match_id);

            //console.log("fixed", fixed_match_id);
            //console.log(match["match_id"]);
            if(fixed_match_id > locals.user_last_match)
            {           
                console.log("inserting matchhist", fixed_match_id);
                locals.client.query(
                    "INSERT INTO UserMatchHistory (user_id, match_id, data) VALUES ($1, $2, $3);",
                    [locals.user_id, fixed_match_id, match],
                    callback_foreach);
            }
            else
            {
                //console.log("nope old");
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


function processRequest(request_id, callback_request)
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
                    console.log("getting details #id for #u", results.rows[0].id, results.rows[0].requester_id);
                    locals.match_id = results.rows[0].id;
                    markAccountStart();
                    fetchMatchDetails(locals, callback); 
                }
            },
            function(replay_data, callback)
            {
                console.log("inserted replayfile");
                locals.client.query(
                    "UPDATE MatchRetrievalRequests mrr SET data=$2, retrieval_status=(SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label=$3) WHERE mrr.id=$1;",
                    [locals.request_id, replay_data, "download"],
                    callback);
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
                        locals.client.query("SELECT pg_notify($1, 'RetrieveResponse,finished,'||$2);",[my_identifier, locals.request_id],
                            function(){
                                locals.done();
                                callback_request(null, "");
                            })
                    });
            }
            else if(err === "no-capacity-left")
            {
                locals.client.query("NOTIFY $1, 'RetrieveResponse,no-capacity,$2';",[my_identifier, locals.request_id],
                            function(){
                                locals.done();
                                callback_request(null, "");
                            })
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
                        locals.client.query("SELECT pg_notify($1, 'RetrieveResponse,finished,'||$2);",[my_identifier, locals.request_id],
                            function(){
                                locals.done();
                                callback_request(null, "");
                            })
                    });
            }
            else
            {
                console.log("put replay data for", locals.request_id);
                locals.client.query("SELECT pg_notify($1, 'RetrieveResponse,finished,'||$2);",[my_identifier, locals.request_id],
                            function(){
                                locals.done();
                                callback_request(null, "");
                            });
            }
        }
    );
}



function fetchMatchDetails(locals, callback)
{
    var next_login = getLogin();

    async.waterfall(
        [
            function(callback)
            {
                dota.performAction(
                    next_login,
                    function(dota_client, callback_dota)
                    {
                        console.log("before dl");
                        replay_dl.getReplayData(dota_client, locals.match_id, callback_dota);
                    },
                    callback);
            }
        ],
        function(err, results)
        {
            if(err == "details-timeout")
            {
                //got timed out, retry with next account fordetails
                ;
                if(iterateAccount())
                {
                    fetchMatchDetails(locals, callback);
                }
                else
                    callback("no-capacity-left");
                
            }
            else
                callback(err, results);
        });
}