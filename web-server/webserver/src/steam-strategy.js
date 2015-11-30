/**
 * Module dependencies.
 */
var util = require('util'),
    OpenIDStrategy = require('passport-openid').Strategy,
    SteamWebAPI = require('steam-web'),
    config = require("./config.js");


/**
 * `Strategy` constructor.
 *
 * The Steam authentication strategy authenticates requests by delegating to
 * Steam using the OpenID 2.0 protocol.
 *
 * Options:
 *   - `returnURL`  URL to which Steam will redirect the user after authentication
 *   - `realm`      the part of URL-space for which an OpenID authentication request is valid
 *
 * Examples:
 *
 *     passport.use(new SteamStrategy({
 *         returnURL: 'http://localhost:3000/auth/steam/return',
 *         realm: 'http://localhost:3000/'
 *       },
 *       function(identifier, profile, done) {
 *         User.findByOpenID(identifier, function (err, user) {
 *           done(err, user);
 *         });
 *       }
 *     ));
 *
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
function Strategy(options, validate) {
    options = options || {};
    options.providerURL = "http://steamcommunity.com/openid";
    options.stateless = true; //Steam only works as a stateless OpenID

    OpenIDStrategy.call(this, options, validate);

    this.name = 'steam';
}

/**
 * Inherit from `OpenIDStrategy`.
 */
util.inherits(Strategy, OpenIDStrategy);


var api_semaphore = require("semaphore")(1);

//Separate Function to retrieve profile info
function getProfile(identifier, callback)
{
    api_semaphore.take(
        function()
        {
            var steam = new SteamWebAPI({ apiKey: config.steam_api_key, format: "json" });
            console.log("got sema, using sapi");
            console.log("id "+identifier);
            steam.getPlayerSummaries(
                {
                    steamids: [ identifier ],
                    callback: function(err, result)
                        {
                            if (err) return done(err);

                            profile = {
                                provider: "steam",
                                _json: result.response.players[0],
                                id: result.response.players[0].steamid,
                                displayName: result.response.players[0].personaname,
                                photos: [   { value: result.response.players[0].avatar }, 
                                            { value: result.response.players[0].avatarmedium },
                                            { value: result.response.players[0].avatarfull } ]
                            };
                            setTimeout(function(){console.log("leaving sema");api_semaphore.leave();}, 1000);
                            console.log("returning profile");
                            callback(profile);
                        }
                }
            );
        }
    );
    

}


/**
 * Expose `Strategy`.
 */
exports.Strategy = Strategy;
exports.getProfile = getProfile;
