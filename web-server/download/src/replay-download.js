var async       = require("async"),
    fs          = require('fs'),
    bz2         = require('unbzip2-stream'),
    request     = require('request');

var config          = require("./config.js");

var downloadAndDecompress = function(url, dest, cb) {
    //TODO clean this up
    // errors dont get propagated, an error in the decoder will appear after the the file got closed -> after final callback was written
    //probably  wait for both cbs, then return?


    var file = fs.createWriteStream(dest);
    var sendReq = request.get(url);
    // verify response code
    sendReq.on('response', function(response) {
        if (response.statusCode !== 200) {
            return cb('Response status was ' + response.statusCode);
        }
    });

    // check for request errors
    sendReq.on('error', function (err) {
        console.log("sendreq got error");
        fs.unlink(dest);

        if (cb) {
            return cb("http req error: "+err);
        }
    });

    // check for request errors
    sendReq.on('end', function (err) {
        console.log("sendreq got end");
    });
    // check for request errors
    //sendReq.on('data', function (err) {
    //    console.log("sendreq got data");
    //});

    var decoder = bz2();
    decoder.on('error', function(err) { // Handle errors
        console.log("decoder got error");
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        
        if (cb) {
            return cb(err.message);
        }
    });
    // check for request errors
    /*decoder.on('data', function (err) {
        console.log("decoder got data");
    });*/
    // check for request errors
    decoder.on('end', function (err) {
        console.log("decoder got end");
    });


    try
    {
        sendReq.pipe(decoder).pipe(file);
    }
    catch(e)
    {
        cb(e);
    }
    
    file.on('finish', function() {
        console.log("finished writing, closing file", new Date());
        file.close(cb);  // close() is async, call cb after close completes.
    });


    file.on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)

        if (cb) {
            return cb(err.message);
        }
    });
};

var downloadFile = function(url, dest, cb) {
    //TODO clean this up
    // errors dont get propagated, an error in the decoder will appear after the the file got closed -> after final callback was written
    //probably  wait for both cbs, then return?


    var file = fs.createWriteStream(dest);
    var sendReq = request.get(url);
    // verify response code
    sendReq.on('response', function(response) {
        if (response.statusCode !== 200) {
            return cb('Response status was ' + response.statusCode);
        }
    });

    // check for request errors
    sendReq.on('error', function (err) {
        console.log("sendreq got error");
        fs.unlink(dest);

        if (cb) {
            return cb("http req error: "+err);
        }
    });

    // check for request errors
    sendReq.on('end', function (err) {
        console.log("sendreq got end");
    });

    try
    {
        sendReq.pipe(file);
    }
    catch(e)
    {
        cb(e);
    }
    
    file.on('finish', function() {
        console.log("finished writing, closing file", new Date());
        file.close(cb);  // close() is async, call cb after close completes.
    });


    file.on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)

        if (cb) {
            return cb(err.message);
        }
    });
};




//Full download procedure of a match starting from the match ID
//Retrieves salt using a given Dota2 client, stores the downloaded/decompressed replay 
function downloadMatch(replay_data, target, callback)
{   
    var details_timeout = 2000;
    var timeout_status = 0; 
    var file = target+replay_data.match_id+".dem.bz2"
    var replay_address = "http://replay"+replay_data.cluster+".valve.net/570/"+replay_data.match_id+"_"+replay_data.replay_salt+".dem.bz2";

    console.log("Downloading from", replay_address, " into ", file, new Date());
    //downloadAndDecompress(replay_address, file, function(){callback(null, file);});

    downloadFile(replay_address, file, function(){callback(null, file);});
}



exports.downloadMatch = downloadMatch;
