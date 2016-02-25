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
        startTasks
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
                    listener_client.query(
                        "SELECT pg_notify('scheduler_broadcast', 'SchedulerReset');",
                        [],
                        function(){
                            console.log("broadcasted reset");
                            }
                        );
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


var check_interval_history = 60*1000*10;

function startTasks(callback)
{
    setTimeout(function()
        {
            updateAllHistories();

        },1000);
    callback();
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
        server["busy"] = false;

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
    var server_nr = chooseRetrieveServer();
    if(server_nr < 0)
    {
        setTimeout(function(){scheduleRetrieve(request_id)}, 1000);
    }
    var server = registeredServers["Retrieve"][];
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
        case "UpdateHistory":
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
                    var next_server_nr = (findServerNr("Retrieve", server_identifier) +1 ) % registeredServers["Retrieve"].length;
                    var server = registeredServers["Retrieve"][next_server_nr];
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

        case "UpdateHistoryResponse":
            if(msg_parts[1] == "finished")
            {
                console.log("updated history", msg_parts[2], msg_parts[3])
            }
            else if(msg_parts[1] == "failed")
            {
                console.log("failed to updated history, errors: ", msg_parts[2], msg_parts[3])
            }
            registeredServers["Retrieve"][findServerNr("Retrieve", server_identifier)]["busy"] = false;
            history_requests[server_identifier]["callback"]();
            break;
        default:
            console.log("unknown response:", server_identifier, msg_parts)
    }
}


var history_job_size = 50;


function updateAllHistories()
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
                    "SELECT MIN(u.id) as min, MAX(u.id) as max FROM Users u;",
                    [],
                    callback);
            },
            function(results, callback)
            {
                if(results.rowCount == 1)
                {
                    console.log("user range", results.rows[0]["min"], results.rows[0]["max"]);
                    //TODO
                    var ranges = [];
                    var start =  results.rows[0]["min"];
                    var end = Math.min(start + history_job_size, results.rows[0]["max"]);

                    while(start < results.rows[0]["max"])
                    {
                        ranges.push([start, end]);
                        start = end+1;
                        end = Math.min(end + history_job_size, results.rows[0]["max"]);
                    }

                    async.eachSeries(
                                ranges,
                                function(range_row, callback_request)
                                {
                                    scheduleHistoryUpdate(range_row, callback_request); 
                                },
                                function(err, results){callback();});
                }
                else
                    callback("db call failure",results);
            }
        ],
        function(err, results)
        {
            if (err)
            {
                console.log("failure", err, results, user_id_range);
            }
            else
            {
                locals.done();
            }

            setTimeout(updateAllHistories, check_interval_history);
        }
    );
}

var history_requests = {};

function scheduleHistoryUpdate(range, callback)
{
    if(registeredServers["Retrieve"].length < 1)
    {
        console.log("Trying to retrieve, but no servers ");
        callback("no servers");
    }

    var server_nr = chooseRetrieveServer();
    if (server_nr < 0)
        setTimeout(function(){scheduleHistoryUpdate(range, callback);}, 1000);
    var server = registeredServers["Retrieve"][server_nr];
    registeredServers["Retrieve"][server_nr]["busy"] = true;
    listener_client.query("SELECT pg_notify($1, 'UpdateHistory,'||$2||','||$3);",[server["identifier"], range[0], range[1]],
        function(){
            var request = { "callback": callback}
            history_requests[server["identifier"]] = request;
        });
}

function chooseRetrieveServer()
{
    for(var i = 0; i < registeredServers["Retrieve"].length; ++i)
    {
        if(!registeredServers["Retrieve"][i]["busy"])
        {
            return i;
        }
    }

    return 0;//if all are busy, just take first one
}

function findServerNr(service, identifier)
{
    for(var i = 0; i < registeredServers[service].length; ++i)
    {
        if(registeredServers[service][i]["identifier"]===identifier)
        {
            return i;
        }
    }
    console.log("couldnt find server identifier", service, identifier);
    return -1;
}