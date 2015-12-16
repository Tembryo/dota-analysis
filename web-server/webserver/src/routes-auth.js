var	express		= require('express'),
	passport	= require("passport"),
    async = require('async');


var	config		= require("./config.js"),
    steam_auth = require("./steam-strategy.js"),
    database = require('./database.js');

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Steam profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(obj, done) {
    locals = {};
    async.waterfall(
        [
            database.connect,
            function(client, client_done, callback)
            {
                locals.client = client;
                locals.done = client_done;

                locals.client.query("SELECT u.id, u.name, json_agg(SELECT us.id FROM UserStatuses us WHERE us.user_id=u.id) as statuses FROM Users u WHERE u.id = $1;",[obj],callback);
            },
            function(results, callback)
            {
                var user = results.rows[0];
                locals.client.end();
                locals.done();
                callback(null, user);
            }
        ],
        function(err, result)
        {
            if (err)
                console.log(err);
			done(null, result);
        }
    );
});


// Use the SteamStrategy within Passport.
//   Strategies in passport require a `validate` function, which accept
//   credentials (in this case, an OpenID identifier and profile), and invoke a
//   callback with a user object.

passport.use(
	new steam_auth.Strategy(
		{
			returnURL: config.steam_realm+"auth/steam/return",
			realm: config.steam_realm,
			apiKey: config.steam_api_key
		},
		function(identifier, done) {
			console.log("Steam verify");
            var steam_id = identifier.substring(identifier.lastIndexOf("/")+1);
            console.log("id "+steam_id);

            locals = {};
            async.waterfall(
                [
                    database.connect,
                    function(client, done_client, callback)
                    {
                        locals.client = client;
                        locals.done = done_client;

                        locals.client.query("SELECT id, name FROM Users WHERE steam_identifier = $1;",[steam_id],callback);
                    },
                    function(results, callback)
                    {
                        if(results.rowCount == 0)
                        {
    						console.log("accepting new user");

/*
                         user.name = profile["displayName"];
                                user.identifier = profile["id"];
                                user.steam_object = profile["_json"];
                                user.email = "unknown";
*/
                            locals.client.query("INSERT INTO Users(name, steam_identifier, steam_object, email) VALUES ($1, $2, $3, $4) RETURNING id, name;",[profile["displayName"], profile["id"], profile["_json"], "unknown"],callback);
                        }
                        else
                        {
    						console.log("accepting old user");  
                            var user = results.rows[0];
                            callback("found_old", user);
                        }
                    },
                    function(results, callback)
                    {
                        console.log("inserted, got ", results);
                        var user = results.rows[0];
                        callback(null, user);
                    }
                ],
                function(err, user)
                {
                    locals.client.end();
                    locals.done();

                    if (!(err === "found_old") && err)
                        console.log(err);
                    done(null, user); 
                }
            );
    	}
	)
);

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();

router.use(function(req, res, next) {
    console.log("Auth is doing something.");
    next();
});

// GET /auth/steam
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Steam authentication will involve redirecting
//   the user to steam.com.  After authenticating, Steam will redirect the
//   user back to this application at /auth/steam/return
router.route("/steam")
	.get(	passport.authenticate("steam", { failureRedirect: "/" }),
		  function(req, res) {
    			console.log("should not get called");
		  });

// GET /auth/steam/return
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
router.route("/steam/return")
    .get(	
        passport.authenticate("steam", { failureRedirect: "/" }),
		function(req, res) {
            //console.log(req.user);
		    console.log("returned from steam");
            console.log(req.originalUrl);
		    res.redirect('/matches');
        }
	);

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
    console.log("ensure");
    console.log(req.originalUrl);
  res.redirect('/auth/steam')
}

exports.router = router;
exports.ensureAuthenticated = ensureAuthenticated;

