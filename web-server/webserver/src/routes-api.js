var	express			= require("express"),
    async           = require('async'),
    fs              = require("fs"),
    formidable      = require('formidable'),
    fs_extra        = require('fs-extra'),
    shortid         = require('shortid');

var	authentication  = require("./routes-auth.js"),
    config			= require("./config.js");

var communication   = require("/shared-code/communication.js"),
    storage         = require("/shared-code/storage.js"),
    database        = require("/shared-code/database.js"),
    jobs            = require("/shared-code/jobs.js"),
    logging         = require("/shared-code/logging.js")("api-server");


// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();

// middleware to use for all requests
router.use(function(req, res, next) {
    // do logging
    //console.log('API is doing something.');
    next(); // make sure we go to the next routes and don't stop here
});

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
    res.json({ "message": 'wisdota api - base' });   
});




function parseRatingsAndSkills(scores, stats)
{
    var ratings = []

    return ratings;
}



router.route("/get-player-matches")
    .get(authentication.ensureAuthenticated,
        function(req, res)
        {
            var window_string = "LIMIT 20 OFFSET 0";
            if(req.query.hasOwnProperty("start") && req.query.hasOwnProperty("end"))
            {
                // Selection windows, counting from most recent once
                // <<< -------- 10 ------- 5 ----- 1 NOW
                var start = parseInt(req.query.start);
                var end = parseInt(req.query.end);
                if(start < end && start >= 0)
                {
                    var offset = start;
                    var n_matches = end - start;

                    window_string = "LIMIT "+n_matches+" OFFSET "+offset;
                }
            }

            if(req.query.hasOwnProperty("mode") && req.query.mode === "all")
                window_string = "";

            async.waterfall(
                [
                    database.generateQueryFunction(
                        "SELECT umh.match_id, umh.data as history_data, EXISTS(SELECT id FROM MatchRetrievalRequests where id = umh.match_id) as requested, "+
                            "COALESCE( (SELECT MAX(ps.label) FROM ProcessingStatuses ps, Replayfiles rf where rf.match_id = umh.match_id AND ps.id=rf.processing_status),"+
                                        "'unknown') AS processing_status, "+
                            "COALESCE( (SELECT mrs.label FROM MatchRetrievalStatuses mrs, MatchRetrievalRequests mrr where mrr.id = umh.match_id AND mrs.id=mrr.retrieval_status),"+
                                        "'unknown') AS retrieval_status, "+
                            "COALESCE( (SELECT ps.data FROM PlayerStats ps WHERE umh.match_id = ps.match_id AND ps.steam_identifier = u.steam_identifier),"+
                                "'null'::json) AS player_stats, "+
                            "COALESCE( (SELECT ms.data FROM MatchStats ms WHERE umh.match_id = ms.id ),"+
                                "'null'::json) AS match_stats, "+
                            "COALESCE( (SELECT r.data FROM Results r WHERE umh.match_id = r.match_id AND r.steam_identifier = u.steam_identifier),"+
                                "'null'::json) AS score_data, "+
                            "COALESCE( (SELECT md.data FROM MatchDetails md WHERE umh.match_id = md.matchid),"+
                                "'null'::json) AS match_details "+
                        "FROM Users u, UserMatchHistory umh "+
                        "WHERE u.id = $1 "+
                            "AND u.id = umh.user_id "+
                        "ORDER BY umh.match_id DESC "+
                        window_string+";",
                            [req.user["id"]]),
                    function(results, callback)
                    {
                        var response = [];
                        for(var i = 0; i < results.rowCount; i++)
                        {
                            var next_result = 
                            {
                                "match-id":results.rows[i]["match_id"],
                                "hero": results.rows[i]["history_data"]["hero_id"],
                                "date": results.rows[i]["history_data"]["start_time"],
                                "result": results.rows[i]["history_data"]["winner"],
                                "IMR": null,
                                "players": [],
                                "ratings": [],
                                "status": null
                            };

                            if(results.rows[i]["player_stats"] && results.rows[i]["score_data"])
                                next_result["status"] = "parsed";
                            else if (results.rows[i]["requested"])
                            {
                                if(results.rows[i]["retrieval_status"] === "failed" || results.rows[i]["processing_status"] === "failed")
                                    next_result["status"] = "failed";
                                else
                                    next_result["status"] = "queued";
                            }
                            else if(results.rows[i]["history_data"]["start_time"] < Date.now()/1000 - 7*24*60*60)
                            {
                                next_result["status"] = "too-old";
                            }
                            else
                                next_result["status"] = "open";

                            if(results.rows[i]["match_details"])
                            {
                                for(var j = 0; j < results.rows[i]["match_details"]["players"].length; ++j)
                                {
                                    var player = 
                                    {
                                        "hero": results.rows[i]["match_details"]["players"][j]["hero_id"],
                                        "name": results.rows[i]["match_details"]["players"][j]["player_name"]
                                    }
                                    var slot = results.rows[i]["match_details"]["players"][j]["player_slot"];
                                    if (slot >=128)
                                        slot = slot - 128 + 5;
                                    next_result["players"][slot] = player;
                                }
                            }

                            if(results.rows[i]["player_stats"] && results.rows[i]["score_data"])
                            {
                                next_result["IMR"] = results.rows[i]["score_data"]["IMR"]["score"]

                                if("mechanics" in results.rows[i]["score_data"])
                                {
                                    var mechanics_rating = {
                                        "attribute":"Mechanics",
                                        "rating":results.rows[i]["score_data"]["mechanics"]["score"],
                                        "skills":results.rows[i]["score_data"]["mechanics"]["skills"]
                                    }
                                    next_result["ratings"].push(mechanics_rating)
                                }

                                if("farming" in results.rows[i]["score_data"])
                                {
                                    var farming_rating = {
                                        "attribute":"Farming",
                                        "rating":results.rows[i]["score_data"]["farming"]["score"],
                                        "skills":results.rows[i]["score_data"]["farming"]["skills"]
                                    }
                                    next_result["ratings"].push(farming_rating)
                                }

                                if("fighting" in results.rows[i]["score_data"])
                                {
                                    var fighting_rating = {
                                        "attribute":"Fighting",
                                        "rating":results.rows[i]["score_data"]["fighting"]["score"],
                                        "skills":results.rows[i]["score_data"]["fighting"]["skills"]
                                    }
                                    next_result["ratings"].push(fighting_rating)
                                }

                                if("movement" in results.rows[i]["score_data"])
                                {
                                    var movement_rating = {
                                        "attribute":"Movement",
                                        "rating":results.rows[i]["score_data"]["movement"]["score"],
                                        "skills":results.rows[i]["score_data"]["movement"]["skills"]
                                    }
                                    next_result["ratings"].push(movement_rating)
                                }

                                if("misc" in results.rows[i]["score_data"])
                                {
                                    var misc_rating = {
                                        "attribute":"Miscellaneous",
                                        "rating":results.rows[i]["score_data"]["misc"]["score"],
                                        "skills":results.rows[i]["score_data"]["misc"]["skills"]
                                    }
                                    next_result["ratings"].push(misc_rating)
                                }
                            }

                            response.push(next_result);
                        }
                        callback(null, response);
                    }
                ],
                function(err, response)
                {
                    if(err)
                    {
                        logging.error({"message": "error getting player matches", "err":err, "response": response});
                    }
                    res.json(response);
                }
            );
        }
    );


router.route("/queue-matches")
    .get(authentication.ensureAuthenticated,
        function(req, res)
        {
            var locals = {}
            async.waterfall(
                [
                    database.generateQueryFunction("INSERT INTO MatchRetrievalRequests(id, retrieval_status, requester_id) "+
                        "(SELECT umh.match_id, (SELECT mrs.id FROM MatchRetrievalStatuses mrs where mrs.label=$2), $1 "+
                        "FROM UserMatchHistory umh WHERE umh.user_id = $1 AND to_timestamp((umh.data->>'start_time')::int) > current_timestamp - interval '7 days' AND NOT EXISTS (SELECT mrs.id FROM MatchRetrievalRequests mrs where mrs.id = umh.match_id) ) "+
                        "RETURNING id;",
                            [req.user["id"], "requested"]),
                    function(results, callback)
                    {
                        locals.n_queued = results.rowCount;

                        async.each(results.rows,
                            function(row, callback)
                            {
                                var job_data =  
                                    {
                                        "message": "Retrieve",
                                        "id": row["id"]
                                    };
                                jobs.startJob(job_data, callback);
                            }, callback);
                    }
                ],
                function(err, results)
                {
                    if(err)
                    {
                        logging.error({"message": "queue matches failed", "err": err, "result": results});
                        var error_result = {
                            "result": "error",
                            "message": err,
                            "info": results
                            };
                        res.json(error_result);
                    }
                    else
                    {
                        var success_result = {
                            "result": "success",
                            "n-requested": locals.n_queued
                            };
                        res.json(success_result);
                    }
                }
            );
        }
    );




router.route("/update-history")
    .get(authentication.ensureAuthenticated,
        function(req, res)
        {
            var job_data = {
                    "message":      "UpdateHistory",
                    "range-start":  req.user["id"],
                    "range-end":    req.user["id"],
                };

            jobs.startJob(job_data,
                function(err, job_id)
                {
                    if(err)
                    {
                        logging.error({"message": "error updating history", "err": err})
                        
                        var error_result = {
                            "result": "error",
                            "message": err
                            };

                        res.json(error_result); 
                    }
                    else
                    {
                        var success_result = {
                                "result": "success",
                                "job-id": job_id
                            };

                        res.json(success_result);
                    }
                });
        }
    );

router.route("/check-job-finished/:job_id")
    .get(authentication.ensureAuthenticated,
        function(req, res)
        {
            var job_id;
            if(req.params.hasOwnProperty("job_id"))
            {
                job_id= parseInt(req.params.job_id);
            }
            else
            {
                res.json({});
                return;
            }

            async.waterfall(
                [
                    database.generateQueryFunction("SELECT (finished IS NOT NULL) as is_finished FROM Jobs where id=$1;",
                            [job_id]),
                    function(results, callback)
                    {
                        if(results.rowCount != 1)
                            callback("job not found");
                        else
                            callback(null, results.rows[0]["is_finished"]);
                    }
                ],
                function(err, is_finished)
                {
                    if(err)
                    {
                        logging.error({"message": "error checking job", "err":err, "result": results});
                        var error_result = {
                            "result": "error",
                            "message": err
                            };
                        res.json(error_result);
                    }
                    else
                    {
                        var success_result = {
                            "result": "success",
                            "is-finished": is_finished
                            };
                        res.json(success_result);
                    }
                }
            );
        }
    );



//Match Data Serving
// =============================================================================


router.route('/match-details/:matchid')
    // get all the matches
    .get(function(req, res)
        {
            var locals = {};
            async.waterfall(
                [
                    function(callback)
                    {
                        if(! req.params.hasOwnProperty("matchid") || !Number.isInteger(parseInt(req.params.matchid)))
                        {
                            callback("no matchid", req.params);
                            return;
                        }
                        
                        var match_id= parseInt(req.params.matchid);
                        database.query("SELECT data FROM MatchDetails WHERE matchid=$1;",[match_id],callback);
                    },
                    function(results, callback)
                    {
                        if( results.rowCount != 1)
                        {
                            callback("couldnt find match details");
                            return;
                        }

                        callback(null, results.rows[0]["data"]);
                    }
                ],
                function(err, results)
                {
                    if(err)
                    {
                        logging.error({"message": "error getting match header", "err": err, "result": results});

                        var response = {
                            "result": "error",
                            "err": err
                        };

                        res.json(response);
                    }
                    else
                    {
                        var response = {
                            "result": "success",
                            "details": results
                        };

                        res.json(response);
                    }
                }
            );
        }
    );

router.route('/results')
    .get(function(req, res) 
        {
            var match_id = 0;
            if(req.query.hasOwnProperty("matchid") && Number.isInteger(parseInt(req.query.matchid)))
            {
                match_id= parseInt(req.query.matchid);
            }
            else
            {
                logging.log("no matchid"+req.query);
                res.json([]);
                return;
            }
            logging.log("results for match",match_id);
            async.waterfall(
                [
                    database.generateQueryFunction(
                            "SELECT r.data as score_data, ps.data as player_data "+
                            "FROM Results r, PlayerStats ps WHERE r.match_id=$1 AND ps.match_id=r.match_id AND ps.steam_identifier = r.steam_identifier;",
                            [match_id]),
                    function(results, callback)
                    {
                           callback(null, results.rows);
                    }
                ],
                function(err, result)
                {
                    //console.log(result);
                    if(err)
                    {
                        logging.error({"error": "error retrieving scores for "+match_id, "err": err});
                        res.json({});
                    }
                    else
                        res.json(result);
                }
            );
        }
    );

router.route('/result/:result_id')
    .get(function(req, res) 
        {
            var result_id = 0;
            if(req.params.hasOwnProperty("result_id"))
            {
                result_id= parseInt(req.params.result_id);
            }
            else
            {
                res.json({});
                return;
            }
            async.waterfall(
                [
                    database.generateQueryFunction(
                        "SELECT r.data as score_data, ps.data as player_data FROM Results r, PlayerStats ps "+
                            "WHERE r.id=$1 AND ps.match_id=r.match_id AND ps.steam_identifier = r.steam_identifier;",[result_id]),
                    function(results, callback)
                    {
                        //console.log("fetched file", results);
                        if(results.rowCount != 1)
                            callback("no result found", results);
                        else
                           callback(null, results.rows[0]);
                    }
                ],
                function(err, result)
                {
                    //console.log(result);
                    if(err)
                    {
                        logging.error({"message": "error retrieving result "+req.params.match_id, "err": err});
                        
                        res.json({});
                    }
                    else
                        res.json(result);
                }
            );
        }
    );

router.route('/match/:match_id')
    .get(function(req, res) 
        {
            async.waterfall(
                [
                    database.generateQueryFunction("SELECT file FROM Matches WHERE id=$1;",[req.params.match_id]),
                    function(results, callback)
                    {
                        //console.log("fetched file", results);
                        if(results.rowCount != 1)
                            callback("bad result selecting file ", results);
                        else
                           storage.retrieve(results.rows[0].file, callback);
                    },
                    function(filename, callback)
                    {
                       fs.readFile(filename, 'utf-8',callback);
                    },
                    function(json, callback)
                    {
                        var parsed = {}
                        try
                        {
                            parsed = JSON.parse(json);
                        }
                        catch(e)
                        {
                            logging.error({"message": "bad match json ", "exception": e, "json": json});
                        }
                        callback(null, parsed);
                    }
                ],
                function(err, results)
                {
                    if(err)
                    {
                        logging.error({"message": "error retrieving match "+req.params.match_id, "err": err, "result": results});
                       
                        res.send(err);
                    }
                    else
                        res.json(results);
                }
            );
        }
    );

router.route("/upload")
    .post(authentication.ensureAuthenticated,
        function(req, res)
        {
            var form = new formidable.IncomingForm();
            var identifier = shortid.generate();

            form.parse(req, function(err, fields, files)
            {
                logging.log("finished upload of "+identifier);
                var response = {
                    "id": identifier                    
                    };
                res.json(response);

            });

            form.on('progress', function(bytesReceived, bytesExpected)
            {
                var percent_complete = (bytesReceived / bytesExpected) * 100;
                //console.log(identifier + " complete " + percent_complete.toFixed(2));
            });

            form.on('error', function(err)
            {
                logging.error({"message": "error in file upload", "err": err});
            });

            form.on('end', function(fields, files)
            {
                /* Temporary location of our uploaded file */
                var temp_path = this.openedFiles[0].path;
                /* The file name of the uploaded file */
                var file_name = this.openedFiles[0].name;
                /* Location where we want to copy the uploaded file */
                var new_file = "/replays/"+ identifier + ".dem";
                
                async.waterfall(
                    [
                        fs_extra.copy.bind(fs_extra, temp_path, config.shared+new_file),
                        database.generateQueryFunction(
                            "INSERT INTO ReplayFiles(file, upload_filename, processing_status, uploader_id) "+
                            "VALUES($1, $2, (SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$3), $4);",[new_file, file_name, "uploaded", req.user.id])
                    ],
                    function(err, results)
                    {
                        if(err)
                        {
                            logging.error({"message": "err in upload end", "err": err, "result": results});
                        }
                    }
                );
            });
        })

router.route("/uploads")
    .get(authentication.ensureAuthenticated,
        function(req, res)
        {
            async.waterfall(
                [
                    database.generateQueryFunction(
                        "SELECT rf.id, rf.match_id,ps.label as status,rf.upload_filename FROM ReplayFiles rf, ProcessingStatuses ps WHERE rf.processing_status = ps.id AND rf.uploader_id=$1;",
                            [req.user["id"]]),
                    function(results, callback)
                    {
                        //just give out the rows?
                        callback(null, results.rows);
                    }
                ],
                function(err, results)
                {
                    if(err)
                    {
                        logging.error({"message": "uploads err", "err": err});
                    }
                    res.json(results);
                }
            );
        }
    );


router.route("/retrieve/:match_id")
    .get(authentication.ensureAuthenticated,
        function(req, res)
        {
            var match_id = req.params.match_id;

            async.waterfall(
                [
                    database.generateQueryFunction("SELECT rf.id FROM ReplayFiles rf WHERE rf.id=$1;",
                            [match_id]),
                    function(results, callback)
                    {
                        if(results.rowCount > 0)
                            callback("already exists");
                        else
                        {
                            database.query("INSERT INTO MatchRetrievalRequests(id, retrieval_status, requester_id) VALUES ($1, (SELECT mrs.id FROM MatchRetrievalStatuses mrs where mrs.label=$2), $3);",
                            [match_id, "requested", req.user["id"]],callback);
                        }
                    },
                    function(results, callback)
                    {
                        if(results.rowCount != 1)
                            callack("inserting request failed", results);
                        else
                        {
                            var job_data =  
                                {
                                    "message": "Retrieve",
                                    "id": match_id
                                };
                            
                            jobs.createJob(job_data, callback);
                        }
                    }
                ],
                function(err, results)
                {
                    if(err)
                    {
                        logging.error({"message": "retrieve match err", "err": err});
                        var error_result = {
                            "result": "error",
                            "message": err,
                            "info": results
                            };
                        res.json(error_result);
                    }
                    else
                    {
                        var success_result = {
                            "result": "success",
                            "job-id": results
                            };
                        res.json(success_result);
                    }
                }
            );
        }
    );

router.route("/score/:match_id")
    .get(authentication.ensureAuthenticated,
        function(req, res)
        {
            async.waterfall(
                [
                    database.generateQueryFunction("SELECT r.id FROM Results r, Users u WHERE r.match_id=$1 AND r.steam_identifier= u.steam_identifier AND u.id=$2;",
                            [req.params.match_id, req.user["id"]]),
                    function(results, callback)
                    {
                        if(results.rowCount > 0)
                            callback("already exists");
                        else
                        {
                            database.query("INSERT INTO ScoreRequests(match_id) VALUES ($1) RETURNING id;",
                            [req.params.match_id],callback);
                        }
                    },
                    function(results, callback)
                    {
                        if(results.rowCount != 1)
                            callack("inserting request failed", results);
                        else
                            callback(null, results.rows[0]["id"]);
                    }
                ],
                function(err, results)
                {
                    if(err)
                    {
                        logging.error({"message": "score match err", "err": err});
                        var error_result = {
                            "result": "error",
                            "message": err,
                            "info": results
                            };
                        res.json(error_result);
                    }
                    else
                    {
                        var success_result = {
                            "result": "success",
                            "id": results
                            };
                        res.json(success_result);
                    }
                }
            );
        }
    );

router.route('/admin-stats/:query')
    .get(authentication.ensureAuthenticated,
        authentication.ensureAdmin,
        function(req, res) 
        {
            var query_string = "";
            switch(req.params.query)
            {
            case "users":
                query_string = "SELECT COUNT(*) FROM Users;";
                break;
            case "retrieval-statuses":
                query_string = "SELECT COUNT(*) as n, mrr.retrieval_status as status_id, mrs.label as status FROM MatchRetrievalRequests mrr, MatchRetrievalStatuses mrs  WHERE mrr.retrieval_status =  mrs.id GROUP BY mrs.label, mrr.retrieval_status ORDER BY mrr.retrieval_status;";
                break;
            case "processing-statuses":
                query_string = "SELECT COUNT(*) as n, ps.label as status, rf.processing_status as status_id FROM Replayfiles rf, ProcessingStatuses ps  WHERE rf.processing_status =  ps.id GROUP BY ps.label, rf.processing_status ORDER BY rf.processing_status;";
                break;
            case "mmrs":
                query_string = "SELECT COUNT(*) as n, AVG(solo_mmr) as avg_solo, AVG(group_mmr) as avg_group FROM mmrdata;";
                break;
            case "mmr-distribution":
                query_string = "SELECT COUNT(*) as n_samples,floor(AVG(d.solo_mmr)/250)*250 as mmr_bin FROM mmrdata d WHERE d.solo_mmr IS NOT NULL GROUP BY floor(d.solo_mmr/250)*250 ORDER BY AVG(d.solo_mmr);";
                break;
            case "jobs":
                query_string = "select count(*) as n_open, data->>'message' as job_name from jobs where finished is null group by data->>'message';";
                break;
            case "logins":
                query_string = "select count(*) as n, floor(date_part('day', now()- last_action)/7) as weeks_since_login from "+
                                    "(select max(time) last_action, count(*) as actions, data->>'user' as id "+
                                    "from events where (data->>'user')::int > 0 group by data->>'user') as useractivity"+
                                " group by floor(date_part('day', now()- last_action)/7) ORDER BY floor(date_part('day', now()- last_action)/7);";
                break;
            default:
                res.json({});
                return;
            }

            async.waterfall(
                [
                    database.generateQueryFunction(query_string,[]),
                    function(results, callback)
                    {
                       callback(null, results);
                    }
                ],
                function(err, result)
                {
                    //console.log(result);
                    if(err)
                    {
                        logging.error({"message": "error retrieving admin data "+query_string, "err": err, "result": result});
                        
                        res.json({});
                    }
                    else
                        res.json(result);
                }
            );
        }
    );

router.route('/admin-switch-user/:new_id')
    .get(authentication.ensureAuthenticated,
        authentication.ensureAdmin,
        function(req, res) 
        {
            var new_id = parseInt(req.params.new_id);
            var new_user = req.user;
            new_user["id"] = new_id;
            req.login(new_user, function(err){
                if (err)
                    logging.error({"message": "relog err", "err": err});
                logging.log("After relogin: "+req.user);
                res.json({"new-id": new_id});
            })
            req.user.id = new_id;
            logging.log("switched id" + new_id);
        }
    );

router.route('/admin-list-users/')
    .get(authentication.ensureAuthenticated,
        authentication.ensureAdmin,
        function(req, res) 
        {
            var selection_string  = "";
            if(req.query.hasOwnProperty("mode") && req.query.mode === "all")
                selection_string = "";

            async.waterfall(
                [
                    database.generateQueryFunction("SELECT id, name FROM Users "+selection_string+";",[])
                ],
                function(err, result)
                {
                    //console.log(result);
                    if(err)
                    {
                        logging.error({"message": "error retrieving admin user list data "+query_string, "err": err, "result": result});
                        
                        res.json({"users":[]});
                    }
                    else
                        res.json({"users":result.rows});
                }
            );
        }
    );


router.route('/admin-get-logs/')
    .get(authentication.ensureAuthenticated,
        authentication.ensureAdmin,
        function(req, res) 
        {
            var selection_string  = "";
            if(req.query.hasOwnProperty("timewindow"))
                selection_string = "WHERE time > now() - interval '"+parseInt(req.query.timewindow)+" minutes'";
            if(req.query.hasOwnProperty("id_start") && req.query.hasOwnProperty("id_end"))
                selection_string = "WHERE id >= "+parseInt(req.query.id_start)+" AND id <= "+parseInt(req.query.id_end);

            async.waterfall(
                [
                    database.generateQueryFunction("SELECT id, extract(epoch from time) as time , filters, entry FROM LogEntries "+selection_string+" ORDER BY time desc;",[])
                ],
                function(err, result)
                {
                    //console.log(result);
                    if(err)
                    {
                        logging.error({"message": "error retrieving logs", "err": err, "result": result});
                        
                        res.json({"logs":[]});
                    }
                    else
                        res.json({"logs":result.rows});
                }
            );
        }
    );

router.route('/admin-find-user/:name')
    .get(authentication.ensureAuthenticated,
        authentication.ensureAdmin,
        function(req, res) 
        {
            async.waterfall(
                [
                    database.generateQueryFunction("SELECT id, name FROM Users WHERE name=$1;",[req.params.name])
                ],
                function(err, result)
                {
                    //console.log(result);
                    if(err)
                    {
                        logging.error({"message": "error find user "+req.params.name, "err": err, "result": result});
                        
                        res.json({"users":[]});
                    }
                    else
                        res.json({"users":result.rows});
                }
            );
        }
    );

router.route('/admin-scheduler-state/')
    .get(authentication.ensureAuthenticated,
        authentication.ensureAdmin,
        function(req, res) 
        {
            var locals = {};
            async.waterfall(
                [
                    database.generateQueryFunction("SELECT identifier, type, extract(epoch from last_heartbeat) as last_heartbeat, status, "+
                        "COALESCE( (SELECT row_to_json(tmp) FROM (SELECT id, started, assigned, data, result FROM Jobs) tmp "+
                        "WHERE id=current_job), '{}'::json) AS job  FROM Services;",[]),
                    function(results, callback)
                    {
                        locals.services = results.rows;
                        database.query("SELECT * FROM Jobs WHERE finished IS NULL;", [], callback);
                    },
                    function(results, callback)
                    {
                        locals.jobs = results.rows;  
                        callback();
                    }
                ],
                function(err, result)
                {
                    //console.log(result);
                    if(err)
                    {
                        logging.error({"message": "error getting scheduler data ", "err": err, "result": result});
                        
                        res.json({"result": "failed"});
                    }
                    else
                        res.json({"result": "success", "services": locals.services, "jobs": locals.jobs});
                }
            );
        }
    );


router.route("/score_result/:request_id")
    .get(authentication.ensureAuthenticated,
        function(req, res)
        {
            async.waterfall(
                [
                    database.generateQueryFunction(
                        "SELECT r.id FROM Results r, ScoreRequests sr, Users u WHERE sr.match_id=r.match_id AND u.steam_identifier= r.steam_identifier AND sr.id=$1 AND u.id=$2;",
                            [req.params.request_id, req.user["id"]]),
                    function(results, callback)
                    {
                        if(results.rowCount != 1)
                        {
                            callback("couldnt find", results);
                        }    
                        else
                        {
                            callback(null, results.rows[0]["id"]);
                        }
                    }
                ],
                function(err, results)
                {
                    if(err)
                    {
                        logging.error({"message": "err getting score result", "err": err, "result": results});
                        var error_result = {
                            "result": "error",
                            "message": err,
                            "info": results
                            };
                        res.json(error_result);
                    }
                    else
                    {
                        var success_result = {
                            "result": "success",
                            "id": results
                            };
                        res.json(success_result);
                    }
                }
            );
        }
    );


router.route("/stats")
    .get(authentication.ensureAuthenticated,
        function(req, res)
        {
            var offset = 0;
            var n_matches = 10;
            if(req.query.hasOwnProperty("start") && req.query.hasOwnProperty("end"))
            {
                var start = parseInt(req.query.start);
                var end = parseInt(req.query.end);
                if(start < end && start >= 0)
                {
                    offset = start;
                    n_matches = end - start;
                }
            }

            async.waterfall(
                [
                    database.generateQueryFunction(
                        "SELECT ps.match_id, ps.data, ms.data AS match_data, "+
                            "COALESCE("+
                                "(SELECT r.data FROM Results r WHERE r.match_id = ps.match_id AND r.steam_identifier = u.steam_identifier),"+
                                "'null'::json) AS score_data, "+
                            "(SELECT r.id FROM Results r WHERE r.match_id = ps.match_id AND r.steam_identifier = u.steam_identifier) AS result_id "+
                        "FROM PlayerStats ps, Users u, MatchStats ms, UserMatchHistory umh "+
                        "WHERE ps.steam_identifier = u.steam_identifier "+
                            "AND u.id = $1 "+
                            "AND ms.id=ps.match_id "+
                            "AND u.id = umh.user_id AND umh.match_id = ps.match_id "+
                        "ORDER BY umh.match_id DESC "+
                        "LIMIT $2 OFFSET $3;",
                            [req.user["id"], n_matches, offset]),
                    function(results, callback)
                    {
                        //just give out the rows?
                        callback(null, results.rows);
                    }
                ],
                function(err, results)
                {
                    if(err)
                    {
                        logging.error({"message": "", "err": err});
                    }
                    res.json(results);
                }
            );
            /*var exampledata =[{date:10,MMR:3000,LH:3100},{date:40,MMR:3100,LH:3150},{date:50,MMR:3325,LH:2900},{date:100,MMR:2955,LH:2925},{date:120,MMR:3155,LH:2850},{date:130,MMR:3199,LH:2775},{date:160,MMR:2825,LH:2750},{date:200,MMR:3505,LH:2700}];

            res.json(exampledata);*/
        }
    );

router.route("/download/:match_id")
    .get(authentication.ensureAuthenticated,
        function(req, res)
        {
            var match_id = req.params.match_id;
            async.waterfall(
                [
                    database.generateQueryFunction(
                        "SELECT file FROM ReplayFiles rf WHERE rf.match_id=$1;",
                        [match_id]),
                    function(results, callback)
                    {
                        if(results.rowCount != 1)
                        {
                            callback("couldnt find", results);
                        }    
                        else
                        {
                            callback(null, results.rows[0]["file"]);
                        }
                    },
                    function(result, callback)
                    {
                        res.download(
                            config.shared+result,
                            match_id+".dem",
                            callback);
                    }
                ],
                function(err)
                {
                    if(err)
                    {
                        logging.error({"message": "download err ", "err": err});
                        var error_result = {
                            "result": "error",
                            "message": err
                            };
                    }
                    else
                    {
                        logging.log("download success"+match_id);
                    }
                }
            );
        }
    );


router.route("/verify/:verification_code")
    .get(
        function(req, res)
        {
            var locals = {};
            async.waterfall(
                [
                    database.generateQueryFunction(
                        "DELETE FROM VerificationActions va WHERE va.code=$1 RETURNING (SELECT vat.label from VerificationActionTypes vat WHERE vat.id=va.actiontype_id) as action, va.args;",
                        [req.params.verification_code]),
                    function(results, callback)
                    {
                        var result = {};
                        if(results.rowCount == 0)
                        {
                            result["action"] = "verification";
                            result["result"] = "failed";
                            result["info"] = "invalid code";
                            callback("couldnt find verification code", result);
                        }
                        else if(results.rowCount == 1)
                        {
                            logging.log("execute verified action");
                            locals.action = results.rows[0].action;
                            logging.log(locals.action);
                            switch(locals.action)
                            {
                            case "SetEmail":
                                var new_email = results.rows[0].args["new-address"];
                                database.query(
                                    "UPDATE Users u SET email=$2 WHERE u.id=$1;",
                                    [req.user["id"], new_email],
                                    function(err, results)
                                    {
                                        if(err)
                                            callback(err, results);
                                        else
                                            database.query(
                                                "INSERT INTO UserStatuses (user_id, statustype_id, expiry_date) SELECT $1, ust.id, 'infinity' FROM UserStatusTypes ust WHERE ust.label=$2;",
                                                [req.user["id"], "verified"],callback);
                                    });
                                break;

                            case "ConfirmNewsletter":
                                var email_id = results.rows[0].args["id"];
                                logging.log("confirming newsletter for email"+ email_id);
                                database.query(
                                    "UPDATE Emails e SET verified=TRUE WHERE e.id=$1;",
                                    [email_id],
                                    callback);
                                break;

                            case "ActivatePlus":
                                locals.extension = results.rows[0].args["duration"];
                                database.query(
                                    "SELECT us.user_id FROM UserStatuses us, UserStatusTypes ust WHERE us.user_id=$1 AND us.statustype_id=ust.id AND ust.label=$2;",
                                    [req.user["id"], "plus"],
                                    function(err, results)
                                    {
                                        if(err) callback(err, results);
                                        else if(results.rowCount==0)
                                        {
                                            database.query("INSERT INTO UserStatuses (user_id, statustype_id, expiry_date) (SELECT $1, ust.id, (current_timestamp + interval '"+locals.extension+"') FROM UserStatusTypes ust WHERE ust.label=$2);",
                                            [req.user["id"], "plus"],callback);
                                        }
                                        else
                                        {
                                            database.query("UPDATE UserStatuses SET expiry_date = (GREATEST(expiry_date, current_timestamp) + (interval '"+locals.extension+"')) WHERE user_id=$1 AND statustype_id = (SELECT ust.id FROM UserStatusTypes ust WHERE ust.label=$2);",
                                            [req.user["id"], "plus"],callback);
                                        }
                                    });
                                break;
                            default: 
                                result["action"] = "action_execution";
                                result["result"] = "failed";
                                result["info"] = locals.action;
                                callback("tried to execute unknown action", result);
                            }
                        }
                        else
                        {
                            result["action"] = "action_lookup";
                            result["result"] = "failed";
                            result["info"] = errresults;
                            callback("looking up verificationaction failed", result);
                        }
                    },
                    function(results, callback)
                    {
                        var result = {};
                        result["action"] = locals.action;
                        result["result"] = "success";
                        callback(null, result);
                    }
                ],
                function(err, result)
                {
                    if(err)
                    {
                        var err_result = {};
                        err_result["info"] = err;
                        err_result["result"] = "failure";
                        err_result["data"] = result;
                        logging.error({"message":"", "err": err, "result": result});
                        res.json(err_result);
                    }
                    else
                        res.json(result);
                }
            );
        }
    );



var nodemailer = require('nodemailer');
var sprintf = require("sprintf-js").sprintf;

// create reusable transporter object using SMTP transport
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: config.gmail_user,
        pass: config.gmail_password
    }
});

var mail_schema = {
    from: 'Wisdota <quirin.fischer@wisdota.com>', // sender address
    to: [], // list of receivers
    subject: 'Wisdota newsletter email verification', // Subject line
    text: "Hey%(name)s, welcome to the Wisdota newsletter!\n\n Please confirm that you wanted to sign up by clicking this confirmation link: www.wisdota.com/confirm-newsletter/%(code)s \n We will then send you updates as we release new features on the website.\n Also, whenever you have any feedback, criticism, or features you really want to see, please do let us know!\n\n best wishes\n The Wisdota Team ", // plaintext body
    
    html: "<h4>Hey%(name)s, welcome to the Wisdota newsletter!</h4> <p>Please confirm that you wanted to sign up by clicking this confirmation link: <a href=\"http://www.wisdota.com/confirm-newsletter/%(code)s\">www.wisdota.com/confirm-newsletter/%(code)s</a> <br/> We will then send you updates as we release new features on the website.</p><p>Also, whenever you have any feedback, criticism, or features you really want to see - please get in touch!</p><p> best wishes<br/> The Wisdota Team </p>" // html body
};


router.route("/add-email/:email_address")
    .get(
        function(req, res)
        {
            var code = shortid.generate();

            var result = {"action": "action_creation_set_email", "info": "", "result": "failed"};
            var username = "";
            if(req.user)
                username = " "+req.user["name"];
            var mail_data = {
                                "code": code,
                                "name": username
                            };
            var mail = {};
            mail["from"] = mail_schema["from"];
            mail["to"] = [req.params.email_address];
            mail["subject"] = mail_schema["subject"];
            mail["text"] = sprintf(mail_schema["text"], mail_data);
            mail["html"] = sprintf(mail_schema["html"], mail_data);

            var locals = {};
            async.waterfall(
               [
                    transporter.sendMail.bind(transporter, mail),
                    function(info, callback)
                    {
                        logging.log('Confirmation mail sent: ' + info.response);
                        if(req.user)
                            database.query("INSERT INTO Emails(user_id, email, verified) VALUES ($1, $2, FALSE) RETURNING id;", [req.user["id"], req.params.email_address], callback);
                        else
                            database.query("INSERT INTO Emails(email, verified) VALUES ($1, FALSE) RETURNING id;", [req.params.email_address], callback);
                    },
                    function(results, callback)
                    {
                        if(results.rowCount == 1)
                        {
                            database.query(
                            "INSERT INTO VerificationActions(actiontype_id, args, code) SELECT vat.id, $3, $1 FROM VerificationActionTypes vat WHERE vat.label=$2;",
                            [code, "ConfirmNewsletter", {"id": results.rows[0]["id"]}], callback);
                        }
                        else
                        {
                            callback("bad email insert",results);
                        }
                    }
                ],
                function(err, results)
                {
                    if(err)
                    {
                        result["result"] = "failed";
                        result["info"] = err;
                    }
                    else
                    {
                        result["result"] = "success";
                        result["info"] = {};//code;
                    }
                    res.json(result);
                }
            );
        });


router.route("/admin/request-plus")
    .get(authentication.ensureAuthenticated,
        authentication.ensureAdmin,
        function(req, res)
        {
            var code = shortid.generate();

            var result = {"action": "action_request_plus", "info": "", "result": "failed"};

            async.waterfall(
                [
                    database.generateQueryFunction(
                        "INSERT INTO VerificationActions(actiontype_id, args, code) SELECT vat.id, $3, $1 FROM VerificationActionTypes vat WHERE vat.label=$2;",
                        [code, "ActivatePlus", {"duration": "2 weeks"}])
                ],
                function(err, results)
                {
                    if(err)
                    {
                        result["result"] = "failed";
                        result["info"] = err;
                    }
                    else
                    {
                        result["result"] = "success";
                        result["key"] = code;
                        result["duration"] = "2 weeks";
                    }
                    res.json(result);
                }
            );
        });

router.route("/admin/rerun-fails")
    .get(authentication.ensureAuthenticated,
        authentication.ensureAdmin,
        function(req, res)
        {
            var code = shortid.generate();

            var result = {"action": "action_rerun_fails", "info": "", "result": "failed"};

            async.waterfall(
                [
                    database.generateQueryFunction(
                            "UPDATE ReplayFiles rf SET processing_status=(SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$2) WHERE rf.processing_status=(SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$1);",
                                            ["failed", "uploaded"])
                ],
                function(err, results)
                {
                    if(err)
                    {
                        result["result"] = "failed";
                        result["info"] = err;
                    }
                    else
                    {
                        result["result"] = "success";
                        result["n"] = results.rowCount;
                        result["info"] = results;
                    }
                    res.json(result);
                }
            );
        });

exports.router = router;
