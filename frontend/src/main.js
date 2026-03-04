import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';

// Import CSS tổng (để đảm bảo giao diện đồng bộ)
import './style.css';

// ĐĂNG KÝ SERVICE WORKER (Dành cho PWA)
import { registerSW } from 'virtual:pwa-register';

const app = createApp(App);

app.use(createPinia());
app.use(router);

// Tự động cập nhật ứng dụng khi có phiên bản mới
registerSW({
    immediate: true,
    onNeedRefresh() {
        if (confirm('Ứng dụng đã có bản cập nhật mới. Bạn có muốn làm mới không?')) {
            location.reload();
        }
    }
});

app.mount('#app');