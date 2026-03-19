const express = require('express');
const router = express.Router();
const Diary = require('../models/diarySchema');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cloudinary = require('cloudinary').v2;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Route phân tích ảnh và tạo nội dung nhật ký
router.post('/analyze', async (req, res) => {
    try {
        const { image, context } = req.body;
        if (!image) return res.status(400).json({ error: "Thiếu dữ liệu ảnh" });

        const base64Data = image.includes(',') ? image.split(',')[1] : image;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const systemInstruction = `Bạn là một người viết nhật ký đầy cảm xúc, đang ghi lại những trải nghiệm cá nhân của chính mình.
    Nhiệm vụ: Viết DUY NHẤT một câu hoặc một đoạn nhật ký tiếng Việt ngắn gọn (khoảng 15-30 từ), sâu sắc.

    Yêu cầu nghiêm ngặt:
    1. Xưng hô: Sử dụng "mình" hoặc các ngôi nhân xưng mang tính cá nhân (ví dụ: "Mình thấy...", "Chuyến đi này...").
    2. Địa danh & Không gian: Quan sát kỹ các chi tiết (kiến trúc, phong cảnh, thời tiết, biển báo). Nếu nhận diện được địa điểm, hãy lồng ghép khéo léo vào câu văn. Nếu không rõ địa điểm, hãy miêu tả không khí lúc đó.
    3. Phong cách: Tự nhiên, ấm áp, như đang tâm sự; TUYỆT ĐỐI KHÔNG dùng các từ máy móc như "Trong ảnh", "Bức hình này", "Có thể thấy".
    4. Đồng điệu: Tập trung vào cảm xúc và phải "bắt đúng tần số" tâm trạng mà mình cung cấp.
    5. Trang trí: Thêm 1-2 emoji thật phù hợp ở cuối câu để lưu giữ trọn vẹn cảm xúc.`;

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
router.get('/', async (req, res) => {
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
router.post('/', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
    try {
        const diary = await Diary.findById(req.params.id);
        if (!diary) return res.status(404).json({ error: "Không tìm thấy kỷ niệm" });

        if (diary.publicId) {
            const cloudRes = await cloudinary.uploader.destroy(diary.publicId);
            if (cloudRes.result !== 'ok') {
                console.warn(`Cloudinary xóa không thành công: ${diary.publicId}`);
            }
        }
        await Diary.findByIdAndDelete(req.params.id);

        res.json({ message: "Xóa thành công kỷ niệm" });
    } catch (e) {
        res.status(500).json({ error: "Lỗi hệ thống khi xóa" });
    }
});

// Route cập nhật nội dung nhật ký
router.put('/:id', async (req, res) => {
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

export default router;