var	express		= require('express'),
	passport	= require("passport"),
	SteamStrategy	= require("passport-steam").Strategy;

var	config		= require("./config.js");

var User = require('./models/user');

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Steam profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user.identifier);
});

passport.deserializeUser(function(obj, done) {
	User.findOne({"identifier": obj}, "identifier name", function(err, user){
			if (err)
				console.log(err);
			done(null, user);
        });
});


// Use the SteamStrategy within Passport.
//   Strategies in passport require a `validate` function, which accept
//   credentials (in this case, an OpenID identifier and profile), and invoke a
//   callback with a user object.
passport.use(
	new SteamStrategy(
		{
			returnURL: "http://"+config.host+"/auth/steam/return",
			realm: "http://"+config.host+"/",
			apiKey: config.steam_api_key
		},
		function(identifier, profile, done) {
			console.log("Steam verify");
			User.findOne(
				{"identifier": identifier},
				"name steam_object identifier",
				function(err, user){
					if (err)
						console.log(err);
                    if(user == null)
					{
						console.log("accepting old user");
                        var user = new User();
                        user.name = profile["displayName"];
                        user.identifier = profile["id"];
                        user.steam_object = profile["_json"];
                        user.markModified("steam_object");
                        user.email = "unknown";
			            user.save();
						done(null,user);//return new user
					}
					else
					{
						console.log("accepting old user");
						done(null, user);
					}
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
		    res.redirect('/user');
        }
	);

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/auth/steam')
}

exports.router = router;
exports.ensureAuthenticated = ensureAuthenticated;

