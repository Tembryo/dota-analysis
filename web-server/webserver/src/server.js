// server.js

var express    = require('express'),        // call express
	bodyParser = require('body-parser'),
	cookieParser = require('cookie-parser'),
	morgan = require('morgan'),
	methodOverride = require('method-override'),
	passport = require('passport'),
	SteamStrategy = require('passport-steam').Strategy;

var host = "localhost";        // set our port
var port = 42000;        // set our port

var app = express();                 // define our app using express

app.set('client-url',"http://"+host+":"+port);
app.disable('x-powered-by');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride());

var mongoose   = require('mongoose');
mongoose.connect('mongodb://localhost:42200/wisdota'); // connect to our database

var Match = require('./models/match');

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Steam profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the SteamStrategy within Passport.
//   Strategies in passport require a `validate` function, which accept
//   credentials (in this case, an OpenID identifier and profile), and invoke a
//   callback with a user object.
passport.use(new SteamStrategy({
    returnURL: "http://localhost:"+port+"/api/auth/steam/return",
    realm: "http://localhost:"+port+"/",
    apiKey: '738D637E98D73D27B9802CA833784D7F'
  },
  function(identifier, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {

      // To keep the example simple, the user's Steam profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Steam account with a user record in your database,
      // and return that user instead.
	console.log("got token! "+identifier);
      profile.identifier = identifier;
      return done(null, profile);
    });
  }
));

app.use(passport.initialize());
app.use(passport.session());

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

// middleware to use for all requests
router.use(function(req, res, next) {
    // do logging
    console.log('Something is happening.');
    next(); // make sure we go to the next routes and don't stop here
});

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
    res.json({ message: 'hooray! welcome to our api!' });   
});

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

// GET /auth/steam
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Steam authentication will involve redirecting
//   the user to steam.com.  After authenticating, Steam will redirect the
//   user back to this application at /auth/steam/return
router.route('/auth/steam')
	.get(	passport.authenticate('steam', { failureRedirect: '/login' }),
		  function(req, res) {
		    res.redirect('/');
		  });

// GET /auth/steam/return
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
router.route('/auth/steam/return')
	.get(passport.authenticate('steam', { failureRedirect: '/login' }),
  function(req, res) {
    console.log("is this life");
    res.json({ message: 'SOOOO authenticated' });   
  });

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}

//register router
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);
