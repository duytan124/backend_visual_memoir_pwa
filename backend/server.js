const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// 1. CẤU HÌNH THƯ MỤC LƯU TRỮ
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 2. MIDDLEWARE
app.use(cors()); // Cho phép Web gọi API
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/photos', express.static(UPLOADS_DIR));

// 3. KẾT NỐI DATABASE
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/visual-memoir-pwa')
    .then(() => console.log("✅ Đã kết nối MongoDB PWA"))
    .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));

const Diary = mongoose.model('Diary', {
    imagePath: String,
    content: String,
    userContext: String,
    isFavorite: { type: Boolean, default: false }, // Mới: Thêm trạng thái yêu thích
    createdAt: { type: Date, default: Date.now }
});

// 4. LOGIC GEMINI AI
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/analyze', async (req, res) => {
    try {
        const { image, context } = req.body;
        if (!image || typeof image !== 'string') {
            return res.status(400).json({ error: "Invalid image format" });
        }

        const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "").replace(/\s/g, "");
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Hoặc gemini-2.0-flash

        const systemInstruction = `Bạn là một người viết nhật ký chuyên nghiệp, tinh tế. 
        Nhiệm vụ: Viết DUY NHẤT một câu nhật ký tiếng Việt sâu sắc.
        Yêu cầu: Không dùng 'Trong ảnh', không giải thích, dùng ngôn ngữ tự nhiên, ấm áp.`;

        const userContextReq = context && context.trim() !== ""
            ? `Dựa trên ý định của người dùng: "${context}".`
            : "Hãy tự cảm nhận bức ảnh theo cách tự nhiên nhất.";

        const finalInstruction = `${systemInstruction}\n${userContextReq}\nHãy nhìn vào hình ảnh và viết câu nhật ký đó ngay bây giờ.`;

        const result = await model.generateContent([
            finalInstruction,
            { inlineData: { data: cleanBase64, mimeType: "image/jpeg" } }
        ]);

        const response = await result.response;
        res.json({ text: response.text().trim() });
    } catch (error) {
        console.error("Lỗi Gemini:", error);
        res.status(500).json({ error: error.message });
    }
});

// 5. ROUTES API

// Lấy danh sách nhật ký
app.get('/api/diaries', async (req, res) => {
    try {
        const diaries = await Diary.find().sort({ createdAt: -1 });

        // Tự động tạo URL ảnh dựa trên host đang chạy (localhost hoặc domain thật)
        const protocol = req.protocol;
        const host = req.get('host');

        const formattedDiaries = diaries.map(item => {
            const doc = item.toObject();
            if (doc.imagePath) {
                doc.imagePath = `${protocol}://${host}/photos/${doc.imagePath}`;
            }
            return doc;
        });
        res.json(formattedDiaries);
    } catch (error) {
        res.status(500).json({ error: "Lỗi lấy dữ liệu" });
    }
});

// Lưu nhật ký mới
app.post('/api/diaries', async (req, res) => {
    try {
        const { image, content, userContext } = req.body;
        let fileName = "";

        if (image && image.startsWith('data:image')) {
            fileName = `diary_${Date.now()}.jpg`;
            const base64Data = image.split(',')[1];
            fs.writeFileSync(path.join(UPLOADS_DIR, fileName), base64Data, 'base64');
        }

        const item = new Diary({
            imagePath: fileName,
            content: content || "",
            userContext: userContext || ""
        });

        await item.save();
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: "Lỗi lưu nhật ký" });
    }
});

// THÊM MỚI: Toggle trạng thái yêu thích (Thả tim)
app.patch('/api/diaries/:id/toggle-favorite', async (req, res) => {
    try {
        const diary = await Diary.findById(req.params.id);
        if (!diary) return res.status(404).json({ error: "Không tìm thấy nhật ký" });

        diary.isFavorite = !diary.isFavorite;
        await diary.save();
        res.json(diary);
    } catch (error) {
        res.status(500).json({ error: "Lỗi khi cập nhật yêu thích" });
    }
});

// Xóa nhật ký
app.delete('/api/diaries/:id', async (req, res) => {
    try {
        const diary = await Diary.findByIdAndDelete(req.params.id);
        if (diary && diary.imagePath) {
            const filePath = path.join(UPLOADS_DIR, diary.imagePath);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        res.json({ message: "Đã xóa thành công" });
    } catch (error) {
        res.status(500).json({ error: "Lỗi xóa" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server PWA đang lắng nghe tại port ${PORT}`);
});