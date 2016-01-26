var async   = require("async"),
    Steam   = require('steam'),
    dota2   = require('dota2');

var dota_semaphore = require("semaphore")(1);

function performDotaAction(login_data, main_call, callback_final)
{
    dota_semaphore.take(
        function(){
            var steamClient     = new Steam.SteamClient(),
                steamUser       = new Steam.SteamUser(steamClient),
                steamFriends    = new Steam.SteamFriends(steamClient),
                Dota2           = new dota2.Dota2Client(steamClient, true);

            async.waterfall(
                [
                    function(callback)
                    {
                        steamClient.on('connected', callback);
                        steamClient.on('error', function(){ callback("steamClient error"); });
                        try{
                            steamClient.connect();
                        }
                        catch(err)
                        {
                            callback(err);
                        }
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

                        steamClient.on('loggedOff', function(){ callback("steamClient logged off"); });

                        steamUser.logOn({
                            account_name: login_data.steam_user,
                            password: login_data.steam_pw
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
                    function(result, callback)
                    {
                        Dota2.on("unready", function() {
                                    console.log("Node-dota2 unready.");
                                });
                        Dota2.exit();
                        callback(null, result);
                    },
                    function(result, callback)
                    {
                        steamClient.disconnect();
                        callback(null, result);
                    }
                ],
                function(err, result){
                    console.log("Dota action finished", err, result);
                    dota_semaphore.leave();
                    callback_final(err, result);
                }
            );
        }
    );
}

exports.performAction = performDotaAction;
