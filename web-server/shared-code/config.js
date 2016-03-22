var sensitive = require("./sensitive_config.js");

if(process.env.VERSION === "DEV")
    exports.database_host   = "POSTGRES_IP";
else    
    exports.database_host   = "wisdota.com";

exports.database_auth   = "wisdota:"+sensitive.database_pw;

exports.files           = "/files";
exports.shared          = "/shared";

exports.steam_api_key   = "F1C8B59D43BAC59F6B648FD0D217B974";//"738D637E98D73D27B9802CA833784D7F";

exports.start_account = 0;
exports.start_i = 0;

