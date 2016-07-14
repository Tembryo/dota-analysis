var database        = require("/shared-code/database.js"),
    communication   = require("/shared-code/communication.js"),
    logging         = require("/shared-code/logging.js")("jobs-lib"),
    services        = require("/shared-code/services.js");

function startJob(job_data, callback)
{
    database.query("INSERT INTO Jobs(started, data) VALUES (now(), $1) RETURNING id;", [job_data],
        function(err, results){
            if(err || results.rowCount != 1)
            {
                logging.error({"message": "error creating job", "err": err, "result": results});
                callback("database error");
            }
            else
            {
                var job_id = results.rows[0]["id"];
                var new_job_message = {
                    "message": "NewJob",
                    "job-id": job_id
                };               
                communication.publish(services.scheduler_listening_channel, new_job_message,
                    function(err, results)
                    {
                        if(err)
                        {
                            logging.error({"message": "error creating job", "err": err, "result": results});
                            callback("communication error");
                        }
                        else
                            callback(null, job_id);
                    });
            }
        });
}

exports.startJob = startJob;