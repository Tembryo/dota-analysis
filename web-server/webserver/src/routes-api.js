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
    .post(function(req, res) {
        
        var match = new Match();      // create a new instance of the Match model
	console.log("id: "+req.body.id);
	console.log("label: "+req.body.label);
        match.id = req.body.id;  	// fill in request data
        match.label = req.body.label;
	    match.parsing_status = "to_download";
        match.replay_file = "";
        match.parsed = "";

        // save the match and check for errors
        match.save(function(err) {
            if (err)
                res.send(err);

            res.json({ message: 'Match created!' });
        })
    })
    // get all the matches
    .get(function(req, res) {
        fs.readdir(config.files+"/static/data/headers",
            function(err, files){
                if(err)
                    console.log(err);
                var replay_headers_files = files;
                var processed_files = [];
                var c=0;
                files.forEach(function(file){
                    c++;
                    fs.readFile(config.files+"/static/data/headers/"+file,'utf-8',function(err,json){
                        if (err) throw err;
                        console.log("load "+file);
                        processed_files.push(JSON.parse(json));
                        console.log("wrote "+file);
                        if (0===--c) {
                            res.json(processed_files);
                        }
                    });
                });
                if(err)
                    console.log(err);

            })
    });

router.route('/matches/:match_id')
    .get(function(req, res) {
        Match.findOne({"id": req.params.match_id}, "id label parsing_status parsed", function(err, match) {
            if (err)
                res.send(err);
            res.json(match);
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
                console.log(identifier + " complete " + percent_complete.toFixed(2));
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
