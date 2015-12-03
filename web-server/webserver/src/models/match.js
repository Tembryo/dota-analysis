var mongoose     = require('mongoose');

var MatchSchema   = new mongoose.Schema({
    id: Number,
    label: String,
    replay_file: String,
    header_file: String,
});

module.exports = mongoose.model('Match', MatchSchema);
