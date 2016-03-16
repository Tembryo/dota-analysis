var async       = require("async");

var database = require("./database.js");

var retry_interval = 5000;

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
        var message = decode(notification.payload);
        //console.log("received message", notification.channel, message);
        this._channels[notification.channel](notification.channel, message);
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
                        self.open(callback);
                    },
                    retry_interval);
            }

            self._client.on('notification', 
                function(notification)
                {
                    self._processNotification(notification);
                });

            self._client.on('error', function(error)
                {
                    self.listener_client.end();
                    setTimeout(function()
                        {
                            self.open(callback);
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
            database.connect,
            function(client, done_client, callback)
            {
                locals.client = client;
                locals.done = done_client;

                locals.client.query(
                    "SELECT pg_notify($1, $2);",
                    [channel, encode(message)],
                    callback);
            }
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
            locals.done();
            
            if(final_callback)
                final_callback(err, results);
        }
    );
}

exports.Subscriber = Subscriber;
exports.publish = publish;

