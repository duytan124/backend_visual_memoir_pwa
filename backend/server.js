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
app.use(cors()); // Mở rộng cho mọi nguồn để tránh lỗi CORS khi dùng điện thoại
app.use(express.json({ limit: '20mb' })); // Nén ảnh rồi thì 20mb là quá đủ
app.use(express.urlencoded({ limit: '20mb', extended: true }));
app.use('/photos', express.static(UPLOADS_DIR));

// Trang chủ để test
app.get('/', (req, res) => {
    res.send('🚀 Visual Memoir API is Live and Running!');
});

// 3. KẾT NỐI DATABASE
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI)
    .then(() => console.log("✅ Kết nối MongoDB thành công"))
    .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));

// Định nghĩa cấu trúc (Schema)
const diarySchema = new mongoose.Schema({
    imagePath: String,
    content: String,
    userContext: String,
    isFavorite: { type: Boolean, default: false },
    deviceId: { type: String, required: true }, // Bắt buộc phải có để tách dữ liệu
    createdAt: { type: Date, default: Date.now }
});

// Tạo Index để khi tìm kiếm theo deviceId sẽ cực nhanh
diarySchema.index({ deviceId: 1, createdAt: -1 });

// Tạo Model từ Schema trên
const Diary = mongoose.model('Diary', diarySchema);

// 4. LOGIC GEMINI AI
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/analyze', async (req, res) => {
    try {
        const { image, context } = req.body;
        if (!image) return res.status(400).json({ error: "Thiếu dữ liệu ảnh" });

        // Tách lấy phần raw base64 chuẩn xác hơn
        const base64Data = image.includes(',') ? image.split(',')[1] : image;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const systemInstruction = `Bạn là một người viết nhật ký chuyên nghiệp, tinh tế. 
        Nhiệm vụ: Viết DUY NHẤT một câu nhật ký tiếng Việt sâu sắc. 
        Yêu cầu: Không dùng 'Trong ảnh', không giải thích, dùng ngôn ngữ tự nhiên, ấm áp.`;

        const userContextReq = context && context.trim() !== ""
            ? `Dựa trên ý định của người dùng: "${context}".`
            : "Hãy tự cảm nhận bức ảnh theo cách tự nhiên nhất.";

        const result = await model.generateContent([
            `${systemInstruction}\n${userContextReq}`,
            { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
        ]);

        const response = await result.response;
        res.json({ text: response.text().trim() });
    } catch (error) {
        console.error("Lỗi Gemini:", error);
        res.status(500).json({ error: "AI đang bận, thử lại sau nhé!" });
    }
});

// ROUTES API
app.get('/api/diaries', async (req, res) => {
    try {
        const { deviceId } = req.query;

        if (!deviceId) {
            return res.status(400).json({ error: "Thiếu mã định danh thiết bị (deviceId)" });
        }

        const diaries = await Diary.find({ deviceId }).sort({ createdAt: -1 });

        const host = req.get('host');
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;

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

app.post('/api/diaries', async (req, res) => {
    try {
        const { image, content, userContext, deviceId } = req.body;

        if (!deviceId) {
            return res.status(400).json({ error: "Thiếu mã định danh thiết bị để lưu bài" });
        }

        let fileName = "";
        if (image) {
            fileName = `diary_${Date.now()}.jpg`;
            const base64Data = image.includes(',') ? image.split(',')[1] : image;
            fs.writeFileSync(path.join(UPLOADS_DIR, fileName), base64Data, 'base64');
        }

        const item = new Diary({
            imagePath: fileName,
            content: content || "",
            userContext: userContext || "",
            deviceId: deviceId
        });

        await item.save();
        res.json(item);
    } catch (error) {
        console.error("Lỗi lưu DB:", error);
        res.status(500).json({ error: "Không thể lưu nhật ký vào Database" });
    }
});

app.delete('/api/diaries/:id', async (req, res) => {
    try {
        const diary = await Diary.findByIdAndDelete(req.params.id);
        if (diary?.imagePath) {
            const filePath = path.join(UPLOADS_DIR, diary.imagePath);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        res.json({ message: "Xóa thành công" });
    } catch (e) { res.status(500).send(); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại port ${PORT}`);
});