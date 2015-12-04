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
                res.send(err);
            fs.readFile(match.file, 'utf-8',function(err,json){
                    if (err)
                        res.send(err);
                    console.log("opened "+req.params.match_id);
                    res.json(JSON.parse(json));
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


        });

exports.router = router;
