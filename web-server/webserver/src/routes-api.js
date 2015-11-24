var	express			= require('express');

var	config			= require("./config_local.js");

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
        Match.find({}, "id label", function(err, matches) {
            if (err)
                res.send(err);

            res.json(matches);
        });
        
    });

router.route('/matches/:match_id')
    .get(function(req, res) {
    console.log("got id"+req.params.match_id);
        Match.findOne({"id": req.params.match_id}, "id label parsing_status parsed", function(err, match) {
            if (err)
                res.send(err);
            res.json(match);
        });
    });

exports.router = router;
