const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const webpush = require('web-push');
const cron = require('node-cron');
const moment = require('moment-timezone');
const Diary = require('./models/diarySchema');
const Subscription = require('./models/subscriptionSchema');

const app = express();
const BACKEND_URL = "https://backend-visual-memoir-pwa.onrender.com/";

// 1. Cấu hình Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// 3. Kết nối Database
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Error:", err));

// 4. KHAI BÁO ROUTES
app.get('/', (req, res) => res.send('🚀 API is Live!')); // Giữ lại để self-ping
app.use('/api/diaries', require('./routes/diaryRoutes'));
app.use('/api/push', require('./routes/pushRoutes'));

// Cấu hình VAPID
webpush.setVapidDetails(
    process.env.VAPID_MAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

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
            body: "Đừng quên ghi lại những khoảnh khắc đáng nhớ cho ngày hôm nay nhé!",
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