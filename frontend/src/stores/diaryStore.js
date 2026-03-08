import { defineStore } from 'pinia';
import axios from 'axios';

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
        currentTags: [], // MỚI: Lưu tags AI vừa phân tích để gửi đi khi addEntry
    }),

    getters: {
        favoriteItems: (state) => state.items.filter(item => item.isFavorite),
    },

    actions: {
        getDeviceId() {
            return DEVICE_ID;
        },

        // CẬP NHẬT: Ưu tiên trả về link trực tiếp (Cloudinary) nếu có
        getDisplayPath(path) {
            if (!path) return 'https://via.placeholder.com/400x300?text=No+Image';
            if (path.startsWith('http') || path.startsWith('data:')) return path;
            return `${BASE_URL}/photos/${path}`;
        },

        async fetchAll() {
            try {
                const deviceId = this.getDeviceId();
                const res = await axios.get(`${API_URL}/diaries`, {
                    params: { deviceId }
                });
                this.items = res.data;
            } catch (error) {
                console.error("❌ Lỗi tải dữ liệu:", error.message);
            }
        },

        // GIỮ NGUYÊN cấu trúc addEntry nhưng thêm gửi kèm Tags và isFavorite
        async addEntry(base64Image, content, context) {
            try {
                const deviceId = this.getDeviceId();
                const res = await axios.post(`${API_URL}/diaries`, {
                    image: base64Image,
                    content: content || "",
                    userContext: context || "",
                    deviceId: deviceId,
                    tags: this.currentTags, // Gửi kèm tags
                    isFavorite: true       // Mặc định cho vào Favorite để hiện ở trang mới
                });
                this.items.unshift(res.data);
                this.currentTags = []; // Reset sau khi lưu
                return res.data;
            } catch (error) {
                console.error("❌ Lỗi lưu nhật ký:", error.message);
            }
        },

        // GIỮ NGUYÊN analyzeImage nhưng hứng thêm mảng Tags từ AI trả về
        async analyzeImage(base64Image, userContext) {
            this.isAnalyzing = true;
            try {
                const response = await axios.post(`${API_URL}/analyze`, {
                    image: base64Image,
                    context: userContext || ""
                });

                // Lưu tags vào state nếu AI trả về mảng tags
                if (response.data.tags) {
                    this.currentTags = response.data.tags;
                }

                return response.data.text;
            } catch (error) {
                console.error("❌ Lỗi AI:", error.message);
                throw error;
            } finally {
                this.isAnalyzing = false;
            }
        },

        // MỚI: Thêm hàm để thả tim/bỏ thích nhanh trên giao diện
        async toggleFavorite(id) {
            try {
                const item = this.items.find(i => i._id === id);
                if (item) {
                    const newStatus = !item.isFavorite;
                    // Gọi API patch (nếu bạn đã viết ở backend)
                    await axios.patch(`${API_URL}/diaries/${id}`, { isFavorite: newStatus });
                    item.isFavorite = newStatus;
                }
            } catch (error) {
                console.error("❌ Lỗi cập nhật yêu thích:", error);
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