DOCKERIZED = false;

if(DOCKERIZED)
{
    exports.host            = "localhost:80";
    exports.database_host   = "database:42200";
    exports.files           = "/files";
}
else
{
    exports.host            = "localhost:42000";
    exports.database_host   = "localhost:42200";
    exports.files           = "../../files/webserver";
}

exports.port            = 42000;
exports.steam_api_key   = "738D637E98D73D27B9802CA833784D7F";

