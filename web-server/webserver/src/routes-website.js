var express     = require('express');

var router = express.Router();

router.use(function(req, res, next) {
    console.log('WEBSITE is doing something.');
    next(); // make sure we go to the next routes and don't stop here
});

router.get('/', function(req, res) {
    
    res.json(req.user);   
});

exports.router = router;
