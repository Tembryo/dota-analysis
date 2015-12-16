var express = require('express'),
    async = require('async');

var authentication = require("./routes-auth.js"),
    config = require("./config.js"),
    database = require("./database.js");

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
router.get('/user',
    authentication.ensureAuthenticated,
    function(req, res)
    {
        var data = collectTemplatingData(req);
        addNavigationData(data);
        if(req.params.code)
            data["code"] = res.params.code;
        else
            data["code"] = "";

        locals = {};
        locals.user = {};
        async.waterfall(
            [
                database.connect,
                function(client, done, callback)
                {
                    locals.client = client;
                    locals.done = done;

                    locals.client.query("SELECT id, name, steam_object, email, FROM Users WHERE id = $1;",[req.user["id"]],callback);
                },
                function(results, callback)
                {
                    console.log("selected user, got: ", results);
                    locals.user = results.rows[0];
                    //TODO add statuses
                    locals.client.end();
                    locals.done();
                    callback(null, "success");
                }
            ],
            function(err, result)
            {
                if (err)
                    console.log(err);
                data["user"] = locals.user;
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
            data["user"] = req.user;
            res.render("pages/upload.ejs", data);
        });

exports.router = router;
