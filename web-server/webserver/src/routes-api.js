var	express			= require("express"),
    fs              = require("fs"),
    formidable = require('formidable'),
    fs_extra = require('fs-extra'),
    shortid = require('shortid');

var	authentication = require("./routes-auth.js"),
    config			= require("./config.js");

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();

// middleware to use for all requests
router.use(function(req, res, next) {
    // do logging
    console.log('API is doing something.');
    next(); // make sure we go to the next routes and don't stop here
});

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
    res.json({ message: 'hooray! welcome to our api!' });   
});


//Match Data Serving
// =============================================================================
var Match = require('./models/match');

router.route('/matches')
    // get all the matches
    .get(function(req, res) {
        Match.find({}, "header_file",
            function(err, matches){
                if(err)
                    console.log(err);
                var processed_files = [];
                var c=0;
                matches.forEach(function(match){
                    c++;
                    fs.readFile(match.header_file,'utf-8',function(err,json){
                        if (err) console.log("failure reading match header "+err);
                        else
                        {
                            console.log("load "+match.header_file);
                            processed_files.push(JSON.parse(json));
                            console.log("added header json to list "+match.header_file);
                        }
                        if (0===--c) {
                            res.json(processed_files);
                        }
                    });
                });
                if(err)
                    console.log(err);

            })
    });

router.route('/match/:match_id')
    .get(function(req, res) {
        Match.findOne({"id": req.params.match_id}, "file", function(err, match) {
            if (err)
            {
                console.log("error retrieving match "+req.params.match_id+ " "+err});
                res.send(err);
            }
            else{
                fs.readFile(match.file, 'utf-8',function(err,json){
                    if (err)
                        res.send(err);
                    console.log("opened "+req.params.match_id);
                    res.json(JSON.parse(json));
            }
            })
        });
    });

ReplayFile = require('./models/replay-file');

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
                

                fs_extra.copy(temp_path, config.shared+new_file, function(err)
                {
                    if (err)
                    {
                        console.error(err);
                    }
                    else
                   {
                        var replay_file = new ReplayFile();
                        replay_file.identifier = identifier; 
                        replay_file.file = new_file;
                        replay_file.status = "uploaded";
                        replay_file.upload_name = file_name;
                        replay_file.uploader_identifier = req.user.identifier;

                        console.log("user id for upload "+req.user.identifier +" "+replay_file.uploader_identifier);
                        // save the match and check for errors
                        replay_file.save(function(err) {
                            if (err)
                                console.log(err);
                                console.log("success " + identifier + "!");
                        })

                    }
                });
            });


        })

router.route("/uploads")
    .get(authentication.ensureAuthenticated,
        function(req, res)
        {
            ReplayFile.find({"uploader_identifier": req.user["identifier"]}, "match_id status upload_name", function(err, replays){
                    if(err)
                    {
                        res.json([]);
                        console.log("checking replay status failed, "+err);
                    }
                    else{
                        res.json(replays);
                    }
                });
        });

VerificationAction = require('./models/verification-action');
User = require('./models/user');

router.route("/verify/:verification_code")
    .get(authentication.ensureAuthenticated,
        function(req, res)
        {
            var result = {"action": "unknown", "info": "", "result": "failed"};
            VerificationAction.findOneAndRemove({"code": req.params.verification_code}, "action args", function(err, action)
                {
                    if (err)
                    {
                        result["action"] = "action_lookup";
                        result["result"] = "failed";
                        result["info"] = err;
                    }
                    else
                    {
                        console.log("execute verified action");
                        console.log(action);
                        switch(action.action)
                        {
                        case "SET_EMAIL":
                            result["action"] = "SET_EMAIL";
                            result["result"] = "failed";
                            result["info"] = action;

                            User.findOne({ identifier: req.user["identifier"] }, function (err, user){
                                if (err)
                                {
                                    result["action"] = "find_user_to_set_email";
                                    result["result"] = "failed";
                                    result["info"] = {
                                            "err":err,
                                            "action": action,
                                            "user": req.user
                                            };
                                    res.json(result);
                                }
                                else
                                {
                                    user.email = action.args["new-address"];
                                    user.beta_status = "enabled";
                                    user.save(function(err) {
                                            if (err)
                                            {
                                                result["action"] = "change_user_email";
                                                result["result"] = "failed";
                                                result["info"] = {
                                                        "err":err,
                                                        "action": action,
                                                        "user": req.user
                                                        };
                                                res.json(result);
                                            }
                                            else
                                            {
                                                result["action"] = "set_email";
                                                result["result"] = "success";
                                                result["info"] = {
                                                        "action": action,
                                                        "user": req.user
                                                        };
                                                res.json(result);
                                            }
                                        });
                                }

                                });
                            break;
                        default: 
                            result["action"] = "action_execution";
                            result["result"] = "failed";
                            result["info"] = action;

                            res.json(result);
                        }
                    }

                });

        });



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
            transporter.sendMail(mail, function(error, info){
                if(error){
                    console.log(error);
                    res.json(result);
                }
                console.log('Confirmation mail sent: ' + info.response);
                if(!error)
                {
                    console.log("setting_email "+req.params.email_address);
                    action = new VerificationAction();
                    action.code = code;
                    action.action = "SET_EMAIL";
                    action.args = {"new-address": req.params.email_address};
                    action.markModified("args");
                    action.save(function(err) {
                            if(err)
                            {
                                result["result"] = "failed";
                                result["info"] = err;
                            }
                            else
                            {
                                result["result"] = "success";
                                result["info"] = {};//action.code;
                            }
                            res.json(result);
                        }
                    );
                }
            });
        });

exports.router = router;
