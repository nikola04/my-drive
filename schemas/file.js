const { Schema, model } = require('mongoose');

const fileSchema = new Schema({
    name: String, // Actual file name
    owner_id: Schema.ObjectId,
    parent: Schema.ObjectId,
    folder: Boolean,
    meta: {
        name: String, // Name that will user see
        size: Number,
        tags: [],
        updated: Date
    },
    deleted: {
        type: Boolean,
        default: false
    },
    uploadedAt: {
        type: Date,
        default: Date.now()
    }
});

const files = model('files', fileSchema);

module.exports = files