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


router.get('/results/:result_id', function(req, res)
{
    var data = collectTemplatingData(req);
    res.render("pages/result.ejs", data);
});

router.get('/user', function(req, res)
{
    var data = collectTemplatingData(req);
    res.render("pages/user.ejs", data);
});


exports.router = router;
