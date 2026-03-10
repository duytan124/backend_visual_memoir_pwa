import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import './style.css';

// ĐĂNG KÝ SERVICE WORKER (Dành cho PWA)
import { registerSW } from 'virtual:pwa-register';

// 1. Khởi tạo Pinia và cài Plugin lưu trữ
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App);

// 2. Sử dụng biến pinia đã cài plugin (Sửa lỗi dùng createPinia() lần 2 ở đây)
app.use(pinia);
app.use(router);

// Tự động cập nhật ứng dụng
registerSW({
    immediate: true,
    onNeedRefresh() {
        if (confirm('Ứng dụng đã có bản cập nhật mới. Bạn có muốn làm mới không?')) {
            window.location.reload();
        }
    }
});

app.mount('#app');