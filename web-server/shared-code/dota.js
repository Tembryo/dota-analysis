var async   = require("async"),
    Steam   = require('steam'),
    dota2   = require('dota2'),
    domain = require('domain');

var dota_semaphore = require("semaphore")(1);


function performDotaAction(login_data, main_call, callback_final)
{
    var dota_error = function(err)
    {
        console.log("dota error", err);
        callback_final(err);
    }

    var d = domain.create();  
    d.on('error', dota_error) 
    d.enter(); 

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
                        steamClient.on('error', function(err){
                            console.log("stean client error", err);
                            callback("steamClient error", err);
                        });
                        try{
                            steamClient.connect();
                        }
                        catch(err)
                        {
                            console.log("got exception", err);
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
                        console.log("logging in using:", login_data);
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
                        d.exit(); 
                        main_call(Dota2, callback);
                    },
                    function()//extracting parameters from arguments array
                    {   
                        d.enter(); 
                        Dota2.on("unready", function() {
                                    console.log("Node-dota2 unready.");
                                });
                        Dota2.exit();
                        //console.log(result, callback);
                        var new_arguments = Array.prototype.slice.call(arguments);
                        //console.log(new_arguments);
                        var callback = new_arguments.pop();
                        new_arguments.unshift(null);

                        callback.apply(this, new_arguments);
                    },
                    function()//extracting parameters from arguments array
                    {
                        steamClient.disconnect();

                        var new_arguments = Array.prototype.slice.call(arguments);
                        //console.log(new_arguments);
                        var callback = new_arguments.pop();
                        new_arguments.unshift(null);

                        callback.apply(this, new_arguments);
                    }
                ],
                function(err, result){
                    if(err)
                    {
                       console.log("Dota action error occured", err, result); 
                    }

                    dota_semaphore.leave();

                    d.exit(); 
                    callback_final(err, result);
                }
            );
        }
    );
}

exports.performAction = performDotaAction;
