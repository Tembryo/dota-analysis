var async       = require("async"),
    fs          = require('fs'),
    request     = require('request');

var database    = require("/shared-code/database.js"),
    config      = require("/shared-code/config.js");
    services    = require("/shared-code/services.js"),
    storage     = require("/shared-code/storage.js"),
    machine     = require("/shared-code/machine.js"),
    jobs        = require("/shared-code/jobs.js"),
    logging     = require("/shared-code/logging.js")("download-server");

var async       = require("async");
var mkdirp = require('mkdirp');


var re_register_timeout = 1000;
//THIS IS MAIN

var service = null;
//THIS IS MAIN
async.series(
    [
        function(callback)
        {
            mkdirp('/shared/replays', function (err) {
                if (err) logging.error({"message": "mkdirp error", "err": err});
                else logging.log("replay folder is fine!");
                callback();
            });
        },
        function(callback)
        {
            service = new services.Service("Download", handleDownloadServerMsg, callback);
        },
        function(callback)
        {
            logging.log("Download service started");
        }
    ]
);


function handleDownloadServerMsg(server_identifier, message)
{
    switch(message["message"])
    {
        case "Download":
            processDownloadRequest(message,
                function()
                {
                    logging.log({"message": "finished download", "id": message["id"]});
                }
            );
            break;
        default:
            logging.log({"message": "unknown message ", "server-id": server_identifier, "data": message});
            break;
    }
}

var error_message_exists = "existing_match";

function processDownloadRequest(message, callback_request)
{
    logging.log({"message": "processing replay", "matchid":message["id"]});
    var locals = {};
    locals.request_id = message["id"];
    async.waterfall(
        [
            database.generateQueryFunction(
                "SELECT requester_id, data FROM MatchRetrievalRequests mrr WHERE mrr.id=$1;",
                [locals.request_id]),
            function(results, callback)
            {
                if(results.rowCount!=1)
                {
                    callback("didnt find matchretrievalrequest", results);
                    return;
                }

                locals.requester_id = results.rows[0].requester_id;
                locals.match_id = locals.request_id;
                locals.store_path = config.shared+"/replays/";
                locals.data = results.rows[0].data;

                database.query("SELECT id FROM ReplayFiles WHERE (upload_filename~E'^\\d+$' AND upload_filename::bigint = $1) OR match_id=$1;", [locals.request_id], callback);
            },
            function(results, callback)
            {
                if(results.rowCount != 0)
                {
                    database.query(
                        "UPDATE MatchRetrievalRequests mrr SET retrieval_status=(SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label=$2) WHERE mrr.id=$1;",
                        [locals.request_id, "retrieved"],
                        function(err, results)
                        {
                            if(err)
                                callback(err, results);
                            else
                                callback(error_message_exists);
                        });
                    return;
                }

                logging.log("starting download");
                downloadMatch(locals.data, locals.store_path, callback);
            },
            function(replay_file, callback)
            {
                logging.log("finished dl")
                storage.store("replays/"+locals.match_id+".dem.bz2",callback);
            },
            function(store_path, callback)
            {
                logging.log("stored match");
                database.query(
                    "INSERT INTO ReplayFiles (file, upload_filename, processing_status, uploader_id) VALUES ($1, $2, (SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$3), $4) RETURNING id;",
                    [store_path, locals.match_id, "uploaded", locals.requester_id],
                    callback);
            },
            function(results, callback)
            {
                if(results.rowCount!=1)
                    callback("inserting replayfile failed", results);
                else
                {
                    locals.replay_id = results.rows[0]["id"];
                    logging.log("inserted replayfile");
                    database.query(
                        "UPDATE MatchRetrievalRequests mrr SET retrieval_status=(SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label=$2) WHERE mrr.id=$1 RETURNING mrr.id;",
                        [locals.request_id, "retrieved"],
                        callback);
                }
            },
            function(results, callback)
            {
                if(results.rowCount!=1)
                {
                    callback("setting status failed", results);
                    return;
                }

                machine.getMachineID(callback);
            },
            function(machine_id, callback)
            {
                var job_data = {
                        "message":      "Analyse",
                        "id":  locals.replay_id,
                        "machine": machine_id
                    };

                jobs.startJob(job_data, callback);
            }
        ],
        function(err, results)
        {
            if(err === error_message_exists)
            {
                //result good
                logging.log({"message":"skipped downloading existing match", "matchid":locals.request_id});
            }
            else if(err)
            {
                database.query(
                    "UPDATE MatchRetrievalRequests mrr SET retrieval_status=(SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label=$2) WHERE mrr.id=$1 RETURNING mrr.id;",
                    [locals.request_id, "failed"],
                    function(err2, results2)
                    {
                        if(err2 || results2.rowCount != 1)
                        {
                            logging.error({"message": "put request as failed - failed again", "matchid": locals.request_id, "err": err, "result": results, "err2": err2, "result2": results2});
                        }
                        else
                        {
                            logging.error({"message": "put request as failed from download", "matchid": locals.request_id, "err": err, "result": results});
                        }

                        var finished_message = 
                            {
                                "message":"JobResponse",
                                "result": "failed",
                                "job": message["job"]
                            };
                        services.notifyScheduler(finished_message);

                        callback_request();
                    });

                return;
            }
            else
            {
                logging.log({"message":"successful download", "matchid":locals.request_id});
            }


            var finished_message = 
                {
                    "message":"JobResponse",
                    "result": "finished",
                    "job": message["job"]
                };
            services.notifyScheduler(finished_message);
            callback_request();
        }
    );
}

var minimum_filesize = 1024*1024; //require replays to be > 1MB

function downloadMatch(replay_data, target, callback)
{   
    var file = target+replay_data.match_id+".dem.bz2"
    var replay_address = "http://replay"+replay_data.cluster+".valve.net/570/"+replay_data.match_id+"_"+replay_data.replay_salt+".dem.bz2";

    logging.log("Downloading from"+ replay_address+ " into "+ file);

    downloadFile(replay_address, file, 
        function(err)
        {
            if(err)
            {
                callback(err, file);
                return;
            }
            //check file size
            var stats = fs.statSync(file)
            var fileSizeInBytes = stats["size"];
            if(fileSizeInBytes > minimum_filesize)
                callback(null, file);
            else
                callback("replay too small", file);
        });
}

var download_timeout = 3000;

function downloadFile(url, dest, callback) {
    //TODO clean this up
    // errors dont get propagated, an error in the decoder will appear after the the file got closed -> after final callback was written
    //probably  wait for both callbacks, then return?


    var file = fs.createWriteStream(dest);
    var sendReq = request.get({"url": url, "timeout": download_timeout});
    // verify response code
    sendReq.on('response', function(response) {
        if (response.statusCode !== 200) {
            return callback('Response status was ' + response.statusCode);
        }
    });

    // check for request errors
    sendReq.on('error', function (err) {
        fs.unlink(dest);
        if (callback) {
            return callback("http req error: "+err);
        }
    });

    // check for request errors
    sendReq.on('end', function (err) {
        //console.log("sendreq got end");
    });

    try
    {
        sendReq.pipe(file);
    }
    catch(e)
    {
        callback(e);
    }
    
    file.on('finish', function() {
        //console.log("finished writing, closing file", new Date());
        file.close(callback);  // close() is async, call callback after close completes.
    });


    file.on('error', function(err) { // Handle errors
        logging.error({"message":"file error on matchdownload", "err":err});
        fs.unlink(dest); // Delete the file async. (But we don't check the result)

        if (callback) {
            return callback(err.message);
        }
    });
};