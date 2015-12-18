var waterfall = require('async-waterfall');

var mongoose    = require("mongoose");
mongoose.connect("mongodb://172.17.0.4:42200/wisdota"); // connect to our database

var pg = require('pg');
var connectionParameters = 'postgres://wisdota:the-database-elephant@172.17.0.2/wisdota';

var User = require("./models/user.js"),
    Match = require("./models/match.js"),
    ReplayFile = require("./models/replay-file.js"),
    VerificationAction = require("./models/verification-action.js");
 
function owshit()
{
    console.log("hm");
}

locals = {};
waterfall(
    [
        pg.connect.bind(pg, connectionParameters),
        function(client, done, callback)
        {
            locals.client = client;
            locals.done = done;
            callback(null);
        },
        function(callback)
        {
            locals.client.on("error", owshit);
            locals.client.query("BEGIN;",[]);
            locals.client.query("CREATE TABLE IF NOT EXISTS Users(id bigserial PRIMARY KEY, name text, steam_object json, steam_identifier text, email text);\
                 CREATE TABLE IF NOT EXISTS UserStatusTypes(id smallserial PRIMARY KEY, label text);\
                 CREATE TABLE IF NOT EXISTS UserStatuses(user_id bigint REFERENCES Users(id), statustype_id smallint REFERENCES UserStatusTypes(id), expiry_date timestamp, PRIMARY KEY(user_id, statustype_id));\
                 CREATE TABLE IF NOT EXISTS VerificationActionTypes(id smallserial PRIMARY KEY, label text);\
                 CREATE TABLE IF NOT EXISTS VerificationActions(id bigserial PRIMARY KEY, actiontype_id int REFERENCES VerificationActionTypes(id), args json, code text);\
                 CREATE TABLE IF NOT EXISTS ProcessingStatuses(id smallserial PRIMARY KEY, label text);\
                 CREATE TABLE IF NOT EXISTS ReplayFiles(id bigserial PRIMARY KEY, file text, upload_filename text, processing_status smallint REFERENCES ProcessingStatuses(id), match_id bigint, uploader_id bigint REFERENCES Users(id));\
                 CREATE TABLE IF NOT EXISTS Matches(id bigserial PRIMARY KEY, label text, file text, header_file text, replayfile_id bigint REFERENCES ReplayFiles(id));\
                 CREATE TABLE IF NOT EXISTS EventTypes(id smallserial PRIMARY KEY, label text);\
                 CREATE TABLE IF NOT EXISTS Events(id bigserial PRIMARY KEY, event_type smallint REFERENCES EventTypes(id), time timestamp);\
                CREATE TABLE IF NOT EXISTS EventPropertyNames(id smallserial PRIMARY KEY, label text);\
                 CREATE TABLE IF NOT EXISTS EventProperties(event_id bigint REFERENCES Events(id), property_name smallint REFERENCES EventPropertyNames(id), value json, PRIMARY KEY(event_id, property_name));", []);
                locals.client.query("COMMIT;",[],callback);
        },
        function(result, callback)
        {   
            console.log("create OK", result);
            locals.client.on("error", owshit);
            locals.client.query("BEGIN;",[]);
            locals.client.query("INSERT INTO UserStatusTypes (label) SELECT x FROM unnest($1::text[]) x;",["{admin, verified, plus}"]);
            locals.client.query("INSERT INTO VerificationActionTypes (label) SELECT x FROM unnest($1::text[]) x;",["{SetEmail, ActivatePlus}"]);
            locals.client.query("INSERT INTO ProcessingStatuses (label) SELECT x FROM unnest($1::text[]) x;",["{uploaded, extracting, analysing, registered, failed}"]);
            locals.client.query("INSERT INTO EventTypes (label) SELECT x FROM unnest($1::text[]) x;",["{ViewPage, LogIn}"]);
            locals.client.query("INSERT INTO EventPropertyNames (label) SELECT x FROM unnest($1::text[]) x;",["{page, user}"]);
            locals.client.query("COMMIT;",[],callback);
        },
        function(result, callback)
        {
            console.log("consts OK", result);
            User.find({}, "", callback);
        },
        function(users, callback)
        {
            console.log("got users", users);
            locals.client.query("BEGIN;",[]);
            for(var user_i in users)
            {
                locals.client.query(
                    "INSERT INTO Users (name, steam_object, steam_identifier, email) VALUES($1, $2, $3, $4) RETURNING id, $5::text as beta_status;",
                    [users[user_i].name, JSON.stringify(users[user_i].steam_object), users[user_i].identifier, users[user_i].email, users[user_i].beta_status],
                    function(err, results)
                    {
                        if(err)console.log(err, results);
                        console.log(results);
                        var user = results.rows[0];
                        if(user.beta_status === "enabled")  
                            locals.client.query("INSERT INTO UserStatuses (user_id, statustype_id, expiry_date) SELECT $1, ust.id, infinity FROM UserStatusTypes ust WHERE ust.label=$2",[ user.id, "verified"]);
                    }
                );

                    
            }
            locals.client.query("COMMIT;",[],callback);
        },
        function(result, callback)
        {
            console.log("users OK", result);
            VerificationAction.find({}, "", callback);
        },
        function(vactions, callback)
        {
            console.log("got vactions", vactions);
            locals.client.query("BEGIN;",[]);
            for(var vaction_i in vactions)
            {
                locals.client.query("INSERT INTO VerificationActions (actiontype_id, args, code) VALUES($1, $2, $3);",[ 1, JSON.stringify(vactions[vaction_i].args), vactions[vaction_i].code ]);
            }
            locals.client.query("COMMIT;",[],callback);
        },
        function(result, callback)
        {
            console.log("vactions OK", result);
            ReplayFile.find({}, "", callback);
        },
        function(replay_files, callback)
        {
            console.log("got replayfiles", replay_files);
            locals.client.query("BEGIN;",[]);
            for(var replay_file_i in replay_files)
            {
                locals.client.query("INSERT INTO ReplayFiles (file, upload_filename, processing_status, uploader_id, match_id) SELECT $1, $2, ProcessingStatuses.id, Users.id, $5 FROM ProcessingStatuses, Users WHERE ProcessingStatuses.label=$3 AND Users.steam_identifier=$4;",[ replay_files[replay_file_i].file, replay_files[replay_file_i].upload_name, replay_files[replay_file_i].status, replay_files[replay_file_i].uploader_identifier, replay_files[replay_file_i].match_id]);
            }
            locals.client.query("COMMIT;",[],callback);
        },
        function(result, callback)
        {
            console.log("replay_files OK", result);
            Match.find({}, "", callback);
        },
        function(matches, callback)
        {
            console.log("got matches", matches);
            locals.client.query("BEGIN;",[]);
            for(var match_i in matches)
            {
                locals.client.query("INSERT INTO Matches (id, label, file, header_file, replayfile_id) SELECT $1, $2, $3, $4, ReplayFiles.id FROM ReplayFiles WHERE ReplayFiles.match_id=$1;",[ matches[match_i].id, matches[match_i].label, matches[match_i].file, matches[match_i].header_file]);
            }
            locals.client.query("COMMIT;",[],callback);
        }
    ],
    function(err, result)
    {
        if(err)
            console.log("error:", err);
        else
            console.log("OK: ", result);
        locals.client.end();
        locals.done();
        mongoose.disconnect();
    }
);
