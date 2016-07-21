var fs      = require('fs');
var gcloud  = require('gcloud');

var config  = require("./config.js");
    logging = require("/shared-code/logging.js")("storage-lib");

// Authenticating on a per-API-basis. You don't need to do this if you auth on a
// global basis (see Authentication section above).
if(process.env.VERSION === "DEV")
{
    var gcs = gcloud.storage({
      projectId: 'wisdota-dev-project',
      keyFilename: __dirname+'/Wisdota-Dev-820d99a224a4.json'
    });

    var bucket = gcs.bucket('wisdota-dev-storage');

}
else    
{
    var gcs = gcloud.storage({
      projectId: 'wisdota-main',
      keyFilename: __dirname+'/Wisdota-d2340f642e7f.json'
    });

    var bucket = gcs.bucket('wisdota-storage');

}


function retrieveFile(filename, callback)
{
    //catch old stuff
    if(filename.substring(0, config.shared.length) === config.shared)
    {
        logging.log("old stuff "+ filename);
        callback(null, filename);
        return;
    }

    var local_file= config.shared+"/"+filename;

    fs.access(local_file, fs.F_OK, function(err) {
        if (!err) {
            logging.log("using local file "+ filename);
            callback(null, local_file);
        } 
        else {
            logging.log("downloading stored file "+ filename);
            bucket.file(filename)
                .download({destination: local_file}, 
                    function(err)
                    {
                        if(err)
                            callback(err)
                        else
                            callback(null, local_file);
                    });
        }
    });
}

function storeFile(filename, callback)
{
    var local_file= config.shared+"/"+filename;
    bucket.upload(local_file, {"destination": filename}, 
        function(err)
        {
            if(err)
            {
                logging.log({"message": "store file failed", "filename": filename, "err": err});
                callback(err)
            }
            else
                callback(null, filename);
        });
}

exports.retrieve = retrieveFile;
exports.store = storeFile;