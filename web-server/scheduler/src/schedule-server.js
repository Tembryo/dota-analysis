var config      = require("./config.js"),
    database    = require("./database.js");

var async       = require("async");


var registeredServers = {};
var registeredIdentifiers = [];

var managedServices = ["Retrieve"];
var listener_client;

//THIS IS MAIN
async.series(
    [
        initialise,
        registerListeners,
    ]
);

function initialise(callback)
{
    for (var i = 0; i < managedServices.length; i++) 
    {
        registeredServers[managedServices[i]] = [];
    }

    callback();
}



function registerListeners(callback)
{
    listener_client = database.getClient();
    listener_client.connect(
        function(err)
        {
            if(err) {
                return console.error('could not connect to postgres', err);
            }

            listener_client.on('notification', processNotification);

            listener_client.query(
                "LISTEN scheduler;",
                [],
                function(err, results)
                {
                    console.log("added scheduler listener");
                });

            listener_client.query(
                "LISTEN retrieval_watchers;",
                [],
                function(err, results)
                {
                    console.log("added retrieval listener");
                });
            callback();
          //no end -- client.end();
        }
    );
}

function processNotification(msg)
{
    console.log("got notification", msg);
    var parts=msg.payload.split(",");
    
    if(registeredIdentifiers.indexOf(msg.channel) >= 0)
    {
        processResponse(msg.channel, parts);
    }
    else if(msg.channel === "scheduler" || msg.channel === "retrieval_watchers")
    {
        if(parts.length < 1)
        {
            console.log("bad notification", msg);
            return;
        }
        switch(parts[0])
        {
            case "Retrieve":
                var request_id = parseInt(parts[1]);
                if(request_id in retrieve_requests)
                {
                    console.log("trying to requeue ",msg)
                }
                else
                {
                    scheduleRetrieve(request_id);
                }
                break;
            case "RegisterService":
                var type = parts[1];
                var ident = parts[2];
                registerService(type, ident);
                break;
            case "UnregisterService":
                console.log("Unregistering not supported yet", msg);
                break;
            default:
                console.log("Unknown notification", parts);
        }
    }
    else
    {
        console.log("got message on bad channel: ",msg);
    }
    
}


function registerService(type, identifier)
{
    if(managedServices.indexOf(type) >= 0)
    {
        var server = {}
        server["identifier"] = identifier;

        registeredServers[type].push(server);

        listener_client.query(
            "LISTEN \""+identifier+"\";",
            [],
            function(err, results)
            {
                console.log("listening on server channel", identifier);
                registeredIdentifiers.push(identifier);
            });
    }
}

var retrieve_requests = {};

function scheduleRetrieve(request_id)
{
    if(registeredServers["Retrieve"].length < 1)
    {
        console.log("Trying to retrieve, but no servers ");
        return;
    }
    var server = registeredServers["Retrieve"][0];
    listener_client.query("SELECT pg_notify($1, 'Retrieve,'||$2);",[server["identifier"], request_id],
        function(){
            var request = { "tried": 0}
            retrieve_requests[request_id] = request;
        });
}

function processResponse(server_identifier, msg_parts)
{
    switch(msg_parts[0])
    {
        case "Retrieve":
            //Sent by myself
            break;
        case "RetrieveResponse":
            if(msg_parts[1] == "finished")
            {
                delete retrieve_requests[msg_parts[2]];
                console.log("finished retrieve", msg_parts)
            }
            else if(msg_parts[1] == "no-capacity")
            {
                var request = retrieve_requests[msg_parts[2]];
                if(request["tried"] < registeredServers["Retrieve"].length )
                {
                    request["tried"] += 1;
                    console.log("trying next server to retrieve", request["tried"]);
                    var server = registeredServers["Retrieve"][request["tried"]];
                    listener_client.query("SELECT pg_notify($1, 'Retrieve,'||$2);",[server["identifier"], request_id],
                        function(){
                            retrieve_requests[msg_parts[2]] = request;
                        });
                }
                else
                {
                    console.log("No retrieve capacity left, stopping ",msg_parts[2]);
                    delete retrieve_requests[msg_parts[2]];
                }
            }
            else
            {
                console.log("bad response:", server_identifier, msg_parts)
            }
            break;
        default:
            console.log("unnkown response:", server_identifier, msg_parts)
    }
}