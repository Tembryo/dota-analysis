// analysis - server.js
var child_process = require("child_process");

var config          = require("./config.js"),
    database          = require("./database.js");

var check_interval = 1000;

setInterval(checkJobs, 1000);

ReplayFile = require("./models/replay-file.js");
Match = require("./models/match.js");

function checkJobs()
{
    console.log("just checking");
    ReplayFile.find({ "status": "uploaded" }, function (err, docs) {
        for(var file_i in docs)
        {
            var file = docs[file_i];
            file.status = "processing";
            file.save(function(err)
                {
                    if(err)
                        console.log(err);
                    else
                    {
                        processReplay(file);
                    }
                });
        }
    });
}

function processReplay(replay_file)
{
    child_process.execFile("java", ["-jar", "/extractor/extractor.jar", config.shared+replay_file.file, config.storage+"/"], function (error, stdout, stderr) 
        {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null)
            {
                console.log('exec error: ' + error);
                replay_file.status = "failed";
                replay_file.save(function(err)
                {
                    if(err)
                        console.log(err);
                    else
                    {
                        console.log("put file as failed!");
                    }
                });
            }

            replay_file.status = "extracted";
            replay_file.save(function(err)
            {
                if(err)
                    console.log(err);
                else
                {
                    console.log("file fully extracted");
                    var match_id = parseInt(stdout);
                    var match_dir = config.storage+"/"+match_id;
                    var analysis_file = config.shared+"/matches/"+match_id+".json";
                    var header_file = config.shared+"/match_headers/"+match_id+".json";
                    child_process.execFile("python", ["/analysis/analysis.py", match_id, match_dir, analysis_file, header_file], function (error, stdout, stderr) 
                        {
                            console.log('pystdout: ' + stdout);
                            console.log('pystderr: ' + stderr);
                            if (error !== null)
                            {
                                console.log('pyexec error: ' + error);
                                replay_file.status = "failed";
                                replay_file.save(function(err)
                                {
                                    if(err)
                                        console.log(err);
                                    else
                                    {
                                        console.log("put file as failed!");
                                    }
                                });
                            }
                            replay_file.status = "analysed";
                            replay_file.save(function(err)
                            {
                                if(err)
                                    console.log(err);
                                else
                                {
                                    console.log("put file as analysed!");
                                    var match = new Match({
                                            "id": match_id,
                                            "label": "--",
                                            "replay_file": analysis_file,
                                            "header_file": header_file});
                                    match.save(function(err)
                                    {
                                        if(err)
                                            console.log(err);
                                        else
                                        {
                                            console.log("registered match");
                                            replay_file.status = "registered";
                                            replay_file.save(function(err)
                                            {
                                                if(err)
                                                    console.log(err);
                                                else
                                                {
                                                    console.log("fin~");
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    );
                }
            });


        }
    );

}
