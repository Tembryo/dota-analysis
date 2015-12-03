var express = require('express');

var authentication = require("./routes-auth.js"),
    config = require("./config.js");

var router = express.Router();

router.use(function(req, res, next)
{
    //place for middleware
    next(); // make sure we go to the next routes and don't stop here
});

function collectTemplatingData(req)
{
    var data = {};
    data["user"] = req.user;

    return data;
}

function addNavigationData(data)
{
    data["navigation_entries"] = [
    {
        "label": "Parsed Matches",
        "link": "/matches"
    },
    {
        "label": "Replay Upload",
        "link": "/upload"
    }];
}

router.get('/', function(req, res)
{
    var data = collectTemplatingData(req);
    res.render("pages/index.ejs", data);
});

router.get("/dota", function(req, res)
{
    res.redirect('/');
});


// Page /user
var User = require('./models/user');

router.get('/user',
    authentication.ensureAuthenticated,
    function(req, res)
    {
        var data = collectTemplatingData(req);
        addNavigationData(data);

        User.findOne(
            {
                "identifier": req.user["identifier"]
            },
            "identifier name steam_object email beta_enabled",
            function(err, user)
            {
                if (err)
                    console.log(err);
                data["user"] = user;
                res.render("pages/user.ejs", data);
            }
        );
    }
);

router.get('/matches',
    authentication.ensureAuthenticated,
    function(req, res)
    {
        var data = collectTemplatingData(req);
        addNavigationData(data);
        res.render("pages/matches.ejs", data);
    }
);
router.get('/match/:match_id',
    authentication.ensureAuthenticated,
    function(req, res)
    {
        var data = collectTemplatingData(req);
        addNavigationData(data);
        data["match_id"] = req.params.match_id;
        res.render("pages/match.ejs", data);
    }
);

router.route("/upload")
    .get(authentication.ensureAuthenticated,
        function(req, res)
        {
            var data = collectTemplatingData(req);
            addNavigationData(data);
            res.render("pages/upload.ejs", data);
        })

exports.router = router;
