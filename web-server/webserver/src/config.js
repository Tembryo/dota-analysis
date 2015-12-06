var sensitive = require("./sensitive_config.js");
var host = process.env.VIRTUAL_HOST.split(",")[0];
exports.host            = host;
exports.database_host   = "DATABASE_IP:42200";
exports.files           = "/files";
exports.storage         = "/storage";
exports.shared          = "/shared";

exports.port            = process.env.VIRTUAL_PORT;
exports.steam_realm   = "http://"+host+":80/";

exports.steam_api_key   = "738D637E98D73D27B9802CA833784D7F";

exports.gmail_user = "quirin.fischer@tembryo.com";
exports.gmail_password = sensitive.gmail_pw;
