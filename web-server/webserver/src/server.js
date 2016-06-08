// server.js

var express         = require("express"),
    bodyParser      = require("body-parser"),
    cookieParser    = require("cookie-parser"),
    session         = require("express-session"),
    morgan          = require("morgan"),
    ejs_mate        = require('ejs-mate'),
    methodOverride  = require("method-override"),
    passport        = require("passport"),
    pgSession       = require('connect-pg-simple')(session);

var config          = require("./config.js"),
    database        = require("/shared-code/database.js");

var website_routes  = require("./routes-website.js"),
    api_routes      = require("./routes-api.js"),
    auth_routes     = require("./routes-auth.js");


var session_secret = "mega-secret-wisdota-session";

var app = express();

app.set('client-url',"http://"+config.host);
app.disable('x-powered-by');

app.engine('ejs', ejs_mate);
app.set('view engine', 'ejs');
app.set('views', config.files+"/views");

app.use("/static", express.static(config.files+"/static"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride());

app.use(session({
  "store": new pgSession({
    "pg" : database.pg,
    "conString" : database.connection_string,
    "tableName" : 'UserSessions'
  }),
  "secret": session_secret,
  "resave": false,
  "saveUninitialized": false,
  "cookie": { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days 
}));


app.use(passport.initialize());
app.use(passport.session());

app.use(function(req, res, next) {
    //console.log("Webserver callled for "+req.originalUrl);
    next();
});

//register routes
app.use("/", website_routes.router);
app.use("/api", api_routes.router);
app.use("/auth", auth_routes.router)


// START THE SERVER
// =============================================================================
app.listen(config.port);
console.log('Magic happens on port ' + config.port);
