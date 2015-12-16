var mongoose     = require('mongoose');

var MatchSchema   = new mongoose.Schema({
    id: Number,
    label: String,
    file: String,
    header_file: String,
    original_file: String,
    analysis_time: Date
});

module.exports = mongoose.model('Match', MatchSchema);
