const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

// MỚI: Thêm các thư viện Cloudinary
const cloudinary = require('cloudinary').v2;
const app = express();
const BACKEND_URL = "https://backend-visual-memoir-pwa.onrender.com/api/diaries";

// 1. CẤU HÌNH CLOUDINARY
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. MIDDLEWARE
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Trang chủ để test
app.get('/', (req, res) => {
    res.send('🚀 Visual Memoir API with Cloudinary is Live!');
});

// 3. KẾT NỐI DATABASE
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI)
    .then(() => console.log("✅ Kết nối MongoDB thành công"))
    .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));

const diarySchema = new mongoose.Schema({
    imagePath: String,
    publicId: String,
    content: String,
    userContext: String,
    deviceId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

diarySchema.index({ deviceId: 1, createdAt: -1 });
const Diary = mongoose.model('Diary', diarySchema);

// 4. LOGIC GEMINI AI (Giữ nguyên của Tân)
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/analyze', async (req, res) => {

    try {
        const { image, context } = req.body;
        if (!image) return res.status(400).json({ error: "Thiếu dữ liệu ảnh" });
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


app.post('/api/chat', async (req, res) => {
    try {
        const { message, deviceId } = req.body;

        // 1. Lấy lịch sử nhật ký (nên lấy content và cả ngày tháng)
        const history = await Diary.find({ deviceId })
            .sort({ createdAt: -1 })
            .limit(10);

        const contextString = history.length > 0
            ? history.map(d => `- [${d.createdAt.toLocaleDateString('vi-VN')}]: ${d.content}`).join('\n')
            : "Người dùng chưa có kỷ niệm nào.";

        // 2. Định nghĩa "tính cách" cho AI
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Đổi sang bản ổn định hơn

        const systemPrompt = `
Bạn là một người bạn thực tế, điềm đạm và tinh tế của tôi.
PHONG CÁCH PHẢN HỒI:
1. ĐI THẲNG VẤN ĐỀ: Không chào hỏi rườm rà, không cảm thán quá mức (ví dụ: "Ôi thật tuyệt", "Mình rất tiếc").
2. PHÂN TÍCH & KHUYÊN: Dựa trên thông tin từ nhật ký và tin nhắn hiện tại, đưa ra nhận xét hoặc lời khuyên có giá trị thực tế.
3. TIẾT CHẾ ĐẶT CÂU HỎI: Chỉ đặt câu hỏi nếu thực sự cần thêm thông tin để giải quyết vấn đề. Đừng đặt câu hỏi xã giao ở cuối mỗi câu.
4. NGÔN NGỮ: Tiếng Việt tự nhiên, súc tích, xưng "mình" - "bạn". 

NỘI DUNG TÂM SỰ: "${message}"
        `;

        const result = await model.generateContent(systemPrompt);
        const responseText = result.response.text().trim();

        res.json({ reply: responseText });
    } catch (error) {
        console.error("Lỗi Chat AI:", error);
        res.status(500).json({ reply: "Mình đang hơi 'lag' một tí, đợi mình tí nhé!" });
    }
});

//
app.get('/api/diaries', async (req, res) => {
    try {
        const { deviceId } = req.query;
        if (!deviceId) return res.status(400).json({ error: "Thiếu deviceId" });

        const diaries = await Diary.find({ deviceId }).sort({ createdAt: -1 });
        res.json(diaries);
    } catch (error) {
        res.status(500).json({ error: "Lỗi lấy dữ liệu" });
    }
});

// Route lưu nhật kí
app.post('/api/diaries', async (req, res) => {
    try {
        const { image, content, userContext, deviceId } = req.body;

        const uploadResponse = await cloudinary.uploader.upload(image, {
            folder: `visual_memoir/${deviceId}`,
            resource_type: "image"
        });

        const newDiary = new Diary({
            imagePath: uploadResponse.secure_url,
            content,
            userContext,
            deviceId,
            publicId: uploadResponse.public_id
        });

        await newDiary.save();
        res.status(201).json(newDiary);
    } catch (error) {
        console.error(error);
        res.status(500).send("Lỗi upload");
    }
});

// Route xóa nhật kí
app.delete('/api/diaries/:id', async (req, res) => {
    try {
        const diary = await Diary.findById(req.params.id);
        if (!diary) return res.status(404).json({ error: "Không tìm thấy kỷ niệm" });

        // Xóa trên Cloudinary trước
        if (diary.publicId) {
            const cloudRes = await cloudinary.uploader.destroy(diary.publicId);
            if (cloudRes.result !== 'ok') {
                console.warn(`Cloudinary xóa không thành công: ${diary.publicId}`);
            }
        }

        // Luôn xóa trong DB sau khi đã thử xóa trên Cloud
        await Diary.findByIdAndDelete(req.params.id);

        res.json({ message: "Xóa thành công kỷ niệm" });
    } catch (e) {
        res.status(500).json({ error: "Lỗi hệ thống khi xóa" });
    }
});

app.get('/api/chat/history', async (req, res) => {
    try {
        const { deviceId } = req.query;
        const history = await Chat.find({ deviceId }).sort({ createdAt: 1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: "Lỗi lấy lịch sử chat" });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message, deviceId } = req.body;

        // 1. Lưu tin nhắn của người dùng
        const userMsg = new Chat({ deviceId, role: 'user', text: message });
        await userMsg.save();

        // (Giữ nguyên logic lấy Diary history và gọi Gemini ở đây...)
        // const result = await model.generateContent(systemPrompt);
        const aiReply = result.response.text().trim();

        // 2. Lưu tin nhắn của AI
        const aiMsg = new Chat({ deviceId, role: 'ai', text: aiReply });
        await aiMsg.save();

        res.json({ reply: aiReply });
    } catch (error) {
        res.status(500).json({ error: "Lỗi" });
    }
});

// 6. GIỮ SERVER LUÔN "THỨC" TRÊN RENDER.COM
setInterval(() => {
    axios.get(BACKEND_URL)
        .then(() => console.log("Self-ping: Server is awake!"))
        .catch((err) => console.error("Self-ping error:", err.message));
}, 10 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Cloudinary Server running on port ${PORT}`);
});