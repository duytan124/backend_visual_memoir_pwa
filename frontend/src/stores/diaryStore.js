import { defineStore } from 'pinia';
import axios from 'axios';

// THAY ĐỔI TẠI ĐÂY: Dùng URL deploy thực tế thay vì localhost
const BASE_URL = 'https://backend-visual-memoir-pwa.onrender.com';
const API_URL = `${BASE_URL}/api`;

export const useDiaryStore = defineStore('diary', {
    state: () => ({
        items: [],
        isAnalyzing: false,
    }),

    getters: {
        favoriteItems: (state) => state.items.filter(item => item.isFavorite),
    },

    actions: {
        /**
         * Xử lý đường dẫn ảnh cho Web
         */
        getDisplayPath(path) {
            if (!path) return 'https://via.placeholder.com/400x300?text=No+Image';

            if (path.startsWith('http') || path.startsWith('data:')) {
                return path;
            }

            // Nối với đường dẫn server mới trên Render
            return `${BASE_URL}/photos/${path}`;
        },

        async shareEntry(item) {
            if (!navigator.share) {
                alert("Trình duyệt của bạn không hỗ trợ chia sẻ trực tiếp.");
                return;
            }

            try {
                await navigator.share({
                    title: 'Kỷ niệm từ Visual Memoir',
                    text: `"${item.content}"`,
                    url: window.location.origin,
                });
            } catch (error) {
                console.log("Hủy chia sẻ hoặc lỗi:", error);
            }
        },

        async fetchAll() {
            try {
                const res = await axios.get(`${API_URL}/diaries`);
                this.items = res.data;
            } catch (error) {
                console.error("❌ Lỗi tải dữ liệu:", error.message);
            }
        },

        async addEntry(base64Image, content, context) {
            try {
                const res = await axios.post(`${API_URL}/diaries`, {
                    image: base64Image,
                    content: content || "",
                    userContext: context || ""
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

        async toggleFavorite(id) {
            try {
                const res = await axios.patch(`${API_URL}/diaries/${id}/toggle-favorite`);
                const index = this.items.findIndex(item => item._id === id);
                if (index !== -1) {
                    this.items[index].isFavorite = res.data.isFavorite;
                }
            } catch (error) {
                console.error("❌ Lỗi thả tim:", error);
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