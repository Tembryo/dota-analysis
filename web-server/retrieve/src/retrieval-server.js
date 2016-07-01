var database        = require("/shared-code/database.js"),
    services        = require("/shared-code/services.js"),
    dota            = require("/shared-code/dota.js"),
    logging         = require("/shared-code/logging.js")("retrieve-server");
// retrieve - server.js
var async       = require("async");

var retrieve_concurrency =  require("semaphore")(1);
    //Only one dota client, so the history updates are sequential anyway - no sema needed


var replay_dl   = require("./replay-download.js");


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
            account_stop_id = steam_account["id"];
            logging.log({"message": "marking login (cb)", "account_stop_id":account_stop_id});
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
        account_stop_id = steam_account["id"];
        logging.log({"message": "marking login", "account_stop_id":account_stop_id});
        callback();
    }
}

function getLogin(callback)
{
    if(steam_account == null)
    {
        steam_account_callback = function(){
            logging.log({"message": "using login (cb)", "account":steam_account});
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
        logging.log({"message": "using login", "account":steam_account});
        callback(null, steam_account);
    }
}

function iterateAccount(callback)
{
    logging.log("iterating account");

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
            service = new services.Service("Retrieve", handleRetrieveServerMsg, callback,
                function()
                {
                    iterateAccount(function(){});
                });
        },
        function(callback)
        {
            logging.log("Retrieve service started");
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

    switch(message["message"])
    {
        case "RetrieveResponse":
        case "UpdateHistoryResponse":
        case "GetSteamAccount":
            //Sent by myself
            break;

        case "Retrieve":
            logging.log({"message": "Retrieve job", "job-id": message["id"]});
            retrieve_concurrency.take(
                function(){
                    processRequest(message, 
                        function()
                        {
                            logging.log({"message": "finished retrieve", "id": message["id"]});
                            retrieve_concurrency.leave();
                        });
                });
            break;

        case "UpdateHistory":
            logging.log({"message": "History job", "job-id": message["id"]});

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
            logging.log({"message": "unknown message", "server": server_identifier, "sent_message": message});
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
                database.query(
                    "SELECT u.id, u.steam_identifier, u.last_match FROM Users u WHERE u.id >= $1 AND u.id <= $2;",
                    [message["range-start"], message["range-end"]],
                    callback);
            },
            function(users, jobs_callback)
            {
                logging.log({"message": "updating user histories", "n": users.rowCount});
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
                logging.log({"message": "finished updating user histories", "job": message["job"]});
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

            if(fixed_match_id > locals.user_last_match)
            {           
                database.query(
                    "INSERT INTO UserMatchHistory (user_id, match_id, data) VALUES ($1, $2, $3);",
                    [locals.user_id, fixed_match_id, match],
                    function(err, results)
                        {
                            if(err)
                                logging.error({"message": "inserting matchhist failed", "matchid": fixed_match_id, "err": err, "result": result});
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
                logging.error({"message": "got err processing history", "err": err, "result": result});
                callback(err, result);
            }
            else if(locals.user_min_match_checked >  locals.user_last_match &&
                    history["matches"].length == matches_per_request)
            {
                //console.log("keep fetching", locals.user_id, locals.user_last_match, locals.user_new_last_match, locals.user_min_match_checked);
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
                                    logging.error({"message": "got err fetching history", "err": err, "history": next_history});
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
    logging.log({"message": "retrieval start", "matchid": message["id"], "job": message["job"]});
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
                if(results.rowCount!=1)
                    callback("bad update result", results);
                else
                {
                    //console.log("getting details #id for #u", results.rows[0].id, results.rows[0].requester_id);
                    locals.match_id = results.rows[0].id;

                    fetchMatchDetails(locals, callback); 
                }
            },
            function(response, callback)
            {
                //console.log("got details response:\n",response);
                locals.matchdetails = response["match_details"];
                locals.mmrs = response["mmrs"];
                callback(null, response["replay_data"]);
            },
            function(replay_data, callback)
            {
                //console.log("inserted replayfile");
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
                {
                    database.query(
                    "INSERT INTO MatchDetails(matchid, data) VALUES ($1,$2);",
                    [locals.match_id, locals.matchdetails],
                    callback);
                }
            },
            function(results, callback)
            {
                if(results.rowCount!=1)
                    callback("inserting details failed", results);
                else
                {
                    //console.log("got mmrs", locals.mmrs)
                    async.each(
                        locals.mmrs,
                        function(mmr, callback)
                        {
                            //console.log("inserting ", mmr);
                            database.query(
                                "INSERT INTO MMRdata(matchid, player_steamid, slot, solo_mmr, group_mmr) VALUES ($1,$2, $3, $4, $5);",
                                [locals.match_id, mmr["steamid"], mmr["slot"], mmr["solo_mmr"], mmr["group_mmr"]],
                                callback);
                        },
                        callback);
                }
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
                            logging.error({"message": "putting match as unavailable failed", "matchid": locals.request_id, "err": err2, "result": results2});
                        }
                        else
                        {
                            logging.log({"message": "put match as unavailable", "matchid": locals.request_id});
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
                logging.log("sending no capacity left");
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
                        if(err2 || results2.rowCount != 1)
                        {
                            logging.error({
                                "message": "put request as failed - failed again",
                                "matchid": locals.request_id,
                                "err": err2,
                                "result": results2});
                        }
                        else
                        {
                            logging.error({
                                "message": "retrieval failed",
                                "matchid": locals.request_id,
                                "err": err,
                                "result": results});
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
                logging.log({
                    "message": "successfull retrieve",
                    "matchid": locals.request_id});

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

function saveMMRs(locals, player, callback)
{
    //TODO
     callback();
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
                        replay_dl.getReplayData(dota_client, locals.match_id, callback_dota);
                    },
                    callback);
            }
        ],
        function(err, results)
        {
            if(err)
            {
                logging.log({"message": "got error fetching replay data", "err": err});

                //error, retry with next account for details
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