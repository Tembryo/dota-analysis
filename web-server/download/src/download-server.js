var async       = require("async"),
    fs          = require('fs'),
    request     = require('request'),
    diskspace   = require('diskspace');

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

var try_to_keep_replay = false;
var minimum_disk_space_left =  2*1000*1000*1000; //keep 2GB
var error_message_exists = "existing_match";
var result_message_removed_local = "removed_local";

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
<<<<<<< HEAD
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

=======
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

>>>>>>> 2e1af2313645758671669fecce11f5d82b7eea54
                logging.log("starting download");
                downloadMatch(locals.data, locals.store_path, callback);
            },
            function(replay_file, callback)
            {
                locals.replayfile= replay_file;
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

                diskspace.check(locals.store_path, callback);
            },
            function(total, free, status, callback)
            {
                if(try_to_keep_replay)//(free > minimum_disk_space_left)
                {
                    locals.keep_replay = true;
                    callback();
                }
                else
                {
                    locals.keep_replay = false;
                    fs.unlink(locals.replayfile, callback);
                }
            },
            function(callback)
            {
                machine.getMachineID(callback);
            },
            function(machine_id, callback)
            {
                locals.machine_id = machine_id;
                if(locals.keep_replay)
                {
                    database.query(
                        "UPDATE ReplayFiles rf SET stored_at=$2 WHERE rf.id=$1;",
                        [locals.replay_id, locals.machine_id],
                        callback);
                }
                else
                    callback(null, result_message_removed_local);
            },
            function(results, callback)
            {
                if(results === result_message_removed_local)
                {
                    //nothing, continue
                }
                else if(results.rowCount!=1)
                {
                    callback("setting replay as stored failed", results);
                    return;
                }

                var job_data = {
                        "message":      "Analyse",
                        "id":  locals.replay_id
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

var minimum_filesize = 512*1024; //require replays to be > 0.5MB

function downloadMatch(replay_data, target, callback)
{   
<<<<<<< HEAD
    if(!replay_data || !("match_id" in replay_data) ||!("cluster" in replay_data) || !("replay_salt" in replay_data) )
    {
        callback("bad replay_data for download", replay_data);
        return;
    }
    
=======
>>>>>>> 2e1af2313645758671669fecce11f5d82b7eea54
    var file = target+replay_data.match_id+".dem.bz2"
    var replay_address = "http://replay"+replay_data.cluster+".valve.net/570/"+replay_data.match_id+"_"+replay_data.replay_salt+".dem.bz2";

    logging.log("Downloading from"+ replay_address+ " into "+ file);

    downloadFile(replay_address, file, 
        function(err, size)
        {
            if(err)
            {
                callback(err, file);
                return;
            }
            //check file size
            var stats = fs.statSync(file)
            var replayfile_size = stats["size"];
            if(replayfile_size < minimum_filesize)
                callback("replay too small", file);
            else if(size != replayfile_size)
                callback("got different file than expected", {"expected": size, "got": replayfile_size});
            else
                callback(null, file);
        });
}

var download_timeout = 30000;

function downloadFile(url, dest, callback) {
    //TODO clean this up
    // errors dont get propagated, an error in the decoder will appear after the the file got closed -> after final callback was written
    //probably  wait for both callbacks, then return?

    var callback_called = false;
    var result_length = 0;
    var download_callback = function(err, results)
    {
        logging.log({"message": "download cb", "err": err, "result": results, "callback_called": callback_called});
        if(!callback_called)
        {
            callback_called = true;
            if(err)
                callback(err, results);
            else
                callback(null, result_length);
        }
        else
        {
            logging.log({"message": "got multiple download callback calls, skipping", "err": err, "result": results});
        }
    }


    var file = fs.createWriteStream(dest);
    var sendReq = request.get({"url": url, "timeout": download_timeout});
    // verify response code
    sendReq.on('response', function(response) {
        if (response.statusCode !== 200) {
            download_callback('Bad response status ', response);
            return;
        }
        else if(! (response.headers["content-type"] === "application/octet-stream"))
        {
            download_callback('Bad content type', response);
            return;
        }
        else
        {
            //logging.log({"message": "download response", "response": response, "desired length": response.headers["content-length"]});
            result_length = parseInt(response.headers["content-length"]);
        }
    });

    // check for request errors
    sendReq.on('error', function (err) {
        logging.log({"message": "download req error", "err": err});
        fs.unlink(dest);
        download_callback("http req error: "+err);
        return;
    });

    // check for request errors
    sendReq.on('end', function (err) {
        //console.log("sendreq got end");
        //logging.log({"message": "download end", "err": err});
    });

    try
    {
        sendReq.pipe(file);
    }
    catch(e)
    {
        logging.log({"message": "download exception", "err": e});
        download_callback("exception during download",e);
    }
    
    file.on('finish', function() {
       //logging.log({"message": "download finish"});
        //console.log("finished writing, closing file", new Date());
        file.close(download_callback);  // close() is async, call callback after close completes.
    });


    file.on('error', function(err) { // Handle errors
        logging.error({"message":"file error on matchdownload", "err":err});
        fs.unlink(dest); // Delete the file async. (But we don't check the result)

        download_callback(err);
        return;

    });
};