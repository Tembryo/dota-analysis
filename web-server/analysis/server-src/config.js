var sensitive = require("./sensitive_config.js");
exports.database_host   = "POSTGRES_IP";
exports.database_auth   = "wisdota:"+sensitive.database_pw;

