var config          = require("./config.js"),
    database        = require("/shared-code/database.js");
    communication   = require("/shared-code/communication.js");

var async           = require("async");
var shortid         = require("shortid");

var job_queue_block = require('semaphore')(1);

var servers = {};
var servers_by_type = {};

var subscriber = null;
var serviceHandlers =
    {
        "Retrieve": handleRetrieveServerMsg,
        "Download": handleDownloadServerMsg,
        "Analysis": handleAnalysisServerMsg
    };
//TODO introduce sema for queue
var jobs_queue = {};


var listener_client;

var retrieve_requests = {};

var retry_delay = 1000;

var steam_accounts = [];
var next_steam_account = 0;

//THIS IS MAIN
async.series(
    [
        initialise,
        registerListeners,
        loadQueue,
        startTasks
    ]
);

function initialise(callback)
{
    for (service in serviceHandlers) 
    {
        servers_by_type[service] = [];
    }
    //init steam accounts
    async.waterfall(
        [
            database.generateQueryFunction(
                "SELECT id, name, password from SteamAccounts;",
                []),
            function(results, callback)
            {
                console.log("result steamaccs", results);
                for(var i = 0; i < results.rowCount; ++i)
                {

                    steam_accounts.push(
                    {
                        "name": results.rows[i]["name"],
                        "password": results.rows[i]["password"],
                        "used-by": null 
                    });
                }
                next_steam_account = 0;
                console.log("got steam accs", steam_accounts);
                callback();
            }
        ],
        callback);
}


function loadQueue(callback)
{
    var locals = {};
    async.waterfall(
        [
            database.generateQueryFunction(
                "SELECT id, data from Jobs WHERE finished IS NULL;",
                []),
            function(results, callback)
            {
                console.log("Rerunning queue of ", results.rowCount);
                async.each(results.rows,
                    function(row, callback)
                    {
                        createJob(row["data"], row["id"], 
                            function(id){
                                callback();
                            }
                        );
                    },
                    callback);
            }
        ],
        function(err, results)
        {
            if (err)
                console.log(err, results);
            callback(err, results);
        }
    );
}

var startup_delay = 1000;

function startTasks(callback)
{
    setTimeout(function()
        {
            updateAllHistories();
        },
        startup_delay);

    setTimeout(function()
        {
            runScheduler();
        },
        startup_delay);

    callback();
}


function registerListeners(final_callback)
{
    async.series(
        [
            function(callback)
            {
                subscriber = new communication.Subscriber(callback);
            },
            function(callback)
            {
                subscriber.listen("scheduler",          handleSchedulerMsg);
                subscriber.listen("retrieval_watchers", handleRetrievalMsg);
                subscriber.listen("newuser_watchers",   handleNewUserMsg);
                subscriber.listen("download_watchers",  handleDownloadMsg);
                subscriber.listen("replay_watchers",    handleReplayMsg);
                subscriber.listen("match_history",      handleMatchHistoryMsg);

                //clean up score_watchers
                callback();
            },
            function(callback)
            {
                communication.publish("scheduler_broadcast",{"message":"SchedulerReset"});
                callback();
            }
        ],
        final_callback
    );
}

function handleSchedulerMsg(channel, message)
{
    switch(message["message"])
    {
        case "RegisterService":
            registerService(message["type"], message["identifier"]);

            break;
        case "UnregisterService":
            console.log("Unregistering not supported yet", message);
            break;
        default:
            console.log("Unknown scheduler message", message);
            break;
    }
}

function handleRetrievalMsg(channel, message)
{
    switch(message["message"])
    {
        case "Retrieve":
            if(message["id"] in retrieve_requests)
            {
                console.log("trying to requeue ",message)
            }
            else
            {
                var job_data =  
                    {
                        "message": "Retrieve",
                        "id": message["id"]
                    };
                createJob(job_data);
            }
            break;
        default:
            console.log("Unknown retrieve message", message);
            break;
    }
}

function handleNewUserMsg(channel, message)
{
    switch(message["message"])
    {
        case "User":
                console.log("requesting new user history");
                var job_data = {
                        "message":      "UpdateHistory",
                        "range-start":  message["id"],
                        "range-end":    message["id"],
                    };
                createTemporaryJob(job_data, function(job_id){
                        jobs_queue[job_id]["callback"] = function(){};
                    });
            break;
        default:
            console.log("Unknown new user message", message);
            break;
    }
}

function handleDownloadMsg(channel, message)
{
    switch(message["message"])
    {
        case "Download":
                console.log("requesting new user history");
                var job_data = {
                        "message":      "Download",
                        "id":  message["id"]
                    };
                createJob(job_data);
            break;
        default:
            console.log("Unknown download message", message);
            break;
    }
}


function handleReplayMsg(channel, message)
{
    switch(message["message"])
    {
        case "Analyse":
                console.log("new replay file -  analysing");
                var job_data = {
                        "message":      "Analyse",
                        "id":  message["id"]
                    };
                createJob(job_data);
            break;
        default:
            console.log("Unknown replay message", message);
            break;
    }
}

var user_last_refresh = {};
var min_refresh_interval = 60*1000;

function handleMatchHistoryMsg(channel, message)
{
    switch(message["message"])
    {
        case "RefreshHistory":
                //console.log("requesting user history refresh");
                if(message["id"] in user_last_refresh)
                {
                    var new_time = Date.now();
                    if(new_time - user_last_refresh[message["id"]] < min_refresh_interval)
                    {
                       //console.log("refresh declined");
                       break;
                    }
                    else
                        user_last_refresh[message["id"]] = new_time;
                }
                else
                    user_last_refresh[message["id"]] = Date.now();

                var job_data = {
                        "message":      "UpdateHistory",
                        "range-start":  message["id"],
                        "range-end":    message["id"],
                    };
                createTemporaryJob(job_data, function(job_id){
                        jobs_queue[job_id]["callback"] = function(){};
                    });
            break;
        default:
            console.log("Unknown match history message", message);
            break;
    }
}

var retrieve_capacity_block = 120*60*1000; //block server for 2 hours before retry

function handleRetrieveServerMsg(server_identifier, message) //channel name is the server identifier
{
    if(("job" in message) && !(message["job"] in jobs_queue))
    {
        console.log("couldnt find retrieve job", message);
        return;
    }

    switch(message["message"])
    {
        case "Retrieve":
        case "UpdateHistory":
        case "SteamAccount":
            //Sent by myself
            break;

        case "RetrieveResponse":
            servers[server_identifier]["busy"] = false;
            switch(message["result"])
            {
                case "finished":
                    closeJob(message["job"]);
                    console.log("finished retrieve", message);
                    break;
                case "no-capacity":
                    servers[server_identifier]["over-capacity-timeout"] = Date.now() + retrieve_capacity_block;
                    jobs_queue[message["job"]]["state"] = "open"; //rertry this job somewhere else
                    schedulerTick();
                    break;
                default:
                    console.log("bad retrieve response:", server_identifier, message);
                    break;
            }
            break;

        case "UpdateHistoryResponse":
            var job =  jobs_queue[message["job"]]; 
            switch(message["result"])
            {
                case "finished":
                    console.log("updated history", message["job"]);
                    break;
                case "failed":
                    console.log("failed to updated history", job);
                    break;
            }
            closeTemporaryJob(message["job"]);
            servers[server_identifier]["busy"] = false;
            job["callback"]();//made a copy, so this works after cleaning up the job
            break;

        case "GetSteamAccount":
            //free old acc
            for(var i = 0; i < steam_accounts.length; ++i)
            {
                if(steam_accounts[i]["used-by"] === server_identifier)
                    steam_accounts[i]["used-by"] = null;
            }

            //iterate account
            next_steam_account = (next_steam_account+1)%steam_accounts.length;
            while(steam_accounts[next_steam_account]["used-by"] != null)
            {
                next_steam_account = (next_steam_account+1)%steam_accounts.length;
            }

            var steam_acc_message = 
                {
                    "message": "SteamAccount",
                    "id": next_steam_account,
                    "name": steam_accounts[next_steam_account]["name"],
                    "password": steam_accounts[next_steam_account]["password"]
                };
            steam_accounts[next_steam_account]["used-by"] = server_identifier;
            communication.publish(server_identifier, steam_acc_message);
            break;
            
        default:
            console.log("unknown response:", server_identifier, message);
            break;
    }
}


function handleDownloadServerMsg(server_identifier, message) //channel name is the server identifier
{
    if(("job" in message) && !(message["job"] in jobs_queue))
    {
        console.log("couldnt find download job", message);
        return;
    }

    switch(message["message"])
    {
        case "Download":
            //Sent by myself
            break;

        case "DownloadResponse":
            var job =  jobs_queue[message["job"]]; 
            switch(message["result"])
            {
                case "finished":
                    console.log("finished download", message["job"]);
                    break;
                case "failed":
                    console.log("failed download", job);
                    break;
            }
            closeJob(message["job"]);
            servers[server_identifier]["busy"] = false;
            break;
        default:
            console.log("unknown response:", server_identifier, message);
            break;
    }
}

function handleAnalysisServerMsg(server_identifier, message) //channel name is the server identifier
{
    if(("job" in message) && !(message["job"] in jobs_queue))
    {
        console.log("couldnt find analysis job", message);
        return;
    }

    switch(message["message"])
    {
        case "Analyse":
            //Sent by myself
            break;

        case "AnalyseResponse":
            var job =  jobs_queue[message["job"]]; 
            switch(message["result"])
            {
                case "finished":
                    console.log("finished analysis", message["job"]);
                    break;
                case "failed":
                    console.log("failed analysis", job);
                    break;
            }
            closeJob(message["job"]);
            servers[server_identifier]["busy"] = false;
            break;
        default:
            console.log("unknown response:", server_identifier, message);
            break;
    }
}


function registerService(type, identifier)
{
    if(type in serviceHandlers)
    {
        var server = {}
        server["busy"] = false;
        switch(type)
        {
        case "Retrieve":
            server["over-capacity-timeout"] = Date.now(); //otherwise timestamp from when there will be capacity available
            break;
        default:
            break;
        }

        subscriber.listen(identifier, serviceHandlers[type],
            function (err, results)
            {
                if(err)
                    console.log("failed listening on server channel", err, results);
                else
                {
                    servers[identifier] = server;
                    servers_by_type[type].push(identifier);
                    console.log("registered service", servers_by_type);
                }
            });
    }
    else
    {
        console.log("trying to register for unmanaged service type", type, identifier);
    }
}

var history_job_size = 50;
var check_interval_history = 60*1000*10;

function updateAllHistories()
{
    var locals = {};
    async.waterfall(
        [
            database.generateQueryFunction("SELECT MIN(u.id) as min, MAX(u.id) as max FROM Users u;",[]),
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
                                    var job_data = {
                                        "message":      "UpdateHistory",
                                        "range-start":  range_row[0],
                                        "range-end":    range_row[1],
                                    };
                                    createTemporaryJob(job_data, function(job_id){
                                        jobs_queue[job_id]["callback"] = callback_request;
                                    });
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

            setTimeout(updateAllHistories, check_interval_history);
        }
    );
}

var scheduler_tick_interval = 30*1000; //update jobs every 30sec
function runScheduler()
{
    schedulerTick();
    setTimeout(runScheduler, scheduler_tick_interval);
}

function schedulerTick()
{
    //Make async
    //console.log("scheduler tick, ", Object.keys(jobs_queue).length, " jobs in queue");
    job_queue_block.take(
        function()
        {
            async.eachSeries(
                Object.keys(jobs_queue),
                function(job_id, callback)
                {
                    if(jobs_queue[job_id]["state"] === "open")
                    {
                        scheduleJob(job_id, callback);
                    }
                    else
                    {
                        callback();
                    }
                },
                function()
                {
                    job_queue_block.leave();
                }
            );
        }
    );
    //console.log("Jobs queue", jobs_queue);
}

function scheduleJob(job_id, callback)
{
    var server_identifier = null;

    var job  = jobs_queue[job_id];
    switch(job["data"]["message"])
    {
        case "Retrieve":
            server_identifier = chooseRetrieveServer(true);
            break;
        case "UpdateHistory":
            server_identifier = chooseRetrieveServer(false);
            break;
        case "Download":
            server_identifier = chooseDownloadServer();
            break;
        case "Analyse":
            server_identifier = chooseAnalysisServer();
            break;
        default:
            console.log("unknown job scheduled", job_id, job);
            return;
    }
    console.log("assigned job ", job_id, " to ", server_identifier);
    
    if(server_identifier)
    {
        //dispatch message to server to handle job
        var message = job["data"];
        message["job"] = job_id;

        communication.publish(server_identifier, message,
            function(){
                console.log("message sent");
                job["state"] = "in-progress";
                jobs_queue[job_id] = job;
                servers[server_identifier]["busy"] = true;
                callback();
            });
    }
    else
    {
        console.log("no server available for ",job_id, "delaying");
        callback();
    }
}


function chooseRetrieveServer(capacity_required)
{
    for(var i = 0; i < servers_by_type["Retrieve"].length; ++i)
    {
        var server_identifier = servers_by_type["Retrieve"][i];
        console.log("checking server", server_identifier, servers[server_identifier]);
        if(
            !servers[server_identifier]["busy"] && 
            (!capacity_required || servers[server_identifier]["over-capacity-timeout"] < Date.now() )
            )
        {
            console.log("OK");
            return server_identifier;
        }
    }

    return null;
}

function chooseDownloadServer()
{
    for(var i = 0; i < servers_by_type["Download"].length; ++i)
    {
        var server_identifier = servers_by_type["Download"][i];
        console.log("checking server", server_identifier, servers[server_identifier]);
        if(
            !servers[server_identifier]["busy"]
            )
        {
            console.log("OK");
            return server_identifier;
        }
    }

    return null;
}

function chooseAnalysisServer()
{
    for(var i = 0; i < servers_by_type["Analysis"].length; ++i)
    {
        var server_identifier = servers_by_type["Analysis"][i];
        console.log("checking server", server_identifier, servers[server_identifier]);
        if(
            !servers[server_identifier]["busy"]
            )
        {
            console.log("OK");
            return server_identifier;
        }
    }

    return null;
}



function createTemporaryJob(data, callback)
{
    createJob(data, shortid.generate(), callback);
}

function createJob(data, id, callback_job)
{
    var job = {};
    job ["time"] = Date.now();
    job ["state"] = "open";
    job ["data"] = data;

    if(id)
    {
        jobs_queue[id] = job;
        schedulerTick();

        if(callback_job)
            callback_job(id); // pass back id
    }
    else
    {
        async.waterfall(
            [
                database.generateQueryFunction("INSERT INTO Jobs(started, data) VALUES(now(),$1) RETURNING id;", [data]),
                function(results, callback)
                {
                    if(results.rowCount == 1)
                    {
                        console.log("created job", results.rows[0]["id"]);
                        callback(null, results.rows[0]["id"]);
                    }
                    else
                        callback("db call failure",results);
                }
            ],
            function(err, results)
            {
                if (err)
                {
                    console.log("failure creating job", err, results);
                }
                else 
                {
                    var job_id = results;
                    jobs_queue[job_id] = job;
                    
                    schedulerTick();
                    
                    if(callback_job)
                        callback_job(job_id);
                }
            }
        );   
    }
}

function closeTemporaryJob(job_id)
{
    delete jobs_queue[job_id];
}

function closeJob(job_id)
{
    async.waterfall(
        [
            database.generateQueryFunction("UPDATE Jobs SET finished = now() WHERE id=$1;",[job_id]),
            function(results, callback)
            {
                if(results.rowCount == 1)
                {
                    console.log("closed job", job_id);
                    callback();
                }
                else
                    callback("db call failure on job",job_id, results);
            }
        ],
        function(err, results)
        {
            if (err)
            {
                console.log("failure closing job", err, results);
            }
            else
            {
                delete jobs_queue[job_id];
            }

        }
    );
}