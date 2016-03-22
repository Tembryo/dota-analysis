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
    database        = require("/shared-code/database.js");


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


//Match Data Serving
// =============================================================================

router.route('/match-header')
    // get all the matches
    .get(function(req, res)
        {
            locals = {};
            locals.header_files = [];
            async.waterfall(
                [
                    function(callback)
                    {
                        var restriction_string = "";
                        if(req.query.hasOwnProperty("matchid"))
                        {
                            match_id= parseInt(req.query.matchid);
                            database.query("SELECT header_file, label FROM Matches WHERE id=$1;",[match_id],callback);
                        }
                        else
                        {
                            database.query("SELECT header_file, label FROM Matches;",[],callback);
                        }

                    },
                    function(results, callback)
                    {
                        async.each(
                            results.rows,
                            function(row, callback_file)
                            {
                                async.waterfall(
                                    [
                                        function (callback)
                                        {
                                            console.log("retrievign header");
                                            storage.retrieve(row.header_file, callback);
                                        },
                                        function(local_path, callback)
                                        {
                                            console.log("reading header");
                                            fs.readFile(local_path,'utf-8', callback);
                                        },
                                        function(json, callback)
                                        {
                                            console.log("load "+row.header_file);
                                            var header = JSON.parse(json);
                                            if(row.label)
                                                header["label"] = row.label;
                                            locals.header_files.push(header);
                                            console.log("added header json to list "+row.header_file);
                                            callback(null);
                                        }
                                    ],
                                    callback_file
                                );
                            },
                            callback);
                    }
                ],
                function(err)
                {
                    if(err)
                        console.log(err);
                    res.json(locals.header_files);
                }
            );
        }
    );

router.route('/results')
    .get(function(req, res) 
        {
            var match_id = 0;
            if(req.query.hasOwnProperty("matchid"))
            {
                match_id= parseInt(req.query.matchid);
            }
            else
            {
                res.json([]);
                return;
            }
            console.log("results for match",match_id);
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
                        console.log("error retrieving scores for "+match_id);
                        console.log(err);
                        
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
            async.waterfall(
                [
                    database.generateQueryFunction(
                        "SELECT r.data as score_data, ps.data as player_data FROM Results r, PlayerStats ps "+
                            "WHERE r.id=$1 AND ps.match_id=r.match_id AND ps.steam_identifier = r.steam_identifier;",[req.params.result_id]),
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
                        console.log("error retrieving result "+req.params.match_id);
                        console.log(err);
                        
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
                        callback(null, JSON.parse(json));
                    }
                ],
                function(err, result)
                {
                    if(err)
                    {
                        console.log("error retrieving match "+req.params.match_id);
                        console.log(err);
                        console.log(result);
                        
                        res.send(err);
                    }
                    else
                        res.json(result);
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
                console.log("finished upload of "+identifier);
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
                console.error(err);
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
                            console.log(err);
                            console.log("success " + identifier + "!");
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
                        console.log(err);
                    }
                    res.json(results);
                }
            );
        }
    );


router.route("/retrieve")
    .get(authentication.ensureAuthenticated,
        function(req, res)
        {
            async.waterfall(
                [
                    database.generateQueryFunction("SELECT mrr.id, mrs.label as status FROM MatchRetrievalRequests mrr, MatchRetrievalStatuses mrs WHERE mrr.retrieval_status = mrs.id AND mrr.requester_id=$1;",
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
                        console.log(err);
                    }
                    res.json(results);
                }
            );
        }
    );

router.route("/retrieve/:match_id")
    .post(authentication.ensureAuthenticated,
        function(req, res)
        {
            async.waterfall(
                [
                    database.generateQueryFunction("SELECT rf.id FROM ReplayFiles rf WHERE rf.id=$1;",
                            [req.params.match_id]),
                    function(results, callback)
                    {
                        if(results.rowCount > 0)
                            callback("already exists");
                        else
                        {
                            database.query("INSERT INTO MatchRetrievalRequests(id, retrieval_status, requester_id) VALUES ($1, (SELECT mrs.id FROM MatchRetrievalStatuses mrs where mrs.label=$2), $3);",
                            [req.params.match_id, "requested", req.user["id"]],callback);
                        }
                    },
                    function(results, callback)
                    {
                        if(results.rowCount != 1)
                            callack("inserting request failed", results);
                        else
                            callback();
                    }
                ],
                function(err, results)
                {
                    if(err)
                    {
                        console.log(err);
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
                            "result": "success"
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
                        console.log(err);
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
                query_string = "SELECT COUNT(*) as n, mrs.label as status FROM MatchRetrievalRequests mrr, MatchRetrievalStatuses mrs  WHERE mrr.retrieval_status =  mrs.id GROUP BY mrs.label;";
                break;
            case "processing-statuses":
                query_string = "SELECT COUNT(*) as n, ps.label as status FROM Replayfiles rf, ProcessingStatuses ps  WHERE rf.processing_status =  ps.id GROUP BY ps.label;";
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
                        console.log("error retrieving admin data "+query_string, err, result);
                        
                        res.json({});
                    }
                    else
                        res.json(result);
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
                        console.log(err, results);
                        var error_result = {
                            "result": "error",
                            "message": err,
                            "info": results
                            };
                        res.json(error_result);
                    }
                    else
                    {
                        console.log("found score res",results);
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


router.route("/history")
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
            
            var refresh_message = 
                {
                    "message": "RefreshHistory",
                    "id": req.user["id"]
                };

            communication.publish("match_history", refresh_message,
                function()
                {
                    console.log("requested history refresh");
                });


            async.waterfall(
                [
                    database.generateQueryFunction(
                        "SELECT umh.match_id, umh.data,"+
                           "COALESCE("+
                            "(SELECT r.id FROM Results r, Users u WHERE r.steam_identifier = u.steam_identifier AND r.match_id = umh.match_id AND u.id = $1),"+
                            "-1) AS result_id, "+
                            "COALESCE("+
                                "(SELECT TEXT('scored') FROM Results r, Users u WHERE r.steam_identifier = u.steam_identifier AND r.match_id = umh.match_id AND u.id = $1), "+
                                "(SELECT TEXT('parsed') FROM Matches m WHERE m.id=umh.match_id), "+
                                "(SELECT ps.label FROM ReplayFiles rf, ProcessingStatuses ps WHERE rf.match_id=umh.match_id AND rf.processing_status = ps.id),"+
                                "(SELECT mrs.label FROM MatchRetrievalRequests mrr, MatchRetrievalStatuses mrs WHERE mrr.retrieval_status = mrs.id AND mrr.id=umh.match_id),"+
                                "'untried') as match_status "+
                        "FROM UserMatchHistory umh "+
                        "WHERE umh.user_id = $1 "+
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
                        console.log(err);
                    }
                    res.json(results);
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
                        console.log(err);
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
                        console.log("download err ", err);
                        var error_result = {
                            "result": "error",
                            "message": err
                            };
                    }
                    else
                    {
                        console.log("download success",match_id);
                    }
                }
            );
        }
    );



router.route("/verify/:verification_code")
    .get(authentication.ensureAuthenticated,
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
                            console.log("execute verified action");
                            locals.action = results.rows[0].action;
                            console.log(locals.action);
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
                        console.log(err_result);
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
    subject: 'Wisdota email verification', // Subject line
    text: "Hey %(name)s, welcome to Wisdota!\n\n The verficiation code for your email is >> %(code)s <<. Enter the code in the user panel over at www.wisdota.com/user to complete the verification process.\n This unlocks the >> Replay upload << section of the website where you can upload your own replays to get them analysed.\n\n The software is under heavy development and this is just the very first step on our way towards automated game analysis. If you have any feedback, criticism, or features you want to see in the next version, please do let us know!\n\n best wishes\n The Wisdota Team ", // plaintext body
    
    html: "<h4>Hey %(name)s, welcome to Wisdota!</h4> <p>The verficiation code for your email is <b>%(code)s</b>. Enter the code in the user panel over at www.wisdota.com/user to complete the verification process.<br/> This unlocks the <b>Replay upload</b> section of the website where you can upload your own replays to get them analysed.</p><p> The software is under heavy development and this is just the very first step on our way towards automated game analysis. If you have any feedback, criticism, or features you want to see in the next version, please do let us know!</p> <p>best wishes<br/> The Wisdota Team</p> " // html body
};


router.route("/settings/email/:email_address")
    .get(authentication.ensureAuthenticated,
        function(req, res)
        {
            var code = shortid.generate();

            var result = {"action": "action_creation_set_email", "info": "", "result": "failed"};
            var mail_data = {
                                "code": code,
                                "name": req.user["name"]
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
                        console.log('Confirmation mail sent: ' + info.response);
                        callback(null);
                    },
                    database.generateQueryFunction(
                        "INSERT INTO VerificationActions(actiontype_id, args, code) SELECT vat.id, $3, $1 FROM VerificationActionTypes vat WHERE vat.label=$2;",
                        [code, "SetEmail", {"new-address": req.params.email_address}]
                    )
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
