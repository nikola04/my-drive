const { Schema, model } = require('mongoose');

const userSchema = new Schema({
    username: String,
    email: String,
    hash: String,
    icon: String,
}, {timestamps: true});

const user = model('users', userSchema);

module.exports = user