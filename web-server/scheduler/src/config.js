var sensitive = require("./sensitive_config.js");
exports.database_host   = "POSTGRES_IP";
exports.database_auth   = "wisdota:"+sensitive.database_pw;

exports.files           = "/files";
exports.storage         = "/storage";
exports.shared          = "/shared";

exports.steam_user = "wisdota_dev";
exports.steam_pw   = sensitive.steam_pw;

