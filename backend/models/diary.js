const mongoose = require('mongoose');

const DiarySchema = new mongoose.Schema({
    imagePath: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    userContext: {
        type: String,
        trim: true
    },
    aiGeneratedContent: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    deviceId:
    {
        type: String,
        required: true
    },
}, {
    timestamps: true
});

// Index giúp Timeline sắp xếp cực nhanh
DiarySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Diary', DiarySchema);