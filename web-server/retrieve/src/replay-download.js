var async       = require("async"),
    fs          = require('fs');

var config          = require("./config.js");

var api_timeout = 2000;



//Full download procedure of a match starting from the match ID
//Retrieves salt using a given Dota2 client, stores the downloaded/decompressed replay 
function getReplayData(client, match_id, final_callback)
{   
    var details_timeout = 2000;
    var timeout_status = 0; 
    var file;
    async.waterfall(
        [
            function(callback){
                client.requestMatchDetails(match_id, callback);
                timeout_status = 0; 
                setTimeout(function(){if(timeout_status == 0){callback("details-timeout"); timeout_status = 2;}else return;}, details_timeout);
            },
            function(result, callback)
            {
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
                if(result.match.replay_state != 0)
                {
                    callback("bad replay state", result.match.replay_state);
                }
                else
                {
                    callback(null, response);
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
                                        console.log("timeouted a profilecard");
                                        status = 1;
                                        callback_player();
                                    }
                                }, api_timeout);
                            }
                        }
                        else
                        {
                            console.log("found leaver "+player["player_slot"]);
                            callback_player();
                        }
                    },
                    function(){
                        callback(null, response)
                    });
            }
        ],
        function(err, result)
        {
            //console.log("got replay data", err, result);
            final_callback(err, result);
        }
    );
}



//Full download procedure of a match starting from the match ID
//Retrieves salt using a given Dota2 client, stores the downloaded/decompressed replay 
function downloadMatch(replay_data, target, callback)
{   
    var details_timeout = 2000;
    var timeout_status = 0; 
    var file = target+replay_data.match_id+".dem"
    var replay_address = "http://replay"+replay_data.cluster+".valve.net/570/"+replay_data.match_id+"_"+replay_data.replay_salt+".dem.bz2";

    console.log("Downloading from", replay_address);
    console.log("Storing in ", file);
    downloadAndDecompress(replay_address, file, function(){callback(null, file);});
}



exports.getReplayData = getReplayData;
