var database    = require("./database.js");
    logging     = require("./logging.js")("settings-lib");

function getSettingData(setting, setting_callback)
{
    database.query("SELECT data FROM Settings WHERE name=$1;", [setting],
        function(err, results)
        {
            if(err)
            {
                logging.error({"message": "error getting setting"+setting, "err":err, "result": results});
                setting_callback(err, results);
            }
            else if(results.rowCount != 1)
            {
                logging.log({"message": "couldnt find setting"+setting, "err":err, "result": results});
                setting_callback(err, results);
            }
            else
                setting_callback(null, results.rows[0]["data"]);
        });
}

function getSetting(setting, setting_callback)
{
    getSettingData(setting, function(err, data)
    {
        if(err)
        {
            setting_callback(err, data); 
        }
        else if(! ("value" in data))
            setting_callback("no value in setting", data);
        else
            setting_callback(null, data["value"]);
    })
}

exports.getSetting = getSetting;
exports.getSettingData = getSettingData;