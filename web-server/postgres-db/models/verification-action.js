var mongoose     = require('mongoose');

var VerificationActionSchema   = new mongoose.Schema({
    action: String,
    args: mongoose.Schema.Types.Mixed,
    code: String
});

module.exports = mongoose.model('VerificationAction', VerificationActionSchema);
