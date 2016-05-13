var database    = require("/shared-code/database.js"),
    services    = require("/shared-code/services.js"),
    storage     = require("/shared-code/storage.js"),
    config      = require("/shared-code/config.js"),
    dota        = require("/shared-code/dota.js");

var async       = require("async");
var request     = require("request");

var steam_account_callback = function(){};
var steam_account = null;
var account_stop_id = null;


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
            console.log("Crawl service started");
            callback();
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




function handleCrawlServerMsg(server_identifier, message)
{
    switch(message["message"])
    {
        case "CrawlCandidatesResponse":
        case "AddSampleMatchesResponse":
        case "GetSteamAccount":
            //Sent by myself
            break;

        case "CrawlCandidates":
            performCrawling(message,
                function()
                {
                    console.log("finished crawling", message["id"]);
                }
            );
            break;

        case "AddSampleMatches":
            addSampleMatches(message,
                function()
                {
                    console.log("finished adding", message["id"]);
                }
            );
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

var mmr_bin_size = 250;
var max_mmr = 10000;

function addSampleMatches(message, callback_request)
{
    var locals = {};


    async.waterfall(
        [
            function(callback)
            {
                database.query(
                    "SELECT COUNT(*) as n_samples,floor(AVG(d.solo_mmr)/$1)*$1 as mmr_bin FROM mmrdata d WHERE d.solo_mmr IS NOT NULL "+
                    "GROUP BY floor(d.solo_mmr/$1)*$1;",
                    [mmr_bin_size], callback);
            },
            function(results, callback)
            {
                locals.samples_context = {};
                var total_n = 0;
                var max_value = 1;

                for (var i = 0; i < results.rowCount; ++i)
                {
                    total_n += results.rows[i]["n_samples"];
                }
                //console.log(results.rows, total_n);

                for (var i = 0; i < results.rowCount; ++i)
                {
                    locals.samples_context[results.rows[i]["mmr_bin"]] = - Math.log(results.rows[i]["n_samples"]/total_n);
                    if(locals.samples_context[results.rows[i]["mmr_bin"]] > max_value)
                        max_value = locals.samples_context[results.rows[i]["mmr_bin"]];
                }

                for (var i = 0; i*mmr_bin_size < max_mmr; ++i)
                {
                    var bin = i*mmr_bin_size;
                    if (! (bin in locals.samples_context))
                    {
                        locals.samples_context[bin] = 10*max_value;
                    }
                }
                //console.log(locals.samples_context);

                database.query(
                    "SELECT m.matchid, json_agg(row_to_json(smpl)) as samples "+
                    "FROM CrawlingMatches m, CrawlingMatchStatuses s, CrawlingSamples smpl WHERE smpl.matchid= m.matchid AND s.label='open' AND s.id=m.status "+
                    "AND to_timestamp((m.data->>'start_time')::bigint) > current_date - interval '7 days' GROUP BY m.matchid ORDER BY COUNT(*) DESC LIMIT 100*$1;",
                    [message["n"]], callback);
            },
            function(results, callback)
            {
                games_list = [];
                for(var i = 0; i < results.rowCount; ++i)
                {
                    var scored_match = {};
                    scored_match["matchid"] = results.rows[i]["matchid"];
                    scored_match["score"] = calculateSampleValue(results.rows[i]["samples"], locals.samples_context);
                    //console.log(scored_match);
                    games_list.push(scored_match)
                }

                games_list.sort(function(a, b){return b["score"]-a["score"];});
                var games_to_add = games_list.slice(0, message["n"]);
                async.each(games_to_add,
                    function(game, callback){
                        database.query(
                            "INSERT INTO MatchRetrievalRequests (id) VALUES ($1);",
                            [game["matchid"]],
                            function(err, result){
                                if(err)
                                    console.log("error while adding sample match,", err, result);
                                database.query(
                                    "UPDATE CrawlingMatches SET status=(SELECT id FROM CrawlingMatchStatuses where label=$2) WHERE matchid =$1;",
                                    [game["matchid"], "added"],
                                    function(err, result)
                                    {
                                        if(err)
                                        console.log("error while updating added sample match,", err, result);
                                        callback();
                                    }
                                );
                            });
                    },
                    callback)

            }
        ],
        function(err, results)
        {
            if(err)
            {
                var finished_message = 
                    {
                        "message":"AddSampleMatchesResponse",
                        "result": "failed",
                        "job": message["job"]
                    };
                service.send(finished_message,
                    function(){
                        callback_request(null, "");
                    }
                );  
            } 
            else
            {
                console.log("put replay data for", locals.request_id);

                var finished_message = 
                    {
                        "message":"AddSampleMatchesResponse",
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

function calculateSampleValue(samples, context)
{
    var value = 0;
    for(var i = 0; i < samples.length; ++i)
    {
        var bin = Math.floor(samples[i]["solo_mmr"]/mmr_bin_size) * mmr_bin_size;
        value += context[bin];
    }

    return value;
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
            getMostRecentMatch,
            function(match_sq_num, callback)
            {
                locals.starting_num = match_sq_num - match_threshold;
                callback();
            },
            getLogin,
            function(steam_login, callback)
            {
                console.log(arguments);
                locals.steam_login = steam_login;
                dota.performAction(
                    steam_login,
                    crawlMatchCandidates.bind(this, locals),
                    callback);
            }
        ],
        function(err, results)
        {
            if(err)
            {
                console.log("error while crawling", err, results);

                var finished_message = 
                    {
                        "message":"CrawlCandidatesResponse",
                        "result": "failed",
                        "job": message["job"]
                    };
                service.send(finished_message,
                    function(){
                        callback_request(null, "");
                    }
                );  
            } 
            else
            {
                console.log("successfully crawled", message["n"]);

                var finished_message = 
                    {
                        "message":"CrawlCandidatesResponse",
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

function crawlMatchCandidates(locals, dota_client, callback)
{
        async.waterfall(
        [
            getApiMatches.bind(this, locals["starting_num"]),
            function(matches, callback)
            {
                async.each(matches,
                    function (match, callback)
                    {
                        processMatch(match, dota_client, locals, callback)
                    },
                    callback
                    )
            }
        ],
        function(err,result)
        {   
            if(err)
                callback(err);
            else
            {
                if(locals.n_crawled >= locals.n_to_crawl)
                {
                    callback();
                }
                else
                {
                    crawlMatchCandidates(locals, dota_client, callback);
                }
            }
        }
        );
}

var profilecard_timeout = 2000;
var existing_replay_message = "exists";

function processMatch(match, dota_client, locals, callback)
{
    var matchid = match.match_id;
    var match_mmrs = [];
    console.log("Seq", locals["starting_num"], match["match_seq_num"]);
    locals["starting_num"] = Math.max(locals["starting_num"], match["match_seq_num"]);
    async.waterfall(
        [
            database.generateQueryFunction("SELECT matchid FROM CrawlingMatches WHERE matchid = $1;", [matchid]),
            function(results, callback)
            {
                if(results.rowCount > 0)
                    callback(existing_replay_message);
                else
                    callback();
            },
            function(callback)
            {
                if(match["human_players"] != 10)
                {
                    callback("bots involved");
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
                    callback("leaver");
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
                            var status = 0;
                            dota_client.requestProfileCard(acc_id,
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
                                if(status == 0)
                                {
                                    console.log("timeouted a profilecard");
                                    status = 1;
                                    callback_player();
                                }
                            }, profilecard_timeout);
                        }
                    },
                    function(){
                        if(match_mmrs.length == 0)
                            callback("no_mmrs");
                        else
                            callback()
                    });
            },
            database.generateQueryFunction("INSERT INTO CrawlingMatches (matchid, status, data) VALUES($1, (SELECT id FROM CrawlingMatchStatuses WHERE label=$2), $3);", [matchid, "open", match]),
            function(results, callback)
            {
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
            if(err)
            {
                if(! (err === existing_replay_message))
                {
                    //console.log("match rejected", matchid, err)
                    database.query("INSERT INTO CrawlingMatches (matchid, status) VALUES($1, (SELECT id FROM CrawlingMatchStatuses WHERE label=$2));", [matchid, "skipped"], callback)
                }
                else
                {
                    if(result != null)
                        console.log("match err", err, result);
                    callback();
                }
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
                        console.log("got initial history");
                        setTimeout(api_semaphore.leave.bind(api_semaphore), api_interval);
                        if (response.statusCode == 200)
                        {
                            var responseData = JSON.parse(body);

                            var start_id = parseInt(responseData["result"]["matches"][0]["match_seq_num"]) - match_threshold;
                            console.log(responseData["result"]["matches"][0]["match_id"], match_threshold, start_id);

                            callback(null, start_id);
                        }
                        else
                        {
                            console.log("Got an error: "+response+" \n status code: ", response.statusCode);
                            callback("Error code "+response.statusCode);
                        }
                    });
    });
}

function getApiMatches(start_num, callback)
{
    console.log("API matches", start_num);
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
                if (response.statusCode == 200) {
                    var responseData = JSON.parse(body).result;
                    //console.log(Object.keys(responseData))
                    if(responseData.status == 1)
                        callback(null, responseData.matches)
                    else
                        callback("bad api status "+responseData.status+" "+responseData.statusDetail)
                } else {
                    console.log("Got an a error: "+response+" \n status code: ", response.statusCode);
                    callback("bad response status", response.statusCode);
                }
            }
        ],
        callback
    );
}

