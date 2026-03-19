const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    deviceId: { type: String, required: true },
    endpoint: { type: String, required: true },
    keys: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now }
});

subscriptionSchema.index({ deviceId: 1 }, { unique: true });
module.exports = mongoose.model('Subscription', subscriptionSchema);