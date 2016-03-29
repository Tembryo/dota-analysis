var async       = require("async");

var config      = require("/shared-code/config.js"),
    dota        = require("/shared-code/dota.js");

var login = {"steam_user": "wertync","steam_pw": "Wertync.Steam"};

spamAllTheChannels();



function spamAllTheChannels()
{
    dota.performAction(
            login,
            doStuff,
            function(){console.log(finished)});
}

function doStuff(dota_client, callback)
{
    dota_client.chatRegionsEnabled();
    dota_client.on("chatChannelsData", gotChannels)
    dota_client.requestChatChannels();
}

function gotChannels(channels)
{
    console.log("got channels");
    console.log("all",channels.length);
    var type_counts = {};
    for(var i =0; i < channels.length; ++i)
    {
        var type= channels[i].channel_type;
        if(type in type_counts)
            type_counts[type] ++;
        else
            type_counts[type] = 1; 
    }
    console.log(type_counts)
    var sizeable = channels.filter(function(c){return c.num_members > 50;});
    console.log(">50", sizeable.length);
    console.log(">50", sizeable);
    var regional = channels.filter(function(c){return c.channel_type == 0;});
    console.log("regional", regional.length);
}

var message = "Let AI score how well you played! We just recently launched www.wisdota.com where you can get your IMR computed for each game you played.";

function spamChannel(client, channel)
{
    client.joinChat(channel, Dota2.chatChannelTypes.DOTAChannelType_Regional);
    client.sendMessage(channel, message);
    client.leaveChat(channel)
}