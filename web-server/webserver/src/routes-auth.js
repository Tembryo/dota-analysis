var	express		= require('express'),
	passport	= require("passport"),
    async       = require('async'),
    clone       = require('clone');
var shortid         = require('shortid');

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
    //console.log("serializing", user);
    done(null, user.id);
});

passport.deserializeUser(
    function(obj, done)
    {

        var locals = {};
        locals.user_id = obj;

        //console.log("deserializing", obj);

        async.waterfall(
            [
                database.connect,
                function(client, client_done, callback)
                {
                    locals.client = client;
                    locals.done = client_done;
                    locals.client.query(
                        "SELECT u.id, u.name FROM Users u WHERE u.id = $1;",
                        [locals.user_id],
                        callback);
                },
                function(results, callback)
                {
                    if(results.rowCount <1)
                        callback("Couldn't find user");
                    locals.user = results.rows[0];
                    locals.client.query(
                        "SELECT json_agg(ust.label) as statuses FROM UserStatuses us, UserStatusTypes ust WHERE us.user_id=$1 AND us.statustype_id=ust.id;",
                        [locals.user_id],
                        callback);
                },
                function(results, callback)
                {
                    if(results.rowCount == 0)
                        locals.user.statuses = [];
                    else if(results.rows[0].statuses == null)
                        locals.user.statuses = [];
                    else
                        locals.user.statuses = results.rows[0].statuses;
                    callback(null);
                }
            ],
            function(err, result)
            {
                if (err)
                    console.log(err);
                locals.done();
			    done(err, locals.user);
            }
        );
    }
);


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

            var locals = {};
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
                            steam_auth.getProfile(steam_id, function(err, profile)
                            {
                                if(err)
                                    callback(err);
                                else
                                    locals.client.query("INSERT INTO Users(name, steam_identifier, steam_object, email) VALUES ($1, $2, $3, $4) RETURNING id, name;",[profile["displayName"], profile["id"], profile["_json"], "unknown"],callback);
                            });
                            
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
                    locals.done();

                    if (!(err === "found_old") && err)
                    {
                         console.log(err);
                        done(err);
                    }
                    else
                        done(null, user); 
                }
            );
    	}
	)
);

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();

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
		    res.redirect('/user');
        }
	);

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
    //console.log("ensure");
    if (req.isAuthenticated())
    {
        //console.log("Auth ok");
        return next();
    }
    else
    {
        console.log("go auth u fool");
        res.redirect('/auth/steam');
    }
}

//restrict access to admin accounts
function ensureAdmin(req, res, next)
{
    var locals = {};
    locals.user = {};
    async.waterfall(
        [
            database.connect,
            function(client, done, callback)
            {
                locals.client = client;
                locals.done = done;

                locals.client.query(
                    "SELECT us.user_id FROM UserStatuses us, UserStatusTypes ust WHERE us.user_id=$1 AND us.statustype_id=ust.id And ust.label=$2",
                    [req.user["id"], "admin"],
                    callback);
            },
            function(results, callback)
            {
                //allow access if admin entry found 
                callback(null, results.rowCount > 0);
            }
        ],
        function(err, result)
        {
            locals.done();
            if(result)
            {
                next();
            }
            else
                res.render("pages/no-permission.ejs", data);
        }
    );
};

exports.router = router;
exports.ensureAuthenticated = ensureAuthenticated;
exports.ensureAdmin = ensureAdmin;

