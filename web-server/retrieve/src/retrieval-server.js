var database        = require("/shared-code/database.js"),
    services        = require("/shared-code/services.js"),
    dota            = require("/shared-code/dota.js"),
    jobs            = require("/shared-code/jobs.js"),
    logging         = require("/shared-code/logging.js")("retrieve-server");
// retrieve - server.js
var async       = require("async");

var retrieve_concurrency =  require("semaphore")(1);
    //Only one dota client, so the history updates are sequential anyway - no sema needed

var check_interval = 5000;
var matches_per_request = 20;
var history_retrieve_delay = 100;
var reconnect_delay = 3000;

var steam_account_callback = function(){};
var steam_account = null;
var account_stop_id = null;
var n_retries = 0;
var max_retries = 10;

function markAccountStart(callback)
{
    if(!steam_account)
    {
        ensureSteamLoggedIn(
            function()
            {
                markAccountStart(callback);
            });

        return;
    }

    account_stop_id = steam_account["id"];
    n_retries = 0;
    logging.log({"message": "marking login", "account_stop_id":account_stop_id});
    callback();
}

function ensureSteamLoggedIn(callback)
{
    if(!steam_account)
    {
        steam_account_callback = function(){
            logging.log({"message": "using login (cb)", "account":steam_account});
            callback();
        }
        var account_request = 
            {
                "message":"GetSteamAccount",
                "service": service._identifier
            };
        services.notifyScheduler(account_request);
    }
    else
    {
        logging.log({"message": "using login", "account":steam_account});
        callback();
    }
}

function iterateAccount(callback)
{
    logging.log("iterating account");

    steam_account_callback = function(){
        n_retries += 1;
        if(account_stop_id === steam_account["id"] || n_retries > max_retries)
            callback(false);
        else
            callback(true);
    };

    var account_request = 
        {
            "message":"GetSteamAccount",
            "service": service._identifier
        };
    services.notifyScheduler(account_request);
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
            logging.log("Retrieve service started");
        },
        function(callback)
        {
            var account_request = 
                {
                    "message":"GetSteamAccount",
                    "service": service._identifier
                };
            services.notifyScheduler(account_request, callback);    
        }
    ]
);


function handleRetrieveServerMsg(server_identifier, message)
{

    switch(message["message"])
    {
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
            logging.log("got steam account");
            async.waterfall(
                [
                    function(callback)
                    {
                        if(steam_account != null)
                            dota.closeDotaClient(callback);
                        else
                            callback();
                    },
                    function(callback)
                    {
                        steam_account = 
                            {
                                "id": message["id"],
                                "steam_user": message["name"],
                                "steam_pw": message["password"]
                            };
                        setTimeout(function(){
                            dota.openDotaClient(steam_account, callback);
                        },
                        reconnect_delay);
                    }
                ],
                function(err, result){
                    steam_account_callback(err, result);
                }
            );
            break;
        default:
            logging.log({"message": "unknown message", "server": server_identifier, "sent_message": message});
            break;
    }
}

var error_code_no_users_to_update = "no users to update";
var error_code_skip_ = "no users to update";

function checkAPIHistoryData(message)
{   
    locals =  {};
    async.waterfall(
        [
            ensureSteamLoggedIn,
            function(callback)
            {
                database.query(
                    "SELECT u.id, u.steam_identifier, u.last_match FROM Users u WHERE u.id >= $1 AND u.id <= $2;",
                    [message["range-start"], message["range-end"]],
                    callback);
            },
            function(results, callback)
            {
                if(results.rowCount == 0)
                {
                    callback(error_code_no_users_to_update);
                    return;
                }

                logging.log({"message": "updating user histories", "n": results.rowCount});
                locals.users = results.rows;
                dota.getClient(callback);                    
            },
            function(dota_client, callback)
            {
                async.eachSeries(
                    locals.users,
                    function(user_row, callback_request)
                    {
                        updateUserHistory(user_row, dota_client, callback_request); 
                    },
                    callback);
            }
        ],
        function(err, results)
        {
            if (err && !(err===error_code_no_users_to_update))
            {
                var finished_message = 
                {
                    "message":"JobResponse",
                    "result": "failed",
                    "job": message["job"]
                };
                services.notifyScheduler(finished_message);
            }
            else
            {
                logging.log({"message": "finished updating user histories", "job": message["job"]});
                var finished_message = 
                {
                    "message":"JobResponse",
                    "result": "finished",
                    "job": message["job"]
                };
                services.notifyScheduler(finished_message);
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
                                logging.error({"message": "inserting matchhist failed", "matchid": fixed_match_id, "err": err, "result": results});
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


var error_message_data_retrieved = "already_retrieved";
var error_message_replay_unavailable = "replay_unavailable";
var error_message_details_timeout = "details_timeout";
var error_message_out_of_capacity = "out_of_capacity";

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
                    "UPDATE MatchRetrievalRequests mrr SET retrieval_status=(SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label=$2) "+
                    "WHERE mrr.id=$1 RETURNING mrr.id, mrr.requester_id;",
                    [locals.request_id, "retrieving"], callback);
            },
            function(results, callback)
            {
                if(results.rowCount!=1)
                {
                    callback("bad update result", results);
                    return;
                }
                    //console.log("getting details #id for #u", results.rows[0].id, results.rows[0].requester_id);
                locals.match_id = results.rows[0].id;
                database.query(
                    "SELECT mrr.id FROM MatchRetrievalRequests mrr, MatchDetails md WHERE mrr.id=$1 AND md.matchid=mrr.id AND mrr.data IS NOT NULL;",
                    [locals.request_id], callback);
            },
            function(results, callback)
            {   
                if(results.rowCount > 0)
                {
                    var job_data = {
                            "message":  "Download",
                            "id":       message["id"]
                        };
                    jobs.startJob(job_data,
                        function()
                        {
                            callback(error_message_data_retrieved);
                        });
                    return;
                }

                fetchMatchDetails(locals, callback); 
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
                {
                    callback("setting status failed", results);
                    return;
                }
                
                database.query(
                    "INSERT INTO MatchDetails(matchid, data) VALUES ($1,$2);",
                    [locals.match_id, locals.matchdetails],
                    callback);
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
            },
            function(callback)
            {

                var job_data = {
                        "message":  "Download",
                        "id":       message["id"]
                    };
                jobs.startJob(job_data, callback);
            }
        ],
        function(err, results)
        {
            if(err === error_message_replay_unavailable)
            {
                database.query(
                    "UPDATE MatchRetrievalRequests mrr SET retrieval_status=(SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label=$2) WHERE mrr.id=$1 RETURNING mrr.id;",
                    [locals.request_id, "unavailable"],
                    function(err2, results2)
                    {
                        if(err2 || results2.rowCount != 1)
                        {
                            logging.error({"message": "putting match as unavailable failed", "matchid": locals.request_id, "err": err2, "result": results2});
                        }
                        else
                        {
                            logging.log({"message": "put match as unavailable", "matchid": locals.request_id});
                        }

                        var finished_message = 
                            {
                                "message":"JobResponse",
                                "result": "finished",
                                "job": message["job"]
                            };
                        services.notifyScheduler(finished_message,
                            function(){
                                callback_request();
                            }
                        );
                    }
                );
            }
            else if(err === error_message_data_retrieved)
            {
                logging.log("data already retrieved");
                database.query(
                    "UPDATE MatchRetrievalRequests mrr SET retrieval_status=(SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label=$2) WHERE mrr.id=$1 RETURNING mrr.id;",
                    [locals.request_id, "download"],
                    function(err2, results2)
                    {
                        if(err2 || results2.rowCount != 1)
                        {
                            logging.error({"message": "putting match as download failed", "matchid": locals.request_id, "err": err2, "result": results2});
                        }
                        else
                        {
                            logging.log({"message": "put match as download", "matchid": locals.request_id});
                        }

                        var finished_message = 
                            {
                                "message":"JobResponse",
                                "result": "finished",
                                "job": message["job"]
                            };
                        services.notifyScheduler(finished_message,
                            function(){
                                callback_request();
                            }
                        );
                    });
            }
            else if(err === error_message_out_of_capacity)
            {
                logging.log("no capacity left");

                var current_time = Math.floor(Date.now() / 1000);

                var new_status = {
                    "no-retrieve-capacity": current_time
                }

                service.setStatus(new_status, function(err){
                    var finished_message = 
                        {
                            "message":"JobResponse",
                            "result": "reschedule",
                            "job": message["job"]
                        };

                    services.notifyScheduler(finished_message,
                        function(){
                            callback_request();
                        }
                    );
                });
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
                                "err2": err2,
                                "results2": results2});
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
                                "message":"JobResponse",
                                "result": "finished",
                                "job": message["job"]
                            };
                        services.notifyScheduler(finished_message,
                            function(){
                                callback_request();
                            }
                        );
                    });
            }
            else
            {
                logging.log(
                    {   "message": "successfull retrieve",
                        "matchid": locals.request_id
                    });

                var finished_message = 
                    {   "message":"JobResponse",
                        "result": "finished",
                        "job": message["job"]
                    };

                services.notifyScheduler(finished_message,
                    function(){
                        callback_request();
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
            ensureSteamLoggedIn,
            function(callback)
            {
                dota.getClient(
                    function(err, dota_client)
                    {
                        if(err)
                        {
                            callback(err);
                            return;
                        }

                        getReplayData(dota_client, locals.match_id, callback);
                    });
            }
        ],
        function(err, results)
        {
            if(err === error_message_replay_unavailable)
                callback(err);
            else if(err === error_message_details_timeout)
            {
                logging.log({"message": "got timeout fetching replay data", "err": err});

                //error, retry with next account for details
                iterateAccount(
                    function(result)
                    {
                        if(result)
                        {
                            fetchMatchDetails(locals, callback);
                        }
                        else
                            callback(error_message_out_of_capacity);
                    });                
            }
            else
                callback(err, results);
        });
}

var details_timeout = 5000;
var profilecard_timeout = 2500;

//TODO refactor out the timeout code

//Full download procedure of a match starting from the match ID
//Retrieves salt using a given Dota2 client, stores the downloaded/decompressed replay 
function getReplayData(client, match_id, final_callback)
{   
    var timeout_status = 0; 
    var file;
    async.waterfall(
        [
            function(callback){
                client.requestMatchDetails(match_id, callback);
                timeout_status = 0; 
                setTimeout(function()
                    {
                        if(timeout_status == 0)
                        {
                            callback(error_message_details_timeout);
                            timeout_status = 2;
                        }
                        else return;
                    }, details_timeout);
            },
            function(result, callback)
            {
                //console.log("got match details", result);

                timeout_status = 1;
                if(result.result != 1)
                    callback("bad match details:", result);

                var replay_data = {
                    "cluster": result.match.cluster,
                    "match_id": (result.match.match_id.low >>>0),
                    "replay_salt": result.match.replay_salt
                };

                var response = {"replay_data": replay_data,
                                "match_details": result.match,
                                "mmrs": []};
                if(result.match.replay_state == 0)
                {
                    callback(null, response);
                }
                else if(result.match.replay_state == 2)
                {
                    callback(error_message_replay_unavailable);
                }
                else
                {
                    callback("bad replay state", response);
                }
            },
            function(response, callback)
            {
                async.eachSeries(
                    response["match_details"]["players"],
                    function(player, callback_player)
                    {
                        var leaver = player["leaver_status"];
                        if(leaver == 0)
                        {
                            //console.log("player", player);
                            var acc_id = player["account_id"];
                            if(acc_id == 4294967295)
                                callback_player();
                            else
                            {
                                var status = 0;
                                client.requestProfileCard(acc_id,
                                function(err, profile)
                                {
                                    if(status == 1)
                                    {
                                        return;
                                    }
                                    else status = 2;

                                    if(profile== null)
                                    {
                                       callback_player("profile is null"); 
                                       return;
                                    }
                                    var got_mmr = false;
                                    var entry = 
                                    {
                                        "steamid": client.ToSteamID(player["account_id"]),
                                        "slot": player["player_slot"]
                                    };

                                    for(var slot in profile["slots"])
                                    {
                                        if(profile["slots"][slot]["stat"] && profile["slots"][slot]["stat"]["stat_id"]==1 && profile["slots"][slot]["stat"]["stat_score"] > 0)
                                        {
                                            entry["solo_mmr"] = profile["slots"][slot]["stat"]["stat_score"];
                                            got_mmr= true;
                                        }
                                        else if(profile["slots"][slot]["stat"] && profile["slots"][slot]["stat"]["stat_id"]==2 && profile["slots"][slot]["stat"]["stat_score"] > 0)
                                        {
                                            entry["group_mmr"] = profile["slots"][slot]["stat"]["stat_score"];
                                            got_mmr= true;
                                        }
                                    }
                                    if(got_mmr)
                                        response["mmrs"].push(entry);

                                    callback_player();
                                });

                               setTimeout(
                                    function()
                                    {
                                        if(status == 0)
                                        {
                                            logging.log("timeouted a profilecard");
                                            status = 1;
                                            callback_player();
                                        }
                                    }, profilecard_timeout);
                            }
                        }
                        else
                        {
                            //console.log("found leaver "+player["player_slot"]);
                            callback_player();
                        }
                    },
                    function(){
                        callback(null, response)
                    });
            }
        ],
        final_callback
    );
}