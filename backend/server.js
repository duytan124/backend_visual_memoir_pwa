const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// MỚI: Thêm các thư viện Cloudinary
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const app = express();
const BACKEND_URL = "https://backend-visual-memoir-pwa.onrender.com/api/diaries";

// 1. CẤU HÌNH CLOUDINARY
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'visual-memoir', // Tên thư mục trên Cloudinary
        allowed_formats: ['jpg', 'png', 'jpeg'],
    },
});

const upload = multer({ storage: storage });

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
    imagePath: String, // Bây giờ sẽ lưu URL đầy đủ của Cloudinary
    content: String,
    userContext: String,
    isFavorite: { type: Boolean, default: false },
    tags: [String], // Lưu thêm tags cho đẹp như mockup
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

// 5. ROUTES API ĐÃ ĐIỀU CHỈNH
app.get('/api/diaries', async (req, res) => {
    try {
        const { deviceId } = req.query;
        if (!deviceId) return res.status(400).json({ error: "Thiếu deviceId" });

        const diaries = await Diary.find({ deviceId }).sort({ createdAt: -1 });
        // Không cần map protocol/host nữa vì imagePath đã là link Cloudinary hoàn chỉnh
        res.json(diaries);
    } catch (error) {
        res.status(500).json({ error: "Lỗi lấy dữ liệu" });
    }
});

// Route lưu bài viết (Hỗ trợ cả Base64 từ Tân)
app.post('/api/diaries', async (req, res) => {
    try {
        const { image, content, userContext, deviceId, tags } = req.body;

        if (!deviceId) {
            return res.status(400).json({ error: "Thiếu mã định danh thiết bị để lưu bài" });
        }

        let finalImagePath = "";

        if (image) {
            // Giữ nguyên cách Tân xử lý Base64
            // Upload trực tiếp chuỗi Base64 lên Cloudinary
            const uploadRes = await cloudinary.uploader.upload(image, {
                folder: 'visual-memoir', // Tên thư mục trên Cloudinary
                resource_type: 'image'
            });

            // Lấy URL an toàn (https) mà Cloudinary trả về
            finalImagePath = uploadRes.secure_url;
        }

        const item = new Diary({
            imagePath: finalImagePath, // Lưu URL đám mây, không lo bị xóa khi deploy
            content: content || "",
            userContext: userContext || "",
            deviceId: deviceId,
            tags: tags || [], // Lưu thêm tags từ AI
            isFavorite: true  // Mặc định cho vào mục yêu thích để test trang Favorite
        });

        await item.save();
        res.json(item);
    } catch (error) {
        console.error("Lỗi lưu DB hoặc Cloudinary:", error);
        res.status(500).json({ error: "Không thể lưu nhật ký" });
    }
});

// Route xóa (Xóa cả trên Cloudinary - Tùy chọn)
app.delete('/api/diaries/:id', async (req, res) => {
    try {
        await Diary.findByIdAndDelete(req.params.id);
        res.json({ message: "Xóa thành công" });
    } catch (e) { res.status(500).send(); }
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