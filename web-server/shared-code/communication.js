var async       = require("async");

var database = require("./database.js");

var retry_interval = 10000;

function Subscriber(callback) {
    this._client = database.getClient();
    this._channels = {};

    this.open(callback);
};

function encode(message)
{
    return JSON.stringify(message);
}

function decode(encoded)
{
    return JSON.parse(encoded);
}


Subscriber.prototype._processNotification = function(notification)
{
    if(notification.channel in this._channels)
    {
        //Decode and call handler
        try
        {
            var message = decode(notification.payload);
            //console.log("received message", notification.channel, message);
            this._channels[notification.channel](notification.channel, message);
        }
        catch(e)
        {
            console.log("error parsing message", notification, e);
        } 
    }
    else
    {
        console.log("received message on unknown channel", notification);
    }
}


Subscriber.prototype.open = function (opened_callback) {
    var self = this;

    this._client.connect(
        function(err)
        {
            if(err) {
                console.error('could not connect to postgres', err);
                setTimeout(function()
                    {
                        self.open(opened_callback);
                    },
                    retry_interval);
                return;
            }

            self._client.on('notification', 
                function(notification)
                {
                    self._processNotification(notification);
                });

            self._client.on('error', function(error)
                {
                    self._client.end();
                    setTimeout(function()
                        {
                            self.open(function(){});
                        },
                        retry_interval);
                });

            async.each(
                self._channels,
                function(channel, callback)
                {
                    self.listen(channel, self._channels[channel], callback);
                },
                opened_callback);
        }
    );
};

Subscriber.prototype.listen = function (channel, handler, callback) {
    this._channels[channel] = handler;

    this._client.query(
        "LISTEN \""+channel+"\";",
        [],
        function(err, results)
        {
            if(err)
            {
                console.log("listening failed", err, results);
            }
            else
            {
                console.log("listening to", channel);
            }
            if(callback)
                callback(err, results);
        });
};


function publish(channel, message, final_callback)
{
    var locals = {};
    async.waterfall(
        [
            database.generateQueryFunction("SELECT pg_notify($1, $2);",
                    [channel, encode(message)])
        ],
        function(err, results)
        {
            if (err)
            {
                console.log("failure publishing", err, results);
            }
            else 
            {
                //console.log("published", channel, message);
            }
            
            if(final_callback)
                final_callback(err, results);
        }
    );
}

exports.Subscriber = Subscriber;
exports.publish = publish;

