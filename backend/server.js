const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

// MỚI: Thêm các thư viện Cloudinary
const cloudinary = require('cloudinary').v2;
const app = express();
const BACKEND_URL = "https://backend-visual-memoir-pwa.onrender.com/";

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
// Route tạo mới nhật kí
app.post('/api/analyze', async (req, res) => {
    try {
        const { image, context } = req.body;
        if (!image) return res.status(400).json({ error: "Thiếu dữ liệu ảnh" });

        const base64Data = image.includes(',') ? image.split(',')[1] : image;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // --- PROMPT ĐƯỢC NÂNG CẤP ---
        const systemInstruction = `Bạn là một người viết nhật ký đầy cảm xúc, đang ghi lại những trải nghiệm cá nhân của chính mình.
Nhiệm vụ: Viết DUY NHẤT một câu hoặc một đoạn nhật ký tiếng Việt ngắn gọn (khoảng 15-30 từ), sâu sắc.

Yêu cầu nghiêm ngặt:
1. Xưng hô: Sử dụng "mình" hoặc các ngôi nhân xưng mang tính cá nhân (ví dụ: "Mình thấy...", "Chuyến đi này...").
2. Địa danh & Không gian: Quan sát kỹ các chi tiết (kiến trúc, phong cảnh, thời tiết, biển báo). Nếu nhận diện được địa điểm, hãy lồng ghép khéo léo vào câu văn. Nếu không rõ địa điểm, hãy miêu tả không khí lúc đó.
3. Phong cách: Tự nhiên, ấm áp, như đang tâm sự; TUYỆT ĐỐI KHÔNG dùng các từ máy móc như "Trong ảnh", "Bức hình này", "Có thể thấy".
4. Đồng điệu: Tập trung vào cảm xúc và phải "bắt đúng tần số" tâm trạng mà mình cung cấp.
5. Trang trí: Thêm 1-2 emoji thật phù hợp ở cuối câu để lưu giữ trọn vẹn cảm xúc.`;

        // Nâng cấp cách xử lý Context để AI nhạy cảm hơn khi người dùng im lặng
        const userContextReq = context && context.trim() !== ""
            ? `Bối cảnh/Tâm trạng của mình lúc này: "${context}". Hãy viết dựa trên đúng cảm xúc này.`
            : `Mình không để lại lời nhắn nào. Hãy tự cảm nhận ánh sáng, màu sắc và không khí trong khoảnh khắc này để đoán xem mình đang vui vẻ, suy tư hay bình yên, và viết thay tiếng lòng của mình.`;

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

// Route lấy tất cả nhật kí
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

// Route cập nhật nội dung nhật ký
app.put('/api/diaries/:id', async (req, res) => {
    try {
        const { content, userContext } = req.body;
        const updatedDiary = await Diary.findByIdAndUpdate(
            req.params.id,
            { content, userContext },
            { new: true }
        );
        res.json(updatedDiary);
    } catch (error) {
        res.status(500).json({ error: "Lỗi cập nhật" });
    }
});

const webpush = require('web-push');
const cron = require('node-cron');
const moment = require('moment-timezone');

// 1. Cấu hình Web Push
webpush.setVapidDetails(
    process.env.VAPID_MAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// 2. Tạo DB lưu "Địa chỉ" nhận thông báo của điện thoại
const subscriptionSchema = new mongoose.Schema({
    deviceId: String,
    endpoint: String,
    keys: mongoose.Schema.Types.Mixed,
});
const Subscription = mongoose.model('Subscription', subscriptionSchema);

// 3. API để điện thoại gửi "Địa chỉ" lên Server
app.post('/api/subscribe', async (req, res) => {
    const { subscription, deviceId } = req.body;

    // Xóa địa chỉ cũ nếu có, lưu địa chỉ mới
    await Subscription.deleteMany({ deviceId });
    await new Subscription({ ...subscription, deviceId }).save();

    res.status(201).json({ message: "Đã đăng ký nhận thông báo ngầm!" });
});

// 4. Đặt báo thức chạy ngầm trên Server (Đúng 19:00 mỗi ngày)
cron.schedule('* 19 * * *', async () => {
    console.log("⏰ Bắt đầu kiểm tra nhắc nhở lúc 19:00...");

    // Lấy 0h00 của ngày hôm nay theo giờ VN
    const vnOffset = 7 * 60 * 60 * 1000;
    const nowVN = new Date(new Date().getTime() + vnOffset);
    const startOfTodayVN = new Date(nowVN.getUTCFullYear(), nowVN.getUTCMonth(), nowVN.getUTCDate());
    const startOfTodayUTC = new Date(startOfTodayVN.getTime() - vnOffset);

    // Lấy tất cả thiết bị đã đăng ký
    const subs = await Subscription.find();

    for (let sub of subs) {
        // Kiểm tra xem thiết bị này hôm nay đã viết nhật ký chưa
        const count = await Diary.countDocuments({
            deviceId: sub.deviceId,
            createdAt: { $gte: startOfTodayUTC }
        });

        if (count === 0) {
            // Nếu chưa viết, bắn thông báo thẳng xuống điện thoại!
            const payload = JSON.stringify({
                title: "✨ Kỷ niệm đang chờ bạn",
                body: "Hôm nay bạn chưa ghi lại gì cả, dành ít phút nhé! 📝",
                url: "/"
            });

            try {
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: sub.keys
                }, payload);
                console.log(`Đã gửi thông báo cho ${sub.deviceId}`);
            } catch (error) {
                console.error("Lỗi gửi push (có thể người dùng đã hủy quyền):", error);
                if (error.statusCode === 410) {
                    await Subscription.findByIdAndDelete(sub._id); // Xóa nếu thiết bị không còn hợp lệ
                }
            }
        }
    }
},
    {
        scheduled: true,
        timezone: "Asia/Ho_Chi_Minh"
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