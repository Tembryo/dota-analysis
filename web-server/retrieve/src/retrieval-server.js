var database        = require("/shared-code/database.js"),
    services        = require("/shared-code/services.js");

// retrieve - server.js
var async       = require("async");

var retrieve_concurrency =  require("semaphore")(3);
    //Only one dota client, so the history updates are sequential anyway - no sema needed


var replay_dl   = require("./replay-download.js"),
    dota        = require("./dota.js");

var check_interval = 5000;
var matches_per_request = 20;
var history_retrieve_delay = 100;


var steam_account_callback = function(){};
var steam_account = null;
var account_stop_id = null;

function markAccountStart(callback)
{
    if(steam_account == null)
    {
        steam_account_callback = function(){
            console.log("callbacked for marking login ", steam_account);
            account_stop_id = steam_account["id"];
            callback();
        }
        var account_request = 
            {
                "message":"GetSteamAccount"
            };
        service.send(account_request);
    }
    else
    {
        console.log("marking login ", steam_account);
        account_stop_id = steam_account["id"];
        callback();
    }
}

function getLogin(callback)
{
    if(steam_account == null)
    {
        steam_account_callback = function(){
            console.log("callbacked login ", steam_account);
            callback(null, steam_account);
        }
        var account_request = 
            {
                "message":"GetSteamAccount"
            };
        service.send(account_request);
    }
    else
    {
        console.log("giving out login ", steam_account);
        callback(null, steam_account);
    }
}

function iterateAccount(callback)
{
    console.log("iterating account");

    steam_account_callback = function(){
        if(account_stop_id === steam_account["id"])
            callback(false);
        else
            callback(true);
    };

    var account_request = 
        {
            "message":"GetSteamAccount"
        };
    service.send(account_request);
}

var retry_interval = 5000;
var service = null;
//THIS IS MAIN
async.series(
    [
        function(callback)
        {
            service = new services.Service("Retrieve", handleRetrieveServerMsg, callback);
        },
        function(callback)
        {
            console.log("Retrieve service started");
        },
        function(callback)
        {
            var account_request = 
                {
                    "message":"GetSteamAccount"
                };
            service.send(account_request, callback);    
        }
    ]
);


function handleRetrieveServerMsg(server_identifier, message)
{
    //console.log("got message", channel, message);
    switch(message["message"])
    {
        case "RetrieveResponse":
        case "UpdateHistoryResponse":
        case "GetSteamAccount":
            //Sent by myself
            break;

        case "Retrieve":
            retrieve_concurrency.take(
                function(){
                    processRequest(message, 
                        function()
                        {
                            console.log("finished retrieve reqid", message["id"]);
                            retrieve_concurrency.leave();
                        });
                });
            break;

        case "UpdateHistory":
            checkAPIHistoryData(message);
            break;

        case "SteamAccount":
            steam_account = 
            {
                "id": message["id"],
                "steam_user": message["name"],
                "steam_pw": message["password"]
            };
            steam_account_callback();
            break;
        default:
            console.log("unknown message:", server_identifier, message);
            break;
    }
}

function checkAPIHistoryData(message)
{   
    locals =  {};
    async.waterfall(
        [
            function(callback)
            {
                getLogin(callback);
            },
            function(login, callback)
            {
                locals.login = login;
                console.log("got login", locals.login );
                database.query(
                    "SELECT u.id, u.steam_identifier, u.last_match FROM Users u WHERE u.id >= $1 AND u.id <= $2;",
                    [message["range-start"], message["range-end"]],
                    callback);
            },
            function(users, jobs_callback)
            {
                console.log("updating user histories", users.rowCount);
                if(users.rowCount > 0)
                {
                    dota.performAction(
                        locals.login,
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
                var finished_message = 
                {
                    "message":"UpdateHistoryResponse",
                    "result": "finished",
                    "job": message["job"]
                };
                service.send(finished_message, callback);
            },

        ],
        function(err, results)
        {
            if (err)
            {
                var finished_message = 
                {
                    "message":"UpdateHistoryResponse",
                    "result": "failed",
                    "job": message["job"]
                };
                service.send(finished_message);
            }
            else
            {
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
            function(callback)
            {
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
                database.query(
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
                database.query(
                    "INSERT INTO UserMatchHistory (user_id, match_id, data) VALUES ($1, $2, $3);",
                    [locals.user_id, fixed_match_id, match],
                    function(err, results)
                        {
                            if(err)
                                console.log("inserting matchhist failed", locals.user_id, fixed_match_id, err, results);
                            callback_foreach();
                        });
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


function processRequest(message, callback_request)
{
    console.log("processing replay", message["id"], "job", message["job"]);
    var locals = {};
    locals.request_id = message["id"];
    async.waterfall(
        [
            function(callback)
            {
                markAccountStart(callback);
            },
            function(callback)
            {
                database.query(
                    "UPDATE MatchRetrievalRequests mrr SET retrieval_status=(SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label=$2) WHERE mrr.id=$1 RETURNING mrr.id, mrr.requester_id;",
                    [locals.request_id, "retrieving"], callback);
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

                    fetchMatchDetails(locals, callback); 
                }
            },
            function(replay_data, callback)
            {
                console.log("inserted replayfile");
                database.query(
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
                database.query(
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

                        var finished_message = 
                            {
                                "message":"RetrieveResponse",
                                "result": "finished",
                                "job": message["job"]
                            };
                        service.send(finished_message,
                            function(){
                                callback_request(null, "");
                            }
                        );
                    }
                );
            }
            else if(err === "no-capacity-left")
            {
                var finished_message = 
                    {
                        "message":"RetrieveResponse",
                        "result": "no-capacity",
                        "job": message["job"]
                    };
                service.send(finished_message,
                    function(){
                        callback_request(null, "");
                    }
                );
            }
            else if(err)
            {
                database.query(
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

                        var finished_message = 
                            {
                                "message":"RetrieveResponse",
                                "result": "finished",
                                "job": message["job"]
                            };
                        service.send(finished_message,
                            function(){
                                callback_request(null, "");
                            }
                        );
                    });
            }
            else
            {
                console.log("put replay data for", locals.request_id);

                var finished_message = 
                    {
                        "message":"RetrieveResponse",
                        "result": "finished",
                        "job": message["job"]
                    };
                service.send(finished_message,
                    function(){
                        callback_request(null, "");
                    }
                );
            }
        }
    );
}



function fetchMatchDetails(locals, callback)
{
    async.waterfall(
        [
            function(callback)
            {
                getLogin(callback);
            },
            function(login, callback)
            {
                dota.performAction(
                    login,
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
                //got timed out, retry with next account for details
                iterateAccount(
                    function(result)
                    {
                        if(result)
                        {
                            fetchMatchDetails(locals, callback);
                        }
                        else
                            callback("no-capacity-left");
                    });                
            }
            else
                callback(err, results);
        });
}