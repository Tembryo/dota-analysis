var express = require('express'),
    async = require('async');

var authentication = require("./routes-auth.js"),
    config = require("./config.js");

var database = require("/shared-code/database.js");

var router = express.Router();

router.use(function(req, res, next)
{
    var locals = {};
    async.waterfall(
        [
            function(callback)
            {
                var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
                var user = null;
                if(req.user)
                    user = req.user["id"];

                var data = {
                    "page": req.path,
                    "user": user,
                    "ip": ip
                }

                database.query("INSERT INTO events(event_type, time, data) VALUES ((SELECT id FROM EventTypes WHERE label=$1),now(), $2);",["ViewPage", data],callback);
            },
            function(results, callback)
            {
                if(results.rowCount != 1)
                {
                    callback("event insert failed", results);
                }
                else
                {
                    callback();
                }
            }
        ],
        function(err, results)
        {
            if(err)
                console.log(err, results);
            next();
        }
    );
 // make sure we go to the next routes and don't stop here
});

function collectTemplatingData(req)
{
    var data = {};
    data["user"] = req.user;

    return data;
}

function addNavigationData(data)
{
}

router.get('/', function(req, res)
{
    var data = collectTemplatingData(req);
    res.render("pages/index.ejs", data);
});

router.get('/plus', function(req, res)
{
    var data = collectTemplatingData(req);
    res.render("pages/plus.ejs", data);
});

router.get('/about', function(req, res)
{
    var data = collectTemplatingData(req);
    res.render("pages/faq.ejs", data);
});

router.get('/user',
    authentication.ensureAuthenticated,
    function(req, res)
    {
        var data = collectTemplatingData(req);
        if(req.query.hasOwnProperty("start") && req.query.hasOwnProperty("end"))
        {
            data["start"] =  parseInt(req.query["start"]);
            data["range"] =  parseInt(req.query["end"]) - parseInt(req.query["start"]);
        }
        else if(req.query.hasOwnProperty("start"))
        {
            data["start"] =  req.query["start"];
            data["range"] =  5;
        }
        else
        {
            data["start"] =  0;
            data["range"] =  5;
        }
        res.render("pages/user.ejs", data);
    }
);

router.get('/result', function(req, res)
{
    var data = collectTemplatingData(req);
    if(req.query.hasOwnProperty("example"))
        data["example"] = req.query.example;
    else
        data["example"] =  0;
    data["match_id"] = 0; //TODO fetch from db
    data["result_id"] = -1;
    res.render("pages/result.ejs", data);
});

router.get('/result/:result_id', function(req, res)
{

    var locals = {};
    async.waterfall(
        [
            database.generateQueryFunction(
                "SELECT match_id FROM Results r WHERE r.id=$1;",[req.params.result_id]),
            function(results, callback)
            {
                if(results.rowCount != 1)
                {
                    callback("bad row count", results);
                }
                else
                {
                    locals.match_id = results.rows[0]["match_id"];
                    callback();
                }
            }
        ],
        function(err, results)
        {
            if(err)
                console.log(err, results);
            
            var data = collectTemplatingData(req);

                data["result_id"] = req.params.result_id;
                data["match_id"] = locals.match_id; //TODO fetch from db
                data["example"] =  null;
                res.render("pages/result.ejs", data);

        }
    );

    
});

router.get('/match/:match_id', function(req, res)
{
    var data = collectTemplatingData(req);
    data["match_id"] = req.params.match_id;
    res.render("pages/match.ejs", data);
});


router.get('/scoreboard/:match_id', function(req, res)
{
    var data = collectTemplatingData(req);
    data["match_id"] = req.params.match_id;
    res.render("pages/scoreboard.ejs", data);
});

router.get('/admin',
    authentication.ensureAuthenticated,
    authentication.ensureAdmin,
    function(req, res)
    {
        var data = collectTemplatingData(req);

        res.render("pages/admin.ejs", data);
    }
);


router.get('/confirm-newsletter/:verification_code', function(req, res)
{
    var data = collectTemplatingData(req);
    data["code"] = req.params.verification_code;
    res.render("pages/confirm-newsletter.ejs", data);
});

exports.router = router;
