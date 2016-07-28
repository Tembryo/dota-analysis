var async   = require("async"),
    Steam   = require('steam'),
    dota2   = require('dota2'),
    domain = require('domain');

<<<<<<< HEAD
var logging = require("./logging.js")("dota-lib"),
    config  = require("./config.js");
=======
var logging = require("./logging.js")("dota");
>>>>>>> 2e1af2313645758671669fecce11f5d82b7eea54

var steam_client    = new Steam.SteamClient();
var steam_user      = new Steam.SteamUser(steam_client);
var steam_status    = "Open";
<<<<<<< HEAD
var dota_client     = null;
if(config.version === "DEV")
    dota_client = new dota2.Dota2Client(steam_client, true, true);
else
    dota_client = new dota2.Dota2Client(steam_client, false, false);

var dota_status     = "Open";

=======
var dota_client     = new dota2.Dota2Client(steam_client, true, true);
var dota_status     = "Open";

>>>>>>> 2e1af2313645758671669fecce11f5d82b7eea54

var reconnect_timeout = 3000;
var n_retries = 0;
var max_retries = 5;
var reconnecting = false;
var reconnecting_block = require("semaphore")(1);
var reconnect_decay_interval = 5*60*1000;

function decayReconnects()
{
    if(n_retries > 0)
        n_retries -= 1;
    setTimeout(decayReconnects, reconnect_decay_interval);
}
decayReconnects();


var shutdown_delay = 2000;
var counter= 0;
var steam_error_cb = null;
var steam_credentials = null;

steam_client.on('connected', 
    function() {
        console.log("connected");
        steam_user.logOn(steam_credentials);
    });
steam_client.on("logOnResponse",
    function (details, parental)
    {
        reconnecting = false;
        if(details.eresult == 1)
        {
            console.log("Steam logged on",details, parental)
            steam_status = "Connected";
            var steam_friends = new Steam.SteamFriends(steam_client);
            steam_friends.setPersonaState(Steam.EPersonaState.Busy);
            steam_friends.setPersonaName("Wisdota Bot");

            dota_client.launch();
        }
        else
        {
            steam_status = "Failed";
            console.log("Steam LogOn failed",details, parental);
            logging.log({"message": "Steam logon failed", "details": details});
            if(details.eresult == 20)
            {
                tryReconnect(err);
            }
            else
            {
                steam_status = "Failed";
                steam_client.emit("error", {"msg":"logon failed", "details": details});
            }
        }

    });

function onLogOffRelaunch(eresult, msg)
{
    console.log("Steam got logged off", eresult, msg);
    steam_status = "Open";
    if( dota_status === "Connected")
        dota_client.exit();
    steam_client.disconnect();
    console.log("Loggedoff ");

    tryReconnect();
}

function onLogOffClose(eresult, msg){
        console.log("Intentionally disconnected steam", eresult, msg);
        steam_status = "Open";
        steam_client.disconnect();
        if(!callback_called)
        {
            callback_called = true;
            callback();
        }
    }

function switchSteamErrorCB(new_callback)
{
    if(steam_error_cb)
    {
        steam_client.removeListener("error", steam_error_cb);
    }

    steam_error_cb = new_callback;

    steam_client.on("error", steam_error_cb);
}

function tryReconnect()
{
    reconnecting_block.take(function(){
        if(!reconnecting)
        {
            n_retries += 1;
            if(n_retries < max_retries)
            {
                reconnecting = true;
                setTimeout(
                    function()
                    {
                        reconnecting_block.take(
                            function(){
                                console.log("reconnecting to steam after unavailable");
                                steam_user.logOn(steam_credentials);
                                reconnecting_block.leave();
                            }
                        );
                    },
                    reconnect_timeout);
            }
            else
            {
                console.log("too many reconnect tries");
                steam_client.emit("error", {"msg":"too many reconnect tries"});
            }
        }
        reconnecting_block.leave();
    })
}

function openDotaClient(login_data, callback)
{
    steam_credentials = {
                            account_name: login_data.steam_user,
                            password: login_data.steam_pw
                        };
                        
    console.log("open called");
    if((steam_status === "Connected" || dota_status === "Connected"))
    {
        console.log("already connected");
        callback("already connected");
        return;
    }
    else if (dota_status === "Failed")
    {
        callback("Dota is Failed");
        return;
    }

    var callback_called = false;

    steam_client.removeListener("loggedOff", onLogOffClose);
    
    var local_counter = counter;
    var logOnCB = function()
        {
            console.log("Dota client started", local_counter);
            dota_status = "Connected";
            if(!callback_called)
            {
                callback();
                callback_called = true;
            }
            dota_client.removeListener("ready", logOnCB);

            switchSteamErrorCB(
                function(err) {
                    steam_status = "Failed";
                    console.log("Steam error while running", err);
                    if( dota_status === "Connected")
                        dota_client.exit();

                    tryReconnect();
                });
        };
    dota_client.on("ready", logOnCB);
    
    steam_client.removeListener("loggedOff", onLogOffClose);
    steam_client.on("loggedOff", onLogOffRelaunch);

    switchSteamErrorCB(
        function(err) {
            steam_status = "Failed";
            console.log("Steam error while opening", JSON.stringify(err));
            
            steam_client.connect();

            if(!callback_called)
            {
                callback("failed");
                callback_called = true;
            }
            if( dota_status === "Connected")
                dota_client.exit();
        });

    steam_client.connect();
    counter += 1;
<<<<<<< HEAD
}


function closeDotaClient(callback)
{
    if(dota_status === "Open")
    {
        console.log("dota not connected, closing does nothing")
        callback();
        return; 
    }
    else if(dota_status === "Failed")
    {
        console.log("closing failed dota")
        callback("Dota is Failed");
        return;
    }

    var callback_called = false;
    steam_client.removeListener("loggedOff", onLogOffRelaunch);
    steam_client.on("loggedOff", onLogOffClose);

    switchSteamErrorCB(
        function(err) {
            steam_status = "Failed";
            console.log("Steam error while closing", err);
            if(!callback_called)
            {
                callback("failed");
                callback_called = true;
            }
            if( dota_status === "Connected")
                dota_client.exit();
        });

    dota_client.exit();
    dota_status = "Open";

    steam_client.disconnect();
    setTimeout(
        function(){
           steam_status = "Open";
           if(!callback_called)
            {
                callback_called = true;
                callback();
            }
        },
        shutdown_delay);
}

=======
}


function closeDotaClient(callback)
{
    if(dota_status === "Open")
    {
        console.log("dota not connected, closing does nothing")
        callback();
        return; 
    }
    else if(dota_status === "Failed")
    {
        console.log("closing failed dota")
        callback("Dota is Failed");
        return;
    }

    var callback_called = false;
    steam_client.removeListener("loggedOff", onLogOffRelaunch);
    steam_client.on("loggedOff", onLogOffClose);

    switchSteamErrorCB(
        function(err) {
            steam_status = "Failed";
            console.log("Steam error while closing", err);
            if(!callback_called)
            {
                callback("failed");
                callback_called = true;
            }
            if( dota_status === "Connected")
                dota_client.exit();
        });

    dota_client.exit();
    dota_status = "Open";

    steam_client.disconnect();
    setTimeout(
        function(){
           steam_status = "Open";
           if(!callback_called)
            {
                callback_called = true;
                callback();
            }
        },
        shutdown_delay);
}

>>>>>>> 2e1af2313645758671669fecce11f5d82b7eea54
function getClient(callback)
{
    if(dota_status === "Connected")
        callback(null, dota_client);
    else if(dota_status === "Failed")
        callback("Steam Failed");
    else if(dota_status === "Open")
        callback("Not Connected");
}

exports.openDotaClient = openDotaClient;
exports.closeDotaClient = closeDotaClient;

exports.getClient = getClient;
