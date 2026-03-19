const mongoose = require('mongoose');

const diarySchema = new mongoose.Schema({
    imagePath: String,
    publicId: String,
    content: String,
    userContext: String,
    deviceId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

diarySchema.index({ deviceId: 1, createdAt: -1 });
module.exports = mongoose.model('Diary', diarySchema);