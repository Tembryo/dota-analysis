var mongoose     = require('mongoose');

var MatchSchema   = new mongoose.Schema({
    id: Number,
    label: String,
    replay_file: String,
    parsing_status: String,
    parsed: String
});

module.exports = mongoose.model('Match', MatchSchema);
