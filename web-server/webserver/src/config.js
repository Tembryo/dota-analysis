exports.host            = process.env.VIRTUAL_HOST;
exports.database_host   = "DATABASE_IP:42200";
exports.files           = "/files";
exports.storage         = "/storage";
exports.shared          = "/shared";

exports.port            = process.env.VIRTUAL_PORT;
if(process.env.DEV_VERSION === "true")
    exports.steam_realm   = "http://localhost:80/";
else
    exports.steam_realm   = "http://wisdota.com/";

exports.steam_api_key   = "738D637E98D73D27B9802CA833784D7F";

