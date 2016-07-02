var async   = require("async"),
    SteamUser   = require('steam-user'),
    dota2   = require('dota2'),
    domain = require('domain');

var steam_user      = new SteamUser({"dataDirectory": "/storage"});
var steam_client    = steam_user.client;
var steam_status    = "Open";
var dota_client     = new dota2.Dota2Client(steam_client, true, true);
var dota_status     = "Open";

var queued_dota_calls = [];
var queueing_block = require("semaphore")(1);

var reconnect_timeout = 1000;

function openDotaClient(login_data, callback)
{
    console.log("open called");
    if((steam_status === "Connected" || dota_status === "Connected"))
    {
        console.log("already connected");
        callback("already connected");
    }
    else if (dota_status === "Failed")
        callback("Dota is Failed");

    var callback_called = false;
    dota_client.on("ready", function()
        {
            console.log("Dota client started");
            dota_status = "Connected";
            if(!callback_called)
            {
                callback();
                callback_called = true;
            }
        });
    dota_client.on("unready", function()
        {
            dota_status = "Open";
            console.log("Dota client lost connection, reconnecting");
            dota_client.launch();
        });

    steam_user.on("loggedOn", function (details, parental){

        console.log("Steam logged on",details, parental)
        steam_status = "Connected";
        steam_user.setPersona(SteamUser.EPersonaState.Busy, "Wisdota Bot");

        dota_client.launch();
    });
    steam_user.on("disconnected", function (eresult, msg){
        console.log("Steam got disconnected", eresult, msg);
        steam_status = "Open";
        if( dota_status === "Connected")
            dota_client.exit();

        setTimeout(
            function(){
                steam_user.logOn(login_data);
            },
            reconnect_timeout
        );

    });

    steam_user.on("error", function(err) {
        steam_status = "Failed";
        console.log("Steam error", err);
        if(!callback_called)
        {
            callback("failed");
            callback_called = true;
        }
        if( dota_status === "Connected")
            dota_client.exit();
    });

    steam_user.logOn(login_data);
}


function closeDotaClient(callback)
{
    if(dota_status === "Open")
        callback();
    else if(dota_status === "Failed")
        callback("Dota is Failed");

    dota_client.on("unready", function()
    {
        console.log("Dota intentionally closed");
        dota_status = "Open";
        steam_user.logOff();
    });

    var callback_called = false;
    steam_user.on("disconnected", function (eresult, msg){
        console.log("Intentionally disconnected steam", eresult, msg);
        steam_status = "Open";
        if(!callback_called)
        {
            callback_called = true;
            callback();
        }
    });

    dota_client.exit();
}

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
