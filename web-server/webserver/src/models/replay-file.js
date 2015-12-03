var mongoose     = require('mongoose');

var ReplayFileSchema   = new mongoose.Schema({
    identifier: String,
    file: String,
    status: String,
});

module.exports = mongoose.model('Replayfile', ReplayFileSchema);
