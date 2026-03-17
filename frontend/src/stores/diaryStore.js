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
        currentTags: [],
        isPushSubscribed: false
    }),

    persist: {
        key: 'visual-memoir-storage',
        storage: localStorage,
        paths: ['items', 'isPushSubscribed']
    },

    actions: {
        getDeviceId() {
            return DEVICE_ID;
        },

        getDisplayPath(path) {
            if (!path) return 'https://via.placeholder.com/400x300?text=No+Image';

            if (path.startsWith('http') || path.startsWith('data:')) {
                return path;
            }

            return `${BASE_URL}/${path}`;
        },

        async fetchAll() {
            try {
                const deviceId = this.getDeviceId();
                const res = await axios.get(`${API_URL}/diaries`, {
                    params: { deviceId },
                    timeout: 5000
                });
                if (res.data) {
                    this.items = res.data;
                }
            } catch (error) {
                console.warn("⚠️ Chế độ Offline: Sử dụng dữ liệu lưu trữ cục bộ.");
            }
        },

        async addEntry(base64Image, content, context) {
            try {
                const deviceId = this.getDeviceId();
                const res = await axios.post(`${API_URL}/diaries`, {
                    image: base64Image,
                    content: content || "",
                    userContext: context || "",
                    deviceId: deviceId,
                });
                this.items.unshift(res.data);
                this.currentTags = [];
                return res.data;
            } catch (error) {
                console.error("❌ Lỗi lưu nhật ký:", error.message);
                throw error;
            }
        },

        async analyzeImage(base64Image, userContext) {
            this.isAnalyzing = true;
            try {
                const response = await axios.post(`${API_URL}/analyze`, {
                    image: base64Image,
                    context: userContext || ""
                });

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

        async deleteDiary(id) {
            if (!confirm("Bạn có chắc chắn muốn xóa kỷ niệm này?")) return;
            try {
                await axios.delete(`${API_URL}/diaries/${id}`);
                this.items = this.items.filter(item => item._id !== id);
            } catch (error) {
                console.error("❌ Lỗi xóa nhật ký:", error);
            }
        },

        async updateDiary(id, updatedData) {
            try {
                const res = await axios.put(`${API_URL}/diaries/${id}`, updatedData);
                const index = this.items.findIndex(i => i._id === id);
                if (index !== -1) {
                    this.items[index] = res.data;
                }
                return res.data;
            } catch (error) {
                console.error("Lỗi Store:", error);
                throw error;
            }
        },

        async subscribePush(subscription) {
            try {
                const deviceId = this.getDeviceId();
                await axios.post(`${API_URL}/subscribe`, {
                    subscription: subscription,
                    deviceId: deviceId,
                });
                this.isPushSubscribed = true;
                console.log("✅ Đã lưu đăng ký Push thành công.");
                return true;
            } catch (error) {
                console.error("❌ Lỗi đăng ký Push lên Server:", error);
                this.isPushSubscribed = false;
                throw error;
            }
        }
    }
});