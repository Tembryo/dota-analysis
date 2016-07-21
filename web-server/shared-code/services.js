var communication   = require("/shared-code/communication.js"),
    database        = require("/shared-code/database.js"),
    utils           = require("/shared-code/utils.js"),
    machine         = require("/shared-code/machine.js"),
    logging         = require("/shared-code/logging.js")("services-lib");

var async       = require("async");

var scheduler_listening_channel = "scheduler";
var scheduler_broadcast_channel = "scheduler_broadcast";

function Service(service_type, service_handler, final_callback)
{
    this._type = service_type;
    this._identifier = utils.safe_generate();
    var self = this;

    async.waterfall(
        [
            function(callback){
                self._subscriber = new communication.Subscriber(callback);
            },
            function(callback){
                self._subscriber.listen(self._identifier, service_handler);
                self._subscriber.listen(scheduler_broadcast_channel, 
                    function(channel, message)
                    {
                        self._handleSchedulerMsg(channel, message);
                    });

                callback();
            },
            function(callback)
            {
                database.query("INSERT INTO Services (identifier, type, last_heartbeat, status) VALUES ($1, $2, now(), '{}');",[self._identifier, self._type],callback);
            },
            function(results, callback)
            {
                machine.getMachineID(callback)
            },
            function(machine_id, callback)
            {
                self.setStatus({"machine":machine_id}, callback);
            },
            function(results, callback)
            {
                var add_message = {
                    "message": "AddService"
                };

                communication.publish(scheduler_listening_channel, add_message, callback);
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
        case "Heartbeat":
            database.query("UPDATE Services SET last_heartbeat=now() WHERE identifier=$1;",[this._identifier],
                function(err, results){
                    if(err)
                        logging.error({"message": "error while updating heartbeat of service", "identifier": self._identifier, "err":err, "result": results});
                    else
                    {
                        
                    }
                });
            break;
        default:
            console.log("unknown scheduler message", message);
            break;
    }
}

Service.prototype.setStatus = function(update_object, callback)
{
    var self = this;
    async.waterfall(
        [
            function(callback)
            {
                database.query("SELECT status FROM Services WHERE identifier=$1;", [self._identifier], callback);
            },
            function(results, callback)
            {
                if(results.rowCount != 1)
                {
                    callback("couldn't find service status in db", results);
                    return;
                }

                //replicated in scheduler, care
                var new_status = results.rows[0]["status"];
                if(!new_status)
                    new_status = {};

                for(var key in update_object)
                {
                    new_status[key] = update_object[key];
                }

                database.query("UPDATE Services SET status=$2 WHERE identifier=$1;", [self._identifier, new_status], callback);
            },
            function(results, callback)
            {
                if(results.rowCount != 1)
                    callback("couldn't update service status", results);
                else
                    callback(null, results);
            }
        ],
        function(err, result)
        {
            if(err)
                logging.error({"message": "setStatus failed", "err": err, "result": result});

            callback(err);
        }
    );
}

function notifyScheduler(message, callback)
{
    logging.log({"message": "notifying scheduler with", "data":message});
    communication.publish(scheduler_listening_channel, message, callback);
}

exports.Service = Service;
exports.notifyScheduler = notifyScheduler;
exports.scheduler_listening_channel = scheduler_listening_channel; //This is the channel which the scheduler will listen on for messages from the services
exports.scheduler_broadcast_channel = scheduler_broadcast_channel; //Tis is the channel the scheduler uses to notify the services 