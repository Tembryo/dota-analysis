var mongoose     = require('mongoose');

var UserSchema   = new mongoose.Schema({
    name: String,
    steam_object: mongoose.Schema.Types.Mixed,
    identifier: String,
    email: String,
    beta_status: {type: String, default: "disabled"}
});

module.exports = mongoose.model('User', UserSchema);
