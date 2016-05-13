var replay_dl   = require("./replay-download.js");
var config      = require("./config.js");

var database    = require("/shared-code/database.js"),
    services    = require("/shared-code/services.js"),
    storage     = require("/shared-code/storage.js");

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
                if (err) console.error("mkdirp error", err);
                else console.log('replay folder is fine!');
                callback();
            });
        },
        function(callback)
        {
            service = new services.Service("Download", handleDownloadServerMsg, callback);
        },
        function(callback)
        {
            console.log("Download service started");
        }
    ]
);


function handleDownloadServerMsg(server_identifier, message)
{
    switch(message["message"])
    {
        case "DownloadResponse":
            //Sent by myself
            break;

        case "Download":
            downloadMatch(message,
                function()
                {
                    console.log("finished download", message["id"]);
                }
            );
            break;

        case "UpdateHistory":
            checkAPIHistoryData(message);
            break;
        default:
            console.log("unknown message:", server_identifier, message);
            break;
    }
}


function downloadMatch(message, callback_request)
{
    console.log("processing replay", message["id"]);
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
                    callback("bad update result", results);
                else
                {
                    locals.requester_id = results.rows[0].requester_id;
                    locals.match_id = locals.request_id;
                    locals.store_path = config.shared+"/replays/";
                    var data = results.rows[0].data;
                    console.log("downloading with data", data);
                    replay_dl.downloadMatch(data, locals.store_path, callback);
                }
            },
            function(replay_file, callback)
            {
                console.log("finished dl to ", replay_file)
                storage.store("replays/"+locals.match_id+".dem.bz2",callback);
            },
            function(store_path, callback)
            {
                console.log("stored match at ", store_path);
                database.query(
                    "INSERT INTO ReplayFiles (file, upload_filename, processing_status, uploader_id) VALUES ($1, $2, (SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$3), $4);",
                    [store_path, locals.match_id, "uploaded", locals.requester_id],
                    callback);
            },
            function(results, callback)
            {
                if(results.rowCount!=1)
                    callback("inserting replayfile failed", results);
                else
                {
                    console.log("inserted replayfile");
                    database.query(
                        "UPDATE MatchRetrievalRequests mrr SET retrieval_status=(SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label=$2) WHERE mrr.id=$1 RETURNING mrr.id;",
                        [locals.request_id, "retrieved"],
                        callback);
                }
            },
            function(results, callback)
            {
                if(results.rowCount!=1)
                    callback("setting status failed", results);
                else
                    callback();
            }
        ],
        function(err, results)
        {
            if(err)
            {
                database.query(
                    "UPDATE MatchRetrievalRequests mrr SET retrieval_status=(SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label=$2) WHERE mrr.id=$1 RETURNING mrr.id;",
                    [locals.request_id, "failed"],
                    function(err2, results2)
                    {
                        if(err2 || results2.rowsCount != 1)
                        {
                            console.log("put request as failed - failed again", locals.request_id, err, results, err2, results2);
                        }
                        else
                        {
                            console.log("put request as failed from download", locals.request_id, err, results);
                        }

                        var finished_message = 
                            {
                                "message":"DownloadResponse",
                                "result": "failed",
                                "job": message["job"]
                            };
                        service.send(finished_message);

                        callback_request(null, "");
                    });
            }
            else
            {
                console.log("downloaded", locals.request_id);

                var finished_message = 
                    {
                        "message":"DownloadResponse",
                        "result": "finished",
                        "job": message["job"]
                    };
                service.send(finished_message);
                callback_request(null, "");
            }
        }
    );
}