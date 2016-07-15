var config          = require("./config.js"),
    database        = require("/shared-code/database.js"),
    communication   = require("/shared-code/communication.js"),
    services        = require("/shared-code/services.js"),
    logging         = require("/shared-code/logging.js")("schedule-server"),
    jobs            = require("/shared-code/jobs.js"),
    settings        = require("/shared-code/settings.js");

var async           = require("async");
var shortid         = require("shortid");

var job_queue_block = require('semaphore')(1);
var steam_accounts_block = require('semaphore')(1);

var subscriber = null;

//TODO introduce sema for queue
var jobs_queue = {};

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
            //updateAllHistories();
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

    setTimeout(function()
        {
            runHeartbeatRefresh();
        },
        startup_delay);

    setTimeout(function()
        {
            runTimeoutJobs();
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
                subscriber.listen(services.scheduler_listening_channel, handleSchedulerMsg);

                //clean up score_watchers
                callback();
            },
            function(callback)
            {
                communication.publish(services.scheduler_broadcast_channel,{"message":"SchedulerReset"});
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
        case "AddService":
            schedulerTick();
            break;
        case "NewJob":
            schedulerTick();
            break;
        
        case "JobResponse":
            processJobResponse(message);
            break;
        case "GetSteamAccount":
            //free old acc
            steam_accounts_block.take(function(){
                for(var i = 0; i < steam_accounts.length; ++i)
                {
                    if(steam_accounts[i]["used-by"] === message["service"])
                        steam_accounts[i]["used-by"] = null;
                }

                //iterate account
                if(message["service"] in next_steam_account)
                    next_steam_account[message["service"]] = (next_steam_account[message["service"]]+1)%steam_accounts.length;
                else
                    next_steam_account[message["service"]] = Math.floor(Math.random() * steam_accounts.length);
                while(steam_accounts[next_steam_account[message["service"]]]["used-by"] != null)
                {
                    next_steam_account[message["service"]] = (next_steam_account[message["service"]]+1)%steam_accounts.length;
                }

                logging.log({"message": "giving out steam account ","steam_account":next_steam_account[message["service"]], "service": message["service"]});

                var steam_acc_message = 
                    {
                        "message": "SteamAccount",
                        "id": next_steam_account[message["service"]],
                        "name": steam_accounts[next_steam_account[message["service"]]]["name"],
                        "password": steam_accounts[next_steam_account[message["service"]]]["password"]
                    };
                steam_accounts[next_steam_account[message["service"]]]["used-by"] = message["service"];
                steam_accounts_block.leave();

                communication.publish(message["service"], steam_acc_message);
            })

            break;
        default:
            logging.log({"message":"Unknown scheduler message", "data":message});
            break;
    }
}

function processJobResponse(message)
{
    switch(message["result"])
    {
        case "finished":
        case "failed":
            var result_data = {};
            for( var result_entry in message)
            {
                if(result_entry === "message" || result_entry === "job")
                    continue;
                else
                    result_data[result_entry] = message[result_entry];
            }

            async.waterfall(
                [
                    database.generateQueryFunction("UPDATE Jobs SET finished = now(), result=$2 WHERE id=$1;", [message["job"], result_data]),
                    function(results, callback)
                    {
                        if(results.rowCount != 1)
                        {
                            callback("couldn't find job to close", results);
                            return;
                        }
                        database.query("UPDATE Services SET current_job=NULL WHERE current_job=$1;", [message["job"]], callback);
                    },
                    function(results, callback)
                    {
                        if(results.rowCount != 1)
                        {
                            callback("couldn't find service to free", results);
                            return;
                        }

                        callback();
                    }
                ],
                function(err, results)
                {
                    if(err)
                        logging.error({"message":"error closing job", "err": err, "result": results});
                    else
                        logging.log({"message":"finished job", "data":message});

                    schedulerTick();
                });  
            break;

        case "reschedule":
            async.waterfall(
                [
                    database.generateQueryFunction("UPDATE Jobs SET assigned=NULL WHERE id=$1;", [message["job"]]),
                    function(results, callback)
                    {
                        if(results.rowCount != 1)
                        {
                            callback("couldn't find job to reschedule", results);
                            return;
                        }

                        database.query("UPDATE Services SET current_job=NULL WHERE current_job=$1;", [message["job"]], callback);
                    },
                    function(results, callback)
                    {
                        if(results.rowCount != 1)
                        {
                            callback("couldn't find service to free", results);
                            return;
                        }

                        callback();
                    }
                ],
                function(err, results)
                {
                    if(err)
                    {
                        logging.error({"message":"error resetting job", "err": err, "result": results});
                    }

                    schedulerTick();
                });    
            break;
        default:
            logging.log({"message":"bad job response:", "data": message});
            break;
    }
}


var retrieve_capacity_block = 120*60*1000; //block server for 2 hours before retry


var service_heartbeat_timeout   = "22 seconds";
var heartbeat_interval  = 10000;
var heartbeat_check_delay  = 1000;
function runHeartbeatRefresh()
{
    heartbeatRefresh();
    setTimeout(runHeartbeatRefresh, heartbeat_interval);
}

function heartbeatRefresh()
{
    async.waterfall(
        [
            database.generateQueryFunction("SELECT identifier FROM Services;", []),
            function(results, callback)
            {
                var heartbeat_message = {
                    "message": "Heartbeat"
                };
                communication.publish(services.scheduler_broadcast_channel, heartbeat_message, callback);
            },
            function(result, callback)
            {
                setTimeout(callback,heartbeat_check_delay);
            },
            function(callback)
            {
                database.query("DELETE FROM Services WHERE now() - last_heartbeat > $1::interval RETURNING *;", [service_heartbeat_timeout], callback);
            },
            function(results, callback)
            {
                if(results.rowCount > 0)
                {
                    for(var i= 0; i < results.rowCount; i++)
                    {
                        logging.log({"message": "timeouted service", "service": results.rows[i]});
                    }
                    timeoutJobs(); 
                }
                callback();
            }
        ],
        function(err, results)
        {
            if(err)
                logging.error({"message": "error during heartbeat", "err": err, "result": results});
        });

}

var timeout_interval  = 2000;
var max_timeout_retries = 5;

function runTimeoutJobs()
{
    timeoutJobs();
    setTimeout(runTimeoutJobs, heartbeat_interval);
}

function timeoutJobs()
{
    var locals = {};
    async.waterfall(
        [
            database.generateQueryFunction("SELECT id, date_part('epoch',assigned) as assigned ,data->>'message' as type FROM Jobs WHERE assigned IS NOT NULL AND finished IS NULL;", []),
            function(results, callback)
            {
                var current_time = Math.floor(Date.now() / 1000);

                locals["timeouted"] = 0;
                async.each(results.rows,
                    function(row, callback)
                    {

                        var timeout = 0;
                        switch(row["type"])
                        {
                        case "UpdateHistory":
                            timeout = 5;
                            break;
                        case "Retrieve":
                            timeout = 40;
                            break;

                        case "Download":
                            timeout = 5*60;
                            break;

                        case "Analyse":
                            timeout = 10*60;
                            break;
                        case "Score":
                            timeout = 3*60;
                            break;

                        case "CrawlCandidates":
                            timeout = 10*60;
                            break;
                        case "AddSampleMatches":
                            timeout = 5*60;
                            break;
                        default:
                            timeout = 5*60;
                            break;
                        }

                        if(current_time - row["assigned"] > timeout)
                        {
                            locals["timeouted"] += 1;
                            async.waterfall(
                                [
                                    function(callback)
                                    {
                                        database.query("SELECT result FROM Jobs WHERE id=$1;", [row["id"]], callback);
                                    },
                                    function(results, callback)
                                    {
                                        if(results.rowCount != 1)
                                        {
                                            callback("couldnt find job to timeout");
                                            return;
                                        }

                                        var timeouts = 1;
                                        if(results.rows[0]["result"] && "timeouts" in results.rows[0]["result"])
                                            timeouts += results.rows[0]["result"]["timeouts"];

                                        if(timeouts > max_timeout_retries)
                                        {
                                            var failed_result = {"result":"too-many-timeouts", "timeouts": timeouts};
                                            database.query("UPDATE Jobs SET finised=now(), result=$2 WHERE id=$1;", [row["id"], failed_result], callback);
                                        }
                                        else
                                        {
                                            var timeouted_result = {"timeouts": timeouts};
                                            database.query("UPDATE Jobs SET assigned=NULL, result=$2 WHERE id=$1;", [row["id"], timeouted_result], callback);
                                        }
                                    }
                                ],
                                callback);
                        }
                        else
                            callback();
                    },
                    callback)
            },
            function(callback)
            {
                if(locals["timeouted"] > 0)
                {
                    logging.log("timeouted "+locals["timeouted"]+" jobs");
                    schedulerTick();
                }

                callback();
            }
        ],
        function(err, results)
        {
            if(err)
                logging.error({"message": "error during heartbeat", "err": err, "result": results});
        });
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
                                    jobs.startJob(job_data, callback_request);
                                },
                                callback);
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
            function(callback)
            {
                settings.getSetting("crawler_candidates_batch_size", callback)
            },
            function(candidates_batch_size, callback)
            {
                var job_data = {
                    "message":      "CrawlCandidates",
                    "n":  candidates_batch_size
                };

                jobs.startJob(job_data, callback);
            }
        ],
        function(err, results)
        {
            if (err)
            {
                logging.error({"message": "error while adding crawl job", "err": err, "result": results});
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
            function(callback)
            {
                settings.getSetting("add_samples_batch_size", callback)
            },
            function(add_samples_batch_size, callback)
            {
                var job_data = {
                    "message":      "AddSampleMatches",
                    "n":  add_samples_batch_size
                };

                jobs.startJob(job_data, callback);
            }
        ],
        function(err, results)
        {
            if (err)
            {
                logging.error({"message": "error while adding samples job", "err": err, "result": results});
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


var error_code_no_free_services = "no-free-services";
var last_tick = 0;
var min_tick_interval = 100; //at most tick every 0.1sec
var retrieve_capacity_timeout = 1000*60*60*4; //allow retry on retrieve jobs after 4 hours

function schedulerTick()
{
    var current_time = Date.now();
    if(current_time - last_tick < min_tick_interval)
        return;
    else
        last_tick = current_time;

    var locals = {};
    job_queue_block.take(
        function()
        {
            async.waterfall(
                [
                    database.generateQueryFunction("SELECT identifier, type, status FROM Services WHERE current_job IS NULL;", []),
                    function(results, callback)
                    {
                        if(results.rowCount == 0)
                        {
                            callback(error_code_no_free_services);
                            return;
                        }
                        locals.free_services = results.rows;
                        settings.getSetting("max_jobs", callback);
                    },
                    function(max_jobs, callback)
                    {

                        database.query("SELECT id, date_part('epoch',started) as started, data FROM jobs WHERE finished is NULL AND assigned IS NULL ORDER BY started DESC LIMIT $1;", [max_jobs], callback);
                    },
                    function(results, callback)
                    {
                        locals.scheduler_items = [];

                        async.each(results.rows,
                            function(row, callback)
                            {
                                var scheduling_item = {
                                    "primary_priority": 0,
                                    "secondary_priority": 0,
                                    "started": row["started"],
                                    "data": row["data"]
                                };
                                scheduling_item.data["job"] = row["id"];

                                //TODO add prioritisation within each job type
                                switch(scheduling_item.data.message)
                                {
                                case "UpdateHistory":
                                    scheduling_item.primary_priority = 2;
                                    break;
                                case "Retrieve":
                                    scheduling_item.primary_priority = 1;
                                    break;

                                case "Download":
                                    scheduling_item.primary_priority = 1;
                                    break;

                                case "Analyse":
                                    scheduling_item.primary_priority = 1;
                                    break;
                                case "Score":
                                    scheduling_item.primary_priority = 2;
                                    break;

                                case "CrawlCandidates":
                                    scheduling_item.primary_priority = 2;
                                    break;
                                case "AddSampleMatches":
                                    scheduling_item.primary_priority = 1;
                                    break;

                                default:
                                    logging.log("unknown job message for scheduling "+scheduling_item.data.message)
                                    scheduling_item.primary_priority = 0;
                                    break;
                                }
                                locals.scheduler_items.push(scheduling_item);
                                callback();
                            },
                            callback)
                    },
                    function(callback)
                    {
                        var scheduling_sets = {};

                        for(var i = 0; i < locals.scheduler_items.length; ++i)
                        {
                            var scheduling_item = locals.scheduler_items[i];
                            var service_type = "Unknown";
                            switch(scheduling_item.data.message)
                            {
                            case "UpdateHistory":
                            case "Retrieve": 
                                service_type = "Retrieve";
                                break;
                            case "Download": 
                                service_type = "Download";
                                break;
                            case "Analyse":
                            case "Score": 
                                service_type = "Analysis";
                                break;
                            case "CrawlCandidates":
                            case "AddSampleMatches":
                                service_type = "Crawl";
                                break;
                            default:
                                logging.log("unknown job message "+scheduling_item.data.message)
                                    break;
                            }
                            if(! (service_type in scheduling_sets))
                                scheduling_sets[service_type] = [];
                            scheduling_sets[service_type].push(scheduling_item);
                        }
                        for(var service_type in scheduling_sets)
                        {
                            scheduling_sets[service_type].sort(
                                function(item_a, item_b)
                                {
                                    //Sort with ascending scheduling priority, tiebreak with secondary priority and then start time
                                    if(item_a.primary_priority > item_b.primary_priority)
                                        return 1;
                                    else if (item_a.primary_priority < item_b.primary_priority)
                                        return -1;
                                    else
                                    {
                                        if(item_a.secondary_priority > item_b.secondary_priority)
                                            return 1;
                                        else if (item_a.secondary_priority < item_b.secondary_priority)
                                            return -1;
                                        else
                                        {
                                            return item_a.started - item_b.started;
                                        }
                                    }
                                });
                        }

                        //console.log("sets", JSON.stringify(scheduling_sets));
                        var current_time = Math.floor(Date.now() / 1000);
                        async.eachSeries(locals.free_services,
                            function(service, callback)
                            {
                                if(! (service["type"] in scheduling_sets))
                                {
                                    callback();
                                    return;
                                }

                                var best_job = null;

                                for(var i = scheduling_sets[service["type"]].length -1; i >= 0; --i)
                                {
                                    if( service["type"] === "Retrieve" &&
                                        "no-retrieve-capacity" in service["status"] &&
                                        current_time - service["status"]["no-retrieve-capacity"] < retrieve_capacity_timeout &&
                                        scheduling_sets[service["type"]][i]["data"]["message"] === "Retrieve"
                                        )
                                        continue;
                                    else if("machine" in scheduling_sets[service["type"]][i]["data"] &&
                                        ! (scheduling_sets[service["type"]][i]["data"]["machine"] === service["status"]["machine"]))
                                        continue;
                                    else
                                    {
                                        best_job = scheduling_sets[service["type"]][i];
                                        scheduling_sets[service["type"]].splice(i,1);//remove job from set
                                        break;
                                    }
                                }

                                if(!best_job)
                                {
                                    callback();
                                    return;
                                }
                                logging.log({"message": "assigning job", "job": best_job, "service":service});
                                //console.log("scheduling job", best_job, service);
                                async.waterfall(
                                    [
                                        function(callback)
                                        {
                                            database.query("UPDATE Services SET current_job=$2 WHERE identifier=$1;", [service["identifier"], best_job["data"]["job"]], callback);
                                        },
                                        function(results, callback)
                                        {
                                            //update job
                                            database.query("UPDATE Jobs SET assigned=now() WHERE id=$1;", [best_job["data"]["job"]], callback);
                                        },
                                        function(results, callback)
                                        {
                                            communication.publish(service["identifier"], best_job["data"], callback);
                                        },
                                    ],
                                    callback);

                            },
                            callback)
                    }
                ],
                function(err, results)
                {
                    if(err === error_code_no_free_services)
                    {
                        //do nothing, this is fine
                    }
                    if(err)
                        logging.error({"message": "error during schedulerTick", "err": err, "result": results});

                    job_queue_block.leave();
                });
        }
    );
    //console.log("Jobs queue", jobs_queue);
}
