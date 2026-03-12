const chatSchema = new mongoose.Schema({
    deviceId: { type: String, required: true },
    role: { type: String, enum: ['user', 'ai'], required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

chatSchema.index({ deviceId: 1, createdAt: 1 });
const Chat = mongoose.model('Chat', chatSchema);