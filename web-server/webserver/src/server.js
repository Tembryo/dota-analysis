// server.js

var express         = require("express"),
    bodyParser      = require("body-parser"),
    cookieParser    = require("cookie-parser"),
    session         = require("express-session"),
    morgan          = require("morgan"),
    methodOverride  = require("method-override"),
    passport        = require("passport");

var config          = require("./config_local.js"),
    database          = require("./database.js");

var website_routes  = require("./routes-website.js"),
    api_routes      = require("./routes-api.js"),
    auth_routes     = require("./routes-auth.js");


var session_secret = "mega-secret-wisdota-session";

var app = express();                 // define our app using express

app.set('client-url',"http://"+config.host);
app.disable('x-powered-by');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride());
app.use(session({secret: session_secret}));
app.use(passport.initialize());
app.use(passport.session());


//register routes
app.use("/", website_routes.router);
app.use("/api", api_routes.router);
app.use("/auth", auth_routes.router)
app.use("/static", express.static("/files/static"));

// START THE SERVER
// =============================================================================
app.listen(config.port);
console.log('Magic happens on port ' + config.port);
