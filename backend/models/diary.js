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
    // Lưu ngữ cảnh người dùng đã nhập (Input gốc)
    userContext: {
        type: String,
        trim: true
    },
    // Lưu lại bản gốc AI tạo ra (để đối chiếu sau khi người dùng sửa)
    aiGeneratedContent: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    mood: {
        type: String,
        enum: ['vui vẻ', 'nhẹ nhàng', 'suy tư', 'hào hứng', 'khác'],
        default: 'nhẹ nhàng'
    }
}, {
    timestamps: true
});

// Index giúp Timeline sắp xếp cực nhanh
DiarySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Diary', DiarySchema);