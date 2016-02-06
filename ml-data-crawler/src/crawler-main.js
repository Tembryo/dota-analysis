var async       = require("async");
var request     = require("request");
var moment      = require("moment");

var config      = require("./config.js"),
    database    = require("./database.js"),
    replay_dl   = require("./replay-download.js"),
    dota        = require("./dota.js"),
    steam_accs  = require("./steam-accs.js");

var current_acc = config.start_account;
var current_account_i = config.start_i;

var api_semaphore = require("semaphore")(1);
var api_interval = 200;
function get_api_interval()
{
    return api_interval;//+200+Math.random()*1200;
}

var api_timeout = 2000;

function getLogin()
{
    if(current_acc < steam_accs.account_list.length)
        return steam_accs.account_list[current_acc];
    else return null;
}
function iterateLogin()
{
    current_account_i = (current_account_i+1) % 100;
    if(current_account_i == 0)
        current_acc ++;
    console.log("Using call"+current_acc+"/"+current_account_i);
}
function iterateAccount()
{
    console.log("done with acc", current_acc, current_account_i);
    current_acc ++;
    current_account_i = 0;
}
console.log("crawley happily crawling ur replays");

var CrawlerKeepRunning = true;
var dlInterval = 3000;
var match_threshold = 400000;
crawl();

var crawl_repeats = 0;
var crawl_repeats_per_dl = 2;

function crawl()
{
    var url = "https://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/V001/?key="+config.steam_api_key+"&min_players=10&game_mode=22&matches_requested=1";
    console.log(url);           
    api_semaphore.take(function(){
        request(url,
                function (err, response, body)
                    {
                        console.log("got initial history");
                        setTimeout(api_semaphore.leave.bind(api_semaphore), get_api_interval());
                        if (response.statusCode == 200) {
                            var responseData = JSON.parse(body);

                            var start_id = parseInt(responseData["result"]["matches"][0]["match_seq_num"]) - match_threshold;
                            console.log(responseData["result"]["matches"][0]["match_id"], match_threshold, start_id);
                            fetchMore(null, start_id);
                        } else {
                            console.log("Got an error: "+response+" \n status code: ", response.statusCode);
                            return;
                        }
                    });
    });
}
function fetchMore(err, final_id)
{
    if(err)
    {
        console.log("got error", err);
    }
    console.log(final_id);
    if(getLogin() != null)
    {
        CrawlerKeepRunning = true;
        if(crawl_repeats > 0)
       {
            console.log("fetch mmrs");
            if(final_id)
                getApiMatches(final_id-1, fetchMore);
            else
                getApiMatches(final_id, fetchMore);
            crawl_repeats --;
        }
        else
        {
            console.log("DL replays");
            dlMatches(final_id, fetchMore);
            crawl_repeats += crawl_repeats_per_dl;
        }
    }
    else
    {
        CrawlerKeepRunning = true;  
        console.log("fetch mmrs");
        if(final_id)
            getApiMatches(final_id+1, fetchMore);
        else
            getApiMatches(final_id, fetchMore);

//        console.log("done, login bad");
//        CrawlerKeepRunning = false;
    }
}

function getApiMatches(start, cb)
{
    var locals = {};
    var login = steam_accs.account_list[Math.floor(Math.random() * (steam_accs.account_list.length))];
    async.waterfall(
        [
            database.connect,
            function(client, done_client, callback)
            {
                locals.client = client;
                locals.done = done_client;

                var url = "https://api.steampowered.com/IDOTA2Match_570/GetMatchHistoryBySequenceNum/V001/?key="+config.steam_api_key+"&min_players=10&game_mode=22&matches_requested=100&start_at_match_seq_num="+start;
                console.log(url);           
                api_semaphore.take(function(){
                    request(url,callback);
                });
            },
            function (response, body, callback)
            {
                //console.log("got history "+body);
                setTimeout(api_semaphore.leave.bind(api_semaphore), get_api_interval());
                if (response.statusCode == 200) {
                    var responseData = JSON.parse(body);
                    locals.history_response = responseData;
                    callback();
                } else {
                    console.log("Got an error: "+response+" \n status code: ", response.statusCode);
                    callback("bad status", response.statusCode);
                }
            },
            function(callback)
            {
                checkLeavers(start, locals, callback)
            },
            function(result, callback)
            {
                console.log("got match hist");
                console.log("login with", JSON.stringify(login));
                dota.performAction(
                    login,
                    checkMMRs.bind(this, result, locals),
                    callback);
            }
        ],
        function(err, results)
        {
            if(err)
                console.log(err, results);
            console.log("done");
            locals.done();
            cb(err, results);
        }
    );

}


function checkLeavers(start_seq_num, locals, callback_matches)
{
    var data = locals.history_response["result"];
    var result = {"matches": [], "next_id": start_seq_num};
    var match_i = 0;
    async.eachSeries(
        data["matches"],
        function(match, callback_match)
        {
            console.log(match_i+"/"+data["matches"].length);
            match_i ++;
            result["next_id"] = match["match_seq_num"];
            async.waterfall(
                [
                    function(callback){
                        locals.client.query(
                            "SELECT * FROM Matches WHERE matchid=$1;",
                            [match["match_id"]],
                            callback);
                    },
                    /*function(results, callback)
                    {
                        if(results.rowCount != 0)
                        {
                            console.log("duplicate");
                            callback_match();
                        }
                        else
                        {
                            var url = "https://api.steampowered.com/IDOTA2Match_570/GetMatchDetails/V001/?key="+config.steam_api_key+"&match_id="+match["match_id"];
                            api_semaphore.take(function(){
                                request(url,callback);
                            });
                        }
                    },
                    function (response, body, callback){
                        setTimeout(api_semaphore.leave.bind(api_semaphore), get_api_interval());
                        if (response.statusCode == 200) {
                            var details_response = JSON.parse(body);
                            callback(null, details_response["result"]);
                        } else {
                            console.log("Got an error getting details: "+response+" \n status code: ", response.statusCode);
                            callback("bad status", response.statusCode);
                        }
                    },
                    function(details_response, callback)
                    {
                        if(details_response["human_players"] != 10)
                        {
                            console.log("no 10 players?" + details_response["human_players"]+" "+details_response["match_id"]);
                            callback();
                            return;
                        }
                        async.eachSeries(
                            details_response["players"],
                            function(player, callback_player)
                            {
                                var leaver = player["leaver_status"];
                                if(leaver == 0)
                                    callback_player();
                                else
                                {
                                    console.log("found leaver "+player["player_slot"]);
                                    callback_player("bad");
                                }
                            },
                            function(err)
                            {
                                if(!err)
                                {
                                    console.log("all players ok");
                                    result["matches"].push(details_response);
                                }
                                callback();
                            }
                        );

                    }*/
                    function(results, callback)
                    {
                        if(results.rowCount != 0)
                        {
                            console.log("duplicate");
                            callback_match();
                        }
                        else
                        {
                            if(match["game_mode"] != 22)
                            {
                                console.log("bad mode"+match["game_mode"]);
                                callback();
                                return;
                            }    
                            async.eachSeries(
                            match["players"],
                            function(player, callback_player)
                            {
                                var leaver = player["leaver_status"];
                                if(leaver == 0)
                                    callback_player();
                                else
                                {
                                    console.log("found leaver "+player["player_slot"]);
                                    callback_player("bad");
                                }
                            },
                            function(err)
                            {
                                if(!err)
                                {
                                    console.log("all players ok");
                                    result["matches"].push(match);
                                }
                                callback();
                            }
                        );
                        }
                    }
                ],
                callback_match
            );
        },
        function(err, err_results)
        {
            if(err)
                callback_matches(err,err_results);
            else
                callback_matches(null, result);
        }
    );
}




function checkMMRs(results_leaver, locals, dota_client, callback)
{
    var result = {"matches": [], "next_id": results_leaver["next_id"]};
    var match_i = 0;
    async.eachSeries(
        results_leaver["matches"],
        function(match, callback_match)
        {
            console.log(match_i+"/"+results_leaver["matches"].length);
            match_i ++;
            var match_mmrs = [];
            async.eachSeries(
                match["players"],
                function(player, callback_player)
                {
                    //console.log("player", player);
                    var acc_id = player["account_id"];
                    if(acc_id == 4294967295)
                        callback_player();
                    else
                    {
                        api_semaphore.take(function(){
                            var status = 0;
                            dota_client.requestProfileCard(acc_id,
                            function(err, profile)
                            {
                                if(status == 1)
                                {
                                    return;
                                }
                                else status = 2;
                                setTimeout(api_semaphore.leave.bind(api_semaphore), get_api_interval());
                                for(var slot in profile["slots"])
                                {
                                    if(profile["slots"][slot]["stat"] && profile["slots"][slot]["stat"]["stat_id"]==1 && profile["slots"][slot]["stat"]["stat_score"] > 0)
                                    {
                                        console.log("found mmr", profile["slots"][slot]["stat"]["stat_score"]);
                                        match_mmrs.push({"slot": player["player_slot"], "steamid": dota_client.ToSteamID(acc_id), "mmr": profile["slots"][slot]["stat"]["stat_score"]});
                                        break;
                                    }
                                }
                                callback_player();
                            });
                           setTimeout(function(){if(status == 0){console.log("timeouted a profilecard");api_semaphore.leave(); status = 1; callback_player();}}, api_timeout);
                        });
                    }
                },
                function(err)
                {
                    if(match_mmrs.length > 0)
                    {
                        result.matches.push({"match_id": match["match_id"]});

                        locals.client.query(
                            "INSERT INTO Matches(matchid, status) VALUES ($1, 'queued');",
                            [match["match_id"]],
                            function(err, results)
                            {
                                async.eachSeries(match_mmrs,
                                        function(mmr,callback)
                                        {
                                            locals.client.query(
                                                "INSERT INTO MMRSamples(matchid, slot, steamid, mmr) VALUES ($1, $2, $3, $4);",
                                                [match["match_id"], mmr["slot"],mmr["steamid"], mmr["mmr"]],
                                                function(err, results){ console.log("wrote mmr");callback()});
                                        },
                                        callback_match);
                            }
                        );
                    }
                    else
                    {
                        locals.client.query(
                            "INSERT INTO Matches(matchid, status) VALUES ($1, 'nommrs');",
                            [match["match_id"]],
                            callback_match);
                    }
                }
            );

        },
        function(err)
        {
            callback(err, result["next_id"]);
        });
}

function dlMatches(next_match, cb)
{
    var locals = {};
    console.log("dl "+next_match);
    async.waterfall(
        [
            database.connect,
            function(client, done_client, callback)
            {
                locals.client = client;
                locals.done = done_client;
                locals.client.query(
                    "SELECT matches.matchid "+
                    "FROM Matches, mmrsamples "+
                    "WHERE matches.matchid = mmrsamples.matchid "+
                        "AND  status = 'queued' "+
                        //"AND  (mmrsamples.mmr < 2500 OR mmrsamples.mmr > 5000) "+
                    "GROUP BY  matches.matchid "+
                    "ORDER BY Count(*) DESC LIMIT 10;",
                    [],
                    callback);
            },
            function(results, callback)
            {
                console.log("got", results.rowCount, results.rows)
                async.eachSeries(
                    results.rows,
                    function(match_row, callback_match)
                    {
                        var next_login = getLogin();
                        iterateLogin();
                        fetchMatch(match_row["matchid"], next_login, locals, callback_match); 
                    },
                    function(){
                        callback();//null, match_result["next_id"]);
                    });
            }
        ],
        function(err, results)
        {
            console.log("done");
            locals.done();
            if(CrawlerKeepRunning)
                setTimeout(function(){    console.log("dl cb  "+next_match); cb(err, next_match);}, dlInterval);
        }
    );
}


function fetchMatch(match_id, next_login, locals, callback)
{
    async.waterfall(
        [
            function(callback)
            {
                dota.performAction(
                    next_login,
                    function(dota_client, callback_dl)
                    {
                        console.log("before dl");
                        replay_dl.downloadMatch(dota_client, match_id, config.files+"/replays/", callback_dl);
                    },
                    callback);
            },
            function(results, callback)
            {
                console.log("setting as dled");
                locals.client.query(
                    "UPDATE Matches SET status = 'dled' WHERE matchid = $1;",
                    [match_id],
                    callback);
            },
        ],
        function(err, results)
        {
            if(err == "details-timeout")
            {
                //got timed out, retry with next account fordetails
                iterateAccount();
                if(getLogin() == null)
                    callback("no accounts left");
                else
                    fetchMatch(match_id, getLogin(), locals, callback);
            }
            else if(err)
            {
                locals.client.query(
                    "UPDATE Matches SET status = 'faileddl' WHERE matchid = $1;",
                    [match_id],
                    callback);
            }
            else
                callback();
        });
}
