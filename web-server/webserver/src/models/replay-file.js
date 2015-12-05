var mongoose     = require('mongoose');

var ReplayFileSchema   = new mongoose.Schema({
    identifier: String,
    file: String,
    upload_name: String,
    status: String,
    match_id: {type:Number, default: -1},
    uploader_identifier: String,
    upload_time: {type:Date, default: Date.now}
});

module.exports = mongoose.model('Replayfile', ReplayFileSchema);
