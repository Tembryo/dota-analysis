var communication   = require("/shared-code/communication.js"),
    utils           = require("/shared-code/utils.js");

var async       = require("async");

function Service(service_type, service_handler, final_callback, register_callback) {
    this._type = service_type;
    this._identifier = utils.safe_generate();
    this._register_callback = register_callback;
    var self = this;
    async.series(
        [
            function(callback){
                self._subscriber = new communication.Subscriber(callback);
            },
            function(callback){
                self._subscriber.listen(self._identifier, service_handler);
                self._subscriber.listen("scheduler_broadcast", 
                    function(channel, message)
                    {
                        self._handleSchedulerMsg(channel, message);
                    });

                callback();
            },
            function(callback)
            {
                var registration_message = {
                    "message": "RegisterService",
                    "type": self._type,
                    "identifier": self._identifier
                };

                communication.publish("scheduler", registration_message, self._register_callback);
                callback();
            }
        ],
        final_callback
    );
};

Service.prototype._handleSchedulerMsg =  function(channel, message)
{
    var self = this;
    switch(message["message"])
    {
        case "SchedulerReset":
            
            var new_message = {
                    "message": "RegisterService",
                    "type": this._type,
                    "identifier": this._identifier
                };
            communication.publish("scheduler", new_message,
                function()
                {
                    console.log("re-registered retriever as ", self._identifier);
                    if(self._register_callback)
                        self._register_callback();

                });
            break;
        default:
            console.log("unknown scheduler message", message);
            break;
    }
}

Service.prototype.send = function(message, callback)
{
    communication.publish(this._identifier, message, callback);
}


exports.Service = Service;