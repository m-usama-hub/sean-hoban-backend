const mongoose  = require('mongoose');

const supportSchema = new mongoose.Schema({
    contact: String,
    email: String,
});

const supportModel = mongoose.model('Support', supportSchema);

module.exports = supportModel