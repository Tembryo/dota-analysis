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
    var data = collectTemplatingData(req);

    data["result_id"] = req.params.result_id;
    data["match_id"] = req.params.result_id; //TODO fetch from db
    data["example"] =  null;
    res.render("pages/result.ejs", data);
});

router.get('/match/:match_id', function(req, res)
{
    var data = collectTemplatingData(req);
    data["match_id"] = req.params.match_id;
    res.render("pages/match.ejs", data);
});


exports.router = router;
