var config          = require("./config.js"),
    database        = require("/shared-code/database.js"),
    communication   = require("/shared-code/communication.js");
    logging         = require("/shared-code/logging.js")("schedule-server");

var async           = require("async");
var shortid         = require("shortid");

var job_queue_block = require('semaphore')(1);
var steam_accounts_block = require('semaphore')(1);

var servers = {};
var servers_by_type = {};

var subscriber = null;
var serviceHandlers =
    {
        "Retrieve": handleRetrieveServerMsg,
        "Download": handleDownloadServerMsg,
        "Analysis": handleAnalysisServerMsg,
        "Crawl":    handleCrawlServerMsg
    };
//TODO introduce sema for queue
var jobs_queue = {};


var listener_client;

var retrieve_requests = {};

var retry_delay = 1000;

var steam_accounts = [];
var next_steam_account = {};

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
                steam_accounts_block.take(
                    function(){
                        for(var i = 0; i < results.rowCount; ++i)
                        {

                            steam_accounts.push(
                            {
                                "name": results.rows[i]["name"],
                                "password": results.rows[i]["password"],
                                "used-by": null 
                            });
                        }
                        next_steam_account = {};
                        steam_accounts_block.leave();
                        callback();
                    })
            }
        ],
        callback);
}

var startup_delay = 1000;

function startTasks(callback)
{
    setTimeout(function()
        {
            runQueueLoader();
        },
        startup_delay);

    setTimeout(function()
        {
            updateAllHistories();
        },
        startup_delay);

    setTimeout(function()
        {
            crawlCandidateMatches();
        },
        startup_delay);

    setTimeout(function()
        {
            addSampleMatches();
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
                subscriber.listen("jobs",               handleJobMsg);
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
            schedulerTick();

            break;
        case "UnregisterService":
            logging.log("Unregistering not supported yet");
            break;
        default:
            logging.log({"message":"Unknown scheduler message", "data":message});
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
                logging.log({"message":"trying to requeue ","data":message})
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
            logging.log({"message":"Unknown retrieve message","data":message})
            break;
    }
}

function handleNewUserMsg(channel, message)
{
    switch(message["message"])
    {
        case "User":
                //console.log("requesting new user history");
                var job_data = {
                        "message":      "UpdateHistory",
                        "range-start":  message["id"],
                        "range-end":    message["id"],
                    };
                createTemporaryJob(job_data, function(job_id){});
            break;
        default:
            logging.log("Unknown new user message", message);
            break;
    }
}

function handleDownloadMsg(channel, message)
{
    switch(message["message"])
    {
        case "Download":
                //console.log("requesting new user history");
                var job_data = {
                        "message":      "Download",
                        "id":  message["id"]
                    };
                createJob(job_data);
            break;
        default:
            logging.log({"message":"Unknown download message","data":message})
            break;
    }
}


function handleReplayMsg(channel, message)
{
    switch(message["message"])
    {
        case "Analyse":
                logging.log("new replay file -  analysing");
                var job_data = {
                        "message":      "Analyse",
                        "id":  message["id"]
                    };
                createJob(job_data);
            break;
        default:
            logging.log({"message":"Unknown replay message","data":message})
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
            logging.log("requesting history refresh message", message);
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
                createTemporaryJob(job_data, function(job_id){});
            break;
        default:
            logging.log({"message":"Unknown match history message","data":message})
            break;
    }
}


function handleJobMsg(channel, message)
{
    switch(message["message"])
    {
        case "Load":
            loadQueue();
            break;
        default:
            logging.log({"message":"Unknown job message","data":message})
            break;
    }
}



var retrieve_capacity_block = 120*60*1000; //block server for 2 hours before retry

function handleRetrieveServerMsg(server_identifier, message) //channel name is the server identifier
{
    if(("job" in message) && !(message["job"] in jobs_queue))
    {
        logging.log("couldnt find retrieve job");
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
            switch(message["result"])
            {
                case "finished":
                    closeJob(server_identifier, message["job"]);
                    logging.log({"message":"finished retrieve", "data":message});
                    break;
                case "no-capacity":
                    servers[server_identifier]["over-capacity-timeout"] = Date.now() + retrieve_capacity_block;
                    servers[server_identifier]["busy"] = false;
                    jobs_queue[message["job"]]["state"] = "open"; //rertry this job somewhere else
                    schedulerTick();
                    break;
                default:
                    logging.log({"message":"bad retrieve response:", "data": message});
                    break;
            }
            break;

        case "UpdateHistoryResponse":
            var job =  jobs_queue[message["job"]]; 
            switch(message["result"])
            {
                case "finished":
                    logging.log({"message": "updated history", "job-id":message["job"]});
                    break;
                case "failed":
                    logging.log({"message":"failed to updated history", "data":message, "job": job});
                    break;
            }
            closeJob(server_identifier, message["job"]);
            if(job["callback"])
                job["callback"]();//made a copy, so this works after cleaning up the job
            break;

        case "GetSteamAccount":
            //free old acc
            steam_accounts_block.take(function(){
                for(var i = 0; i < steam_accounts.length; ++i)
                {
                    if(steam_accounts[i]["used-by"] === server_identifier)
                        steam_accounts[i]["used-by"] = null;
                }

                //iterate account
                if(server_identifier in next_steam_account)
                    next_steam_account[server_identifier] = (next_steam_account[server_identifier]+1)%steam_accounts.length;
                else
                    next_steam_account[server_identifier] = 0;
                while(steam_accounts[next_steam_account[server_identifier]]["used-by"] != null)
                {
                    next_steam_account[server_identifier] = (next_steam_account[server_identifier]+1)%steam_accounts.length;
                }

                logging.log({"message": "giving out steam account ","steam_account":next_steam_account[server_identifier], "server": server_identifier});

                var steam_acc_message = 
                    {
                        "message": "SteamAccount",
                        "id": next_steam_account[server_identifier],
                        "name": steam_accounts[next_steam_account[server_identifier]]["name"],
                        "password": steam_accounts[next_steam_account[server_identifier]]["password"]
                    };
                steam_accounts[next_steam_account[server_identifier]]["used-by"] = server_identifier;
                steam_accounts_block.leave();

                communication.publish(server_identifier, steam_acc_message);
            })

            break;

        default:
            logging.log({"message": "unknown response:", "server": server_identifier, "message":message});
            break;
    }
}


function handleDownloadServerMsg(server_identifier, message) //channel name is the server identifier
{
    if(("job" in message) && !(message["job"] in jobs_queue))
    {
        logging.log("couldnt find download job");
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
                    logging.log({"message": "finished download", "job-id": message["job"]});
                    break;
                case "failed":
                    logging.log({"message": "failed download", "job":job});
                    break;
            }
            closeJob(server_identifier, message["job"]);
            break;
        default:
            logging.log({"message": "unknown response:", "server": server_identifier, "message":message});
            break;
    }
}

function handleAnalysisServerMsg(server_identifier, message) //channel name is the server identifier
{
    if(("job" in message) && !(message["job"] in jobs_queue))
    {
        logging.log({"message":"couldnt find analysis job", "data":message});
        return;
    }

    switch(message["message"])
    {
        case "Analyse":
        case "Score":
            //Sent by myself
            break;

        case "AnalyseResponse":
            
            logging.log("got analysis response");
            var job =  jobs_queue[message["job"]]; 
            switch(message["result"])
            {
                case "finished":
                    logging.log({"message": "finished analysis", "job-id":message["job"]});
                    break;
                case "failed":
                    logging.log({"message":"failed analysis", "job":job});
                    break;
                default:
                    logging.log({"message":"weird result ", "data":message});
            }
            if(! (message["message"]==="AnalyseResponse"))
            {
                logging.log("WHAT THE FUCK");
                return;
            }

            closeJob(server_identifier, message["job"]);

            break;

        case "ScoreResponse":
            logging.log("got score response");
            var job =  jobs_queue[message["job"]]; 
            switch(message["result"])
            {
                case "finished":
                    logging.log({"message": "finished score", "job-id":message["job"]});
                    break;
                case "failed":
                    logging.log({"message":"failed score", "job":job});
                    break;
                default:
                    logging.log({"message":"weird score result ", "data":message});
            }
            closeJob(server_identifier, message["job"]);

            break;
        default:
            logging.log({"message": "unknown response:", "server": server_identifier, "message":message});
            break;
    }
}

function handleCrawlServerMsg(server_identifier, message) //channel name is the server identifier
{
    if(("job" in message) && !(message["job"] in jobs_queue))
    {
        logging.log("couldnt find crawl job");
        return;
    }

    switch(message["message"])
    {
        case "CrawlCandidates":
        case "AddSampleMatches":
        case "SteamAccount":
            //Sent by myself
            break;


        case "CrawlCandidatesResponse":
            var job =  jobs_queue[message["job"]]; 
            switch(message["result"])
            {
                case "finished":
                    logging.log({"message":"crawled","job":message["job"]});
                    break;
                case "failed":
                    logging.log({"message":"failed crawl", "job":job});
                    break;
            }
            closeJob(server_identifier, message["job"]);
            if(job["callback"])
                job["callback"]();//made a copy, so this works after cleaning up the job
            break;

        case "AddSampleMatchesResponse":
            var job =  jobs_queue[message["job"]]; 
            switch(message["result"])
            {
                case "finished":
                    logging.log({"message":"added samples","job":message["job"]});
                    break;
                case "failed":
                    logging.log("failed add samples", job);
                    break;
            }
            closeJob(server_identifier, message["job"]);
            if(job["callback"])
                job["callback"]();//made a copy, so this works after cleaning up the job
            break;
        case "GetSteamAccount":
            steam_accounts_block.take(function(){
                //free old acc
                for(var i = 0; i < steam_accounts.length; ++i)
                {
                    if(steam_accounts[i]["used-by"] === server_identifier)
                        steam_accounts[i]["used-by"] = null;
                }

                //iterate account
                if(server_identifier in next_steam_account)
                    next_steam_account[server_identifier] = (next_steam_account[server_identifier]+1)%steam_accounts.length;
                else
                    next_steam_account[server_identifier] = Math.floor(Math.random() * steam_accounts.length);
                while(steam_accounts[next_steam_account[server_identifier]]["used-by"] != null)
                {
                    next_steam_account[server_identifier] = (next_steam_account[server_identifier]+1)%steam_accounts.length;
                }

                logging.log({"message": "giving out steam account ","steam_account":next_steam_account[server_identifier], "server": server_identifier});

                var steam_acc_message = 
                    {
                        "message": "SteamAccount",
                        "id": next_steam_account[server_identifier],
                        "name": steam_accounts[next_steam_account[server_identifier]]["name"],
                        "password": steam_accounts[next_steam_account[server_identifier]]["password"]
                    };
                steam_accounts[next_steam_account[server_identifier]]["used-by"] = server_identifier;
                steam_accounts_block.leave();

                communication.publish(server_identifier, steam_acc_message);
            })
            
            break;

        default:
            logging.log({"message": "unknown response:", "server": server_identifier, "message":message});
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
                    logging.log("failed listening on server channel");
                else
                {
                    servers[identifier] = server;
                    servers_by_type[type].push(identifier);
                    logging.log({"message":"registered service", "servers by type":servers_by_type});
                }
            });
    }
    else
    {
        logging.log("trying to register for unmanaged service type "+ type+" "+identifier);
    }
}

var queue_load_interval = 30*1000;
function runQueueLoader()
{
    loadQueue();
    setTimeout(runQueueLoader, queue_load_interval);
}


function loadQueue()
{
    var locals = {};
    async.waterfall(
        [
            database.generateQueryFunction("SELECT data FROM Settings WHERE name=$1;", ["max_jobs"]),
            function(results, callback)
            {
                locals.max_jobs = results.rows[0]["data"]["value"];
                locals.to_load = Math.max(locals.max_jobs - Object.keys(jobs_queue).length, 0);
                callback();
            },
            function(callback)
            {
                //logging.log("limit enqueue to ",locals.to_load);
                database.query("SELECT id, data, extract(epoch from started) as started from Jobs WHERE finished IS NULL ORDER BY started DESC LIMIT $1;",
                [locals.to_load], callback);
            },
            function(results, callback)
            {
                //TODO: Currently can load same job multiple times, will drop duplicates tho
                // Track executed jobs and only pull free ones
                var n_loaded_jobs = results.rowCount;
                logging.log("Rerunning queue of "+ n_loaded_jobs);
                async.each(results.rows,
                    function(row, callback)
                    {
                        createJob(row["data"], row["id"], row["started"],
                            function(id){
                                callback();
                            }
                        );
                    },
                    function(err, results)
                    {
                        if(n_loaded_jobs > 0)
                            schedulerTick();

                         callback(err, results);
                    });
            }
        ],
        function(err, results)
        {
            if (err)
                logging.error({"err":err, "result":results});
        }
    );
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
                    logging.log("user range "+ results.rows[0]["min"]+" - "+ results.rows[0]["max"]);
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
                logging.error({"message":"updateAllHistories failed", "err":err, "result":results});
            }

            setTimeout(updateAllHistories, check_interval_history);
        }
    );
}

var crawl_interval = 60*1000*5;

function crawlCandidateMatches()
{
    var locals = {};
    async.waterfall(
        [
            database.generateQueryFunction("SELECT data FROM Settings WHERE name=$1;", ["crawler_candidates_batch_size"]),
            function(results, callback)
            {
                var candidates_batch_size = results.rows[0]["data"]["value"];
                var job_data = {
                    "message":      "CrawlCandidates",
                    "n":  candidates_batch_size
                };

                createTemporaryJob
                    (job_data,
                    function(job_id){ jobs_queue[job_id]["callback"] = callback; }
                    );
            }
        ],
        function(err, results)
        {
            if (err)
            {
                logging.error({"err": err, "result": results});
            }
    
            setTimeout(crawlCandidateMatches, crawl_interval);
        }
    );
}

var add_interval = 60*1000*5;

function addSampleMatches()
{
    var locals = {};
    async.waterfall(
        [
            database.generateQueryFunction("SELECT data FROM Settings WHERE name=$1;", ["add_samples_batch_size"]),
            function(results, callback)
            {
                var add_samples_batch_size = results.rows[0]["data"]["value"];

                var job_data = {
                    "message":      "AddSampleMatches",
                    "n":  add_samples_batch_size
                };

                createTemporaryJob
                    (job_data,
                    function(job_id){ jobs_queue[job_id]["callback"] = callback; }
                    );
            }
        ],
        function(err, results)
        {
            if (err)
            {
                logging.error({"err": err, "result": results});
            }
    
            setTimeout(addSampleMatches, add_interval);
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
    //console.log("tick")
    job_queue_block.take(
        function()
        {
            var time =  new Date();
           /*console.log(time.toDateString() ,time.toTimeString(),time.getUTCMilliseconds(), "scheduler tick, ", Object.keys(jobs_queue).length, " jobs in queue");
            for(type in servers_by_type)
            {
                console.log("\t",type, "servers");
                for(var i = 0; i < servers_by_type[type].length; ++i)
                {
                    var server_log_obj = servers[servers_by_type[type][i]];
                    if("over-capacity-timeout" in server_log_obj)
                        server_log_obj["over-capacity-timeout"] = new Date(server_log_obj["over-capacity-timeout"]);
                    console.log("\t\t", servers_by_type[type][i], JSON.stringify(server_log_obj));
                }
            }*/
            var job_keys =  Object.keys(jobs_queue);
            //console.log("tick, n jobs:", job_keys.length);
            /*job_keys.sort(
                function(a, b){
                    return jobs_queue[b]["time"] - jobs_queue[a]["time"];
                })*/
            job_keys = shuffleArray(job_keys);
            async.eachSeries(
                job_keys,
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
                    //console.log("left")
                }
            );
        }
    );
    //console.log("Jobs queue", jobs_queue);
}

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
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
            server_identifier = chooseServer("Download");
            break;
        case "Analyse":
        case "Score":
            server_identifier = chooseServer("Analysis");
            break;
        case "CrawlCandidates":
        case "AddSampleMatches":
            server_identifier = chooseServer("Crawl");
            break;
        default:
            logging.log({"message": "unknown job scheduled", "job-id":job_id, "job":job});
            return;
    }

    if(server_identifier)
    {
        logging.log({"message":"assigned job", "job-id": job_id, "server-id": server_identifier});
    
        //dispatch message to server to handle job
        var message = job["data"];
        message["job"] = String(job_id);

        communication.publish(server_identifier, message,
            function(){
                logging.log({"message":"job message sent", "job-id":job_id});
                job["state"] = "in-progress";
                jobs_queue[String(job_id)] = job;
                servers[server_identifier]["busy"] = true;
                callback();
            });
    }
    else
    {
        //console.log("no server available for ",job_id, "delaying");
        callback();
    }
}


function chooseRetrieveServer(capacity_required)
{
    for(var i = 0; i < servers_by_type["Retrieve"].length; ++i)
    {
        var server_identifier = servers_by_type["Retrieve"][i];
        //console.log("checking server", server_identifier, servers[server_identifier]);
        if(
            !servers[server_identifier]["busy"] && 
            (!capacity_required || servers[server_identifier]["over-capacity-timeout"] < Date.now() )
            )
        {
            //console.log("OK");
            return server_identifier;
        }
    }

    return null;
}

function chooseServer(server_type)
{
    for(var i = 0; i < servers_by_type[server_type].length; ++i)
    {
        var server_identifier = servers_by_type[server_type][i];
        //console.log("checking server", server_identifier, servers[server_identifier]);
        if(
            !servers[server_identifier]["busy"]
            )
        {
            //console.log("OK");
            return server_identifier;
        }
    }

    return null;
}

function createTemporaryJob(data, callback)
{
    createJob(data, "temp"+shortid.generate(), null, callback);
}

function createJob(data, id, started, callback_job)
{
    if(id in jobs_queue)
    {        
        if(callback_job)
            callback_job(id); // pass back id
        return;
    }

    var job = {};
    if(started)
        job ["time"] = started*1000;
    else
        job ["time"] = Date.now();

    //console.log("job ",started, job ["time"])
    job ["state"] = "open";
    job ["data"] = data;
    //console.log("creating job", id, data);
    if(id != null)
    {
        //logging.log("only queued");
        job_queue_block.take(
            function()
            {
                jobs_queue[id] = job;

                job_queue_block.leave();
                schedulerTick();

                if(callback_job)
                    callback_job(id); // pass back id
            });
    }
    else
    {
        //console.log("putting into db");
        async.waterfall(
            [
                database.generateQueryFunction("INSERT INTO Jobs(started, data) VALUES(now(),$1) RETURNING id;", [data]),
                function(results, callback)
                {
                    if(results.rowCount == 1)
                    {
                        logging.log({"message":"created job", "job-id": results.rows[0]["id"]});
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
                    logging.error({"message":"failure creating job", "err":err, "result":results});
                }
                else 
                {
                    var job_id = results;
                    job_queue_block.take(
                        function()
                        {
                            jobs_queue[String(job_id)] = job;
                            job_queue_block.leave();
                    
                            schedulerTick();
                            
                            if(callback_job)
                                callback_job(job_id);
                        });
                }
            }
        );   
    }
}

function closeJob(server_identifier, job_id)
{
    async.waterfall(
        [
            function(callback)
            {
                if (job_id.substring(0, "temp".length) == "temp")
                    callback("temp-job");
                else
                    database.query("UPDATE Jobs SET finished = now() WHERE id=$1;",[job_id], callback);
            },
            function(results, callback)
            {
                if(results.rowCount == 1)
                {
                    logging.log({"message":"closed job", "job-id":job_id});
                    callback();
                }
                else
                    callback("db call failure on job",job_id, results);
            }
        ],
        function(err, results)
        {
            if(!err || err === "temp-job")
            {
                job_queue_block.take(
                    function()
                    {
                        delete jobs_queue[job_id];
                        servers[server_identifier]["busy"] = false;
                        job_queue_block.leave();
                        logging.log({"message":"freed server", "server_id": server_identifier});
                        schedulerTick();
                    });
            }
            else
            {
                logging.error({"message":"failure closing job", "err": err, "result":results});
            }
        }
    );
}