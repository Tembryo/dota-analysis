var database    = require("/shared-code/database.js"),
    services    = require("/shared-code/services.js"),
    storage     = require("/shared-code/storage.js"),
    config      = require("/shared-code/config.js"),
    logging     = require("/shared-code/logging.js")("crawl-server"),
    jobs        = require("/shared-code/jobs.js"),
    dota        = require("/shared-code/dota.js");

var async       = require("async");
var request     = require("request");

var steam_account_callback = function(){};
var steam_account = null;
var account_stop_id = null;


var reconnect_delay = 3000;

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


var service = null;
//THIS IS MAIN
async.series(
    [
        function(callback)
        {
            service = new services.Service("Crawl", handleCrawlServerMsg, callback);
        },
        function(callback)
        {
            logging.log("Crawl service started");
            callback();
        },
        function(callback)
        {
            var account_request = 
                {
                    "message": "GetSteamAccount",
                    "service": service._identifier
                };
            services.notifyScheduler(account_request, callback);    
        }
    ]
);


function handleCrawlServerMsg(server_identifier, message)
{
    switch(message["message"])
    {
        case "CrawlCandidates":
            performCrawling(message,
                function(){}
            );
            break;

        case "AddSampleMatches":
            addSampleMatches(message,
                function(){}
            );
            break;
        case "SteamAccount":
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
                steam_account_callback
            );

            break;
        default:
            logging.log("unknown message:", server_identifier, message);
            break;
    }
}

var error_code_early_done = "done";

var result_code_exists = "already_exists";

var mmr_bin_size = 250;


function addSampleMatches(message, callback_request)
{
    var locals = {};

    async.waterfall(
        [
            function(callback)
            {
                if(message["n"] == 0)
                    callback(error_code_early_done);
                else
                    callback();
            },
            function(callback)
            {
                database.query(
                    "WITH SampleBins AS "+
                    "(SELECT -LOG(COUNT(*)::float/(SELECT COUNT(*) FROM mmrdata WHERE solo_mmr IS NOT NULL)) as entropy, "+
                    "floor(AVG(d.solo_mmr)/$1)*$1 as mmr_bin, "+
                    "sh.hero as hero "+
                    "FROM mmrdata d,"+
                    "(select matchid, (player->>'player_slot')::smallint as slot ,(player->>'hero_id')::smallint as hero from "+
                       "(select json_array_elements(data->'players') as player, matchid  from matchdetails) players  ) sh "+
                    "WHERE d.matchid=sh.matchid AND d.slot=sh.slot AND d.solo_mmr IS NOT NULL GROUP BY floor(d.solo_mmr/$1)*$1, sh.hero) "+
                    "SELECT m.matchid, SUM(COALESCE(bin.entropy, (SELECT MAX(entropy) FROM SampleBins) )) AS value "+
                    "FROM CrawlingMatches m, CrawlingMatchStatuses s, CrawlingSamples smpl LEFT JOIN SampleBins bin ON floor(smpl.solo_mmr/$1)*$1=bin.mmr_bin AND bin.hero=smpl.hero "+
                    "WHERE smpl.matchid= m.matchid AND s.label='open' AND s.id=m.status "+
                    "AND to_timestamp((m.data->>'start_time')::bigint) > current_date - interval '7 days' GROUP BY m.matchid ORDER BY value DESC LIMIT $2;",
                    [mmr_bin_size, message["n"]], callback);
            },
            function(results, callback)
            {
                async.each(results.rows,
                    function(game, callback)
                    {
                        async.waterfall(
                            [
                                function(callback)
                                {
                                    database.query(
                                        "SELECT id FROM MatchRetrievalRequests WHERE id=$1;",
                                        [game["matchid"]],
                                        callback);
                                },
                                function(results, callback)
                                {
                                    if(results.rowCount == 0)
                                        database.query(
                                            "INSERT INTO MatchRetrievalRequests (id) VALUES ($1);",
                                            [game["matchid"]],
                                            callback);
                                    else
                                        callback(null, result_code_exists)
                                },
                                function(results, callback)
                                {
                                    if(results === result_code_exists)
                                    {
                                        //keep going
                                    }
                                    else if(results.rowCount != 1)
                                    {
                                        callback("adding sample match failed", results);
                                        return;
                                    }

                                    database.query(
                                        "UPDATE CrawlingMatches SET status=(SELECT id FROM CrawlingMatchStatuses where label=$2) WHERE matchid =$1;",
                                        [game["matchid"], "added"],
                                        callback
                                    );
                                },
                                function(results, callback)
                                {
                                    if(results.rowCount != 1)
                                    {
                                        callback("updating crawlingMatch failed", results);
                                        return;
                                    }

                                    var job_data = {
                                        "message":  "Retrieve",
                                        "id":       game["matchid"]
                                    };

                                    jobs.startJob(job_data, callback);
                                }
                            ],
                            callback);
                    },
                    callback)

            }
        ],
        function(err, results)
        {
            if(err && !(err === error_code_early_done))
            {
                logging.error({"message": "addSampleMatches error", "err": err, "result":results});

                var finished_message = 
                    {
                        "message":"JobResponse",
                        "result": "failed",
                        "job": message["job"]
                    };
                services.notifyScheduler(finished_message,
                    function(){
                        callback_request();
                    }
                );  
            } 
            else
            {
                logging.log("addSampleMatches success");

                var finished_message = 
                    {
                        "message":"JobResponse",
                        "result": "finished",
                        "job": message["job"]
                    };
                services.notifyScheduler(finished_message,
                    function(){
                        callback_request();
                    });
            }
        }
    );
}

// skip most recent matches, as they contain comparatively far more short matches
// as the long ones haven't finished
var match_threshold = 400000; 

function performCrawling(message, callback_request)
{
    var locals = {};
    locals.n_to_crawl = message["n"];
    locals.n_crawled = 0;
    async.waterfall(
        [
            function(callback)
            {
                if(locals.n_to_crawl <= locals.n_crawled)
                    callback(error_code_early_done);
                else
                    callback();
            },
            getMostRecentMatch,
            function(match_sq_num, callback)
            {
                locals.starting_num = match_sq_num - match_threshold;
                ensureSteamLoggedIn(callback);
            },
            function(callback)
            {
                dota.getClient(callback);
            },
            function(dota_client, callback)
            {
                crawlMatchCandidates(locals, dota_client, callback);
            }
        ],
        function(err, results)
        {
            if(err && !(err===error_code_early_done) )
            {
                logging.error({"message": "error while crawling", "err": err, "result": results});

                var finished_message = 
                    {
                        "message":"JobResponse",
                        "result": "failed",
                        "job": message["job"]
                    };
                services.notifyScheduler(finished_message, callback_request);  
            } 
            else
            {
                logging.log("successfully crawled"+locals.n_crawled);

                var finished_message = 
                    {
                        "message":"JobResponse",
                        "result": "finished",
                        "job": message["job"]
                    };
                services.notifyScheduler(finished_message, callback_request);
            }
        }
    );
}

function crawlMatchCandidates(locals, dota_client, finished_callback)
{
    async.waterfall(
        [
            function(callback)
            {
                getApiMatches(locals["starting_num"], callback);
            },
            function(matches, callback)
            {
                async.each(
                    matches,
                    function (match, callback)
                    {
                        processMatch(match, dota_client, locals, callback)
                    },
                    callback
                );
            }
        ],
        function(err,result)
        {   
            if(err)
            {
                finished_callback(err);
                return;
            }

            if(locals.n_crawled >= locals.n_to_crawl)
            {
                finished_callback();
            }
            else
            {
                crawlMatchCandidates(locals, dota_client, finished_callback);
            }
        }
    );
}

var profilecard_timeout = 2000;
var error_code_already_crawled = "exists";
var error_code_skip = "skip-this";

function processMatch(match, dota_client, locals, callback)
{
    var matchid = match.match_id;
    var match_mmrs = [];

    locals["starting_num"] = Math.max(locals["starting_num"], match["match_seq_num"]);
    async.waterfall(
        [
            database.generateQueryFunction("SELECT matchid FROM CrawlingMatches WHERE matchid = $1;", [matchid]),
            function(results, callback)
            {
                if(results.rowCount > 0)
                    callback(error_code_already_crawled);
                else
                    callback();
            },
            function(callback)
            {
                if(match["human_players"] != 10)
                {
                    callback(error_code_skip);
                    return;
                }

                var leaver = false;
                for(var i = 0; i < 10; i++)
                {
                    if(match["players"][i]["leaver_status"] != 0)
                    {
                        leaver = true;
                    }
                }
                if(leaver)
                    callback(error_code_skip);
                else 
                    callback();
            },
            function(callback)
            {
                async.eachSeries(
                    match["players"],
                    function(player, callback_player)
                    {
                        var acc_id = player["account_id"];
                        if(acc_id == 4294967295)
                            callback_player();
                        else
                        {
                            var request_timeout_status = 0;
                            dota_client.requestProfileCard(acc_id,
                                function(err, profile)
                                {
                                    if(request_timeout_status == 1)
                                    {
                                        return;
                                    }
                                    else request_timeout_status = 2;

                                    if(profile== null)
                                    {
                                       callback_player("profile is null"); 
                                       return;
                                    }
                                    var got_mmr = false;
                                    var entry = 
                                    {
                                        "steamid": dota_client.ToSteamID(player["account_id"]),
                                        "slot": player["player_slot"],
                                        "hero": player["hero_id"]
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
                                        match_mmrs.push(entry);

                                    callback_player();
                                });

                           setTimeout(
                            function()
                            {
                                if(request_timeout_status == 0)
                                {
                                    //logging.log("timeouted a profilecard");
                                    request_timeout_status = 1;
                                    callback_player();
                                }
                            }, profilecard_timeout);
                        }
                    },
                    function(){
                        if(match_mmrs.length == 0)
                            callback(error_code_skip);
                        else
                            callback()
                    });
            },
            database.generateQueryFunction("INSERT INTO CrawlingMatches (matchid, status, data) VALUES($1, (SELECT id FROM CrawlingMatchStatuses WHERE label=$2), $3);", [matchid, "open", match]),
            function(results, callback)
            {
                if(results.rowCount != 1)
                {
                    callback("inserting crawlingmatch failed", results);
                    return;
                }

                async.each(match_mmrs,
                    function(sample, callback)
                    {
                        database.query("INSERT INTO CrawlingSamples (matchid, hero, solo_mmr, party_mmr) VALUES ($1, $2, $3, $4);", [matchid, sample["hero"], sample["solo_mmr"], sample["group_mmr"]], callback);
                    },
                    callback);
            }
        ],
        function(err, result)
        {
            if(err === error_code_already_crawled)
                callback();
            else if(err === error_code_skip)
                database.query("INSERT INTO CrawlingMatches (matchid, status) VALUES"+
                    "($1, (SELECT id FROM CrawlingMatchStatuses WHERE label=$2));", [matchid, "skipped"], callback)
            else if(err)
            {
                logging.error({"message":"crawling matches failed", "err": err, "result": result});
                callback();
            }
            else
            {
                locals.n_crawled ++;
                callback();
            }
        }
    );
}

var api_interval = 2000;
var api_semaphore = require("semaphore")(1);

function getMostRecentMatch(callback)
{
    var url = "https://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/V001/?key="+config.steam_api_key+"&min_players=10&game_mode=22&matches_requested=1";
    api_semaphore.take(function(){
        request(url,
                function (err, response, body)
                {
                    setTimeout(api_semaphore.leave.bind(api_semaphore), api_interval);
                    if (response.statusCode == 200)
                    {
                        var responseData = JSON.parse(body);
                        var seq_num = parseInt(responseData["result"]["matches"][0]["match_seq_num"]);

                        callback(null, seq_num);
                    }
                    else
                    {
                        callback("Web API error code "+response.statusCode, response);
                    }
                });
    });
}

function getApiMatches(start_num, callback)
{
    async.waterfall(
        [
            function(callback)
            {
                var url = "https://api.steampowered.com/IDOTA2Match_570/GetMatchHistoryBySequenceNum/V001/?key="+config.steam_api_key+"&min_players=10&game_mode=22&matches_requested=100&start_at_match_seq_num="+start_num;

                api_semaphore.take(
                function(){
                    request(url,callback);
                });   
            },
            function (response, body, callback)
            {
                //console.log("got history "+body);
                setTimeout(api_semaphore.leave.bind(api_semaphore), api_interval);
                if (response.statusCode == 200)
                {
                    var responseData = JSON.parse(body).result;
                    //console.log(Object.keys(responseData))
                    if(responseData.status == 1)
                        callback(null, responseData.matches)
                    else
                        callback("bad api status "+response.statusCode, response);
                }
                else
                {
                    callback("bad response", response);
                }
            }
        ],
        callback
    );
}

