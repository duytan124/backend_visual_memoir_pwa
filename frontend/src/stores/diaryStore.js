import { defineStore } from 'pinia';
import axios from 'axios';

// THAY ĐỔI TẠI ĐÂY: Dùng URL deploy thực tế thay vì localhost
const BASE_URL = 'https://backend-visual-memoir-pwa.onrender.com';
const API_URL = `${BASE_URL}/api`;

const getOrCreateDeviceId = () => {
    let id = localStorage.getItem('visual_memoir_device_id');
    if (!id) {
        id = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now();
        localStorage.setItem('visual_memoir_device_id', id);
    }
    return id;
};

const DEVICE_ID = getOrCreateDeviceId();

export const useDiaryStore = defineStore('diary', {
    state: () => ({
        items: [],
        deviceId: DEVICE_ID,
        isAnalyzing: false,
    }),

    getters: {
        favoriteItems: (state) => state.items.filter(item => item.isFavorite),
    },

    actions: {
        /**
         * Lấy hoặc Tạo Device ID duy nhất cho trình duyệt/điện thoại này
         */
        getDeviceId() {
            let id = localStorage.getItem('visual_memoir_device_id');
            if (!id) {
                // Tạo một chuỗi ngẫu nhiên kết hợp với timestamp
                id = 'dev_' + Math.random().toString(36).substring(2, 11) + Date.now();
                localStorage.setItem('visual_memoir_device_id', id);
            }
            return id;
        },

        getDisplayPath(path) {
            if (!path) return 'https://via.placeholder.com/400x300?text=No+Image';
            if (path.startsWith('http') || path.startsWith('data:')) return path;
            return `${BASE_URL}/photos/${path}`;
        },

        async fetchAll() {
            try {
                const deviceId = this.getDeviceId();
                // Gửi deviceId lên thông qua params để Backend lọc
                const res = await axios.get(`${API_URL}/diaries`, {
                    params: { deviceId }
                });
                this.items = res.data;
            } catch (error) {
                console.error("❌ Lỗi tải dữ liệu:", error.message);
            }
        },

        async addEntry(base64Image, content, context) {
            try {
                const deviceId = this.getDeviceId();
                const res = await axios.post(`${API_URL}/diaries`, {
                    image: base64Image,
                    content: content || "",
                    userContext: context || "",
                    deviceId: deviceId // Lưu kèm deviceId khi tạo mới
                });
                this.items.unshift(res.data);
                return res.data;
            } catch (error) {
                console.error("❌ Lỗi lưu nhật ký:", error.message);
            }
        },

        async analyzeImage(base64Image, userContext) {
            this.isAnalyzing = true;
            try {
                const response = await axios.post(`${API_URL}/analyze`, {
                    image: base64Image,
                    context: userContext || ""
                });
                return response.data.text;
            } catch (error) {
                console.error("❌ Lỗi AI:", error.message);
                throw error;
            } finally {
                this.isAnalyzing = false;
            }
        },

        async deleteDiary(id) {
            if (!confirm("Bạn có chắc chắn muốn xóa kỷ niệm này?")) return;
            try {
                await axios.delete(`${API_URL}/diaries/${id}`);
                this.items = this.items.filter(item => item._id !== id);
            } catch (error) {
                console.error("❌ Lỗi xóa nhật ký:", error);
            }
        }
    }
});