var     replay_dl   = require("./replay-download.js");
var config      = require("./config.js"),
    database    = require("./database.js");

var async       = require("async");

var download_concurrency =  require("semaphore")(3);

//THIS IS MAIN
async.series(
    [
        registerListeners
    ]
);


function registerListeners(callback)
{
    var client = database.getClient();
    client.connect(
        function(err)
        {
            if(err) {
                return console.error('could not connect to postgres', err);
            }

            client.on('notification', processNotification);

            client.query(
                "LISTEN download_watchers;",
                [],
                function(err, results)
                {
                    console.log("added download listener");
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
    if(parts.length != 2)
    {
        console.log("bad notification", msg);
        return;
    }
    switch(parts[0])
    {
        case "Download":
            var request_id = parseInt(parts[1]);
            download_concurrency.take(
                function(){
                    downloadMatch(request_id, function(){console.log("finished retrieve reqid", request_id);download_concurrency.leave()});
                });
            break;
        default:
            console.log("Unknown notification", msg);
    }
}


function downloadMatch(request_id, callback_request)
{
    console.log("processing replay", request_id);
    var locals = {};
    locals.request_id = request_id;
    async.waterfall(
        [
            database.connect,
            function(client, done_client, callback)
            {
                console.log("got db client");
                locals.client = client;
                locals.done = done_client;

                locals.client.query(
                    "SELECT requester_id, data FROM MatchRetrievalRequests mrr WHERE mrr.id=$1;",
                    [locals.request_id],
                    callback);
            },
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
                console.log("downloaded match to", replay_file);
                var path = replay_file.substring(replay_file.indexOf('/',1));//cut off the /shared folder
                locals.client.query(
                    "INSERT INTO ReplayFiles (file, upload_filename, processing_status, uploader_id) VALUES ($1, $2, (SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$3), $4);",
                    [path, locals.match_id, "uploaded", locals.requester_id],
                    callback);
            },
            function(results, callback)
            {
                if(results.rowCount!=1)
                    callback("inserting replayfile failed", results);
                else
                {
                    console.log("inserted replayfile");
                    locals.client.query(
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
                locals.client.query(
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

                        locals.done();
                        callback_request(null, "");
                    });
            }
            else
            {

                console.log("downloaded", locals.request_id);
                locals.done();
                callback_request(null, "");
            }
        }
    );
}