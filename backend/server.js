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

const subscriptionSchema = new mongoose.Schema({
    deviceId: { type: String, required: true },
    endpoint: { type: String, required: true },
    keys: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now }
});

subscriptionSchema.index({ deviceId: 1 }, { unique: true });
const Subscription = mongoose.model('Subscription', subscriptionSchema);

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

// server.js - Phần Notification
const webpush = require('web-push');
const cron = require('node-cron');
const moment = require('moment-timezone');

// Cấu hình VAPID
webpush.setVapidDetails(
    process.env.VAPID_MAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// API nhận Subscription từ Frontend
app.post('/api/subscribe', async (req, res) => {
    try {
        const { subscription, deviceId } = req.body;
        if (!subscription || !deviceId) return res.status(400).send("Thiếu dữ liệu");
        await Subscription.findOneAndUpdate(
            { deviceId },
            {
                endpoint: subscription.endpoint,
                keys: subscription.keys,
                deviceId
            },
            { upsert: true, new: true }
        );

        res.status(201).json({ message: "Đã lưu đăng ký thông báo!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route để test thông báo ngay lập tức
app.post('/api/test-push', async (req, res) => {
    const { deviceId } = req.body;
    if (!deviceId) return res.status(400).json({ error: "Thiếu deviceId để test" });

    try {
        const sub = await Subscription.findOne({ deviceId });
        if (!sub) return res.status(404).json({ error: "Thiết bị này chưa đăng ký nhận thông báo (Subscription not found)" });

        const payload = JSON.stringify({
            title: "🚀 Test Thông Báo Thành Công!",
            body: "Chào Tân, đây là thông báo thử nghiệm từ hệ thống Visual Memoir AI của bạn.",
            url: "/"
        });

        await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: sub.keys
        }, payload);

        res.json({ success: true, message: "Đã gửi lệnh push thành công!" });
    } catch (err) {
        console.error("Lỗi khi test push:", err);
        res.status(500).json({ error: err.message });
    }
});

cron.schedule('0 19 * * *', async () => {
    console.log("⏰ [Cron] Đang quét nhắc nhở...");
    try {
        const todayVN = moment.tz("Asia/Ho_Chi_Minh").startOf('day').toDate();
        const writtenDeviceIds = await Diary.distinct('deviceId', {
            createdAt: { $gte: todayVN }
        });
        const pendingSubs = await Subscription.find({
            deviceId: { $nin: writtenDeviceIds }
        });
        const payload = JSON.stringify({
            title: "✨ Kỷ niệm đang chờ bạn",
            body: "Hôm nay bạn chưa ghi lại khoảnh khắc nào, đừng quên nhé!!!📝",
            url: "/"
        });

        pendingSubs.forEach(sub => {
            const pushConfig = {
                endpoint: sub.endpoint,
                keys: sub.keys
            };

            webpush.sendNotification(pushConfig, payload).catch(err => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    Subscription.deleteOne({ _id: sub._id }).exec();
                    console.log(`🗑️ Đã xóa sub hết hạn: ${sub.deviceId}`);
                }
            });
        });
        console.log(`✅ Đã gửi cho ${pendingSubs.length} thiết bị.`);
    } catch (err) {
        console.error("Lỗi Cron:", err);
    }
}, {
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