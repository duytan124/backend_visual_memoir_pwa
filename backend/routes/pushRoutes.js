import express from 'express';
const router = express.Router();
const Subscription = require('../models/subscriptionSchema');

router.post('/subscribe', async (req, res) => {
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
            { upsert: true, returnDocument: 'after' }
        );

        res.status(201).json({ message: "Đã lưu đăng ký thông báo!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;