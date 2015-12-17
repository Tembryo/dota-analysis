var	express			= require("express"),
    async           = require('async'),
    fs              = require("fs"),
    formidable      = require('formidable'),
    fs_extra        = require('fs-extra'),
    shortid         = require('shortid');

var	authentication = require("./routes-auth.js"),
    config			= require("./config.js");

var database        = require("./database.js");

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
    res.json({ message: 'wisdota api - base' });   
});


//Match Data Serving
// =============================================================================

router.route('/matches')
    // get all the matches
    .get(function(req, res)
        {
            var locals = {};
            locals.header_files = [];
            async.waterfall(
                [
                    database.connect,
                    function(client, done_client, callback)
                    {
                        locals.client = client;
                        locals.done = done_client;

                        locals.client.query("SELECT header_file, label FROM Matches;",[],callback);
                    },
                    function(results, callback)
                    {
                        async.each(
                            results.rows,
                            function(row, callback_file)
                            {
                                fs.readFile(row.header_file,'utf-8',function(err,json){
                                    if (err) callback_file(err);
                                    else
                                    {
                                        console.log("load "+row.header_file);
                                        var header = JSON.parse(json);
                                        if(row.label)
                                            header["label"] = row.label;
                                        locals.header_files.push(header);
                                        console.log("added header json to list "+row.header_file);
                                        callback_file(null);
                                    }
                                });
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

router.route('/match/:match_id')
    .get(function(req, res) 
        {
            var locals = {};
            async.waterfall(
                [
                    database.connect,
                    function(client, done_client, callback)
                    {
                        locals.client = client;
                        locals.done = done_client;

                        locals.client.query("SELECT file FROM Matches WHERE id=$1;",[req.params.match_id],callback);
                    },
                    function(results, callback)
                    {
                        //console.log("fetched file", results);
                        if(results.rowCount != 1)
                            callback("bad result selecting file ", results);
                        else
                           fs.readFile(results.rows[0].file, 'utf-8',callback);
                    },
                    function(json, callback)
                    {
                        callback(null, JSON.parse(json));
                    }
                ],
                function(err, result)
                {
                    locals.client.end();
                    locals.done();

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
                var new_file = "/uploads/"+ identifier + ".dem";
                
                var locals = {};
                async.waterfall(
                    [
                        fs_extra.copy.bind(fs_extra, temp_path, config.shared+new_file),
                        database.connect,
                        function(client, done_client, callback)
                        {
                            locals.client = client;
                            locals.done = done_client;
                            locals.client.query("INSERT INTO ReplayFiles(file, upload_filename, processing_status, uploader_id) VALUES($1, $2, (SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label=$3), $4);",[new_file, file_name, "uploaded", req.user.id],callback);
                        }
                    ],
                    function(err, results)
                    {
                        locals.client.end();
                        locals.done();
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
            var locals = {};
            async.waterfall(
                [
                    database.connect,
                    function(client, done_client, callback)
                    {
                        locals.client = client;
                        locals.done = done_client;

                        locals.client.query("SELECT rf.id, rf.match_id,ps.label as status,rf.upload_filename FROM ReplayFiles rf, ProcessingStatuses ps WHERE rf.processing_status = ps.id AND rf.uploader_id=$1;",
                            [req.user["id"]],callback);
                    },
                    function(results, callback)
                    {
                        //just give out the rows?
                        callback(null, results.rows);
                    }
                ],
                function(err, results)
                {
                    locals.client.end();
                    locals.done();
                    if(err)
                    {
                        console.log(err);
                    }
                    res.json(results);
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
                    database.connect,
                    function(client, done_client, callback)
                    {
                        locals.client = client;
                        locals.done = done_client;

                        locals.client.query("DELETE FROM VerificationActions va WHERE va.code=$1 RETURNING (SELECT vat.label from VerificationActionTypes vat WHERE vat.id=va.actiontype_id) as action, va.args;",
                            [req.params.verification_code],callback);
                    },
                    function(results, callback)
                    {
                        console.log("got", results);
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
                                locals.client.query(
                                    "UPDATE Users u SET email=$2 WHERE u.id=$1;",
                                    [req.user["id"], new_email],
                                    function(err, results){if(err) callback(err, results); else locals.client.query("INSERT INTO UserStatuses (user_id, statustype_id, expiry_date) SELECT $1, ust.id, 'infinity' FROM UserStatusTypes ust WHERE ust.label=$2;",
                                    [req.user["id"], "verified"],callback);});
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
                    locals.client.end();
                    locals.done();
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
                    database.connect,
                    function(client, done_client, callback)
                    {
                        locals.client = client;
                        locals.done = done_client;

                        locals.client.query("INSERT INTO VerificationActions(actiontype_id, args, code) SELECT vat.id, $3, $1 FROM VerificationActionTypes vat WHERE vat.label=$2;",
                            [code, "SetEmail", {"new-address": req.params.email_address}],callback);
                    }
                ],
                function(err, results)
                {
                    locals.client.end();
                    locals.done();
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

exports.router = router;
