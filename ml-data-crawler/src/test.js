var    dota   = require('./dota.js');

dota.performAction({"steam_user": "wisdota_devbot_1","steam_pw": "crawley-the-devbot-1"},
    function(client, callback)
    {
        var acc_id = client.ToAccountID("76561198019532009");
        client.requestProfileCard(acc_id,
            function(err, profile)
            {
                console.log(JSON.stringify(profile));
            });
    },
    function(){});