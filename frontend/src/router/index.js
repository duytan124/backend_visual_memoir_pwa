import { createRouter, createWebHistory } from 'vue-router';
// 1. Hãy kiểm tra chính xác tên file trong thư mục views là home.vue hay Home.vue
// Giả sử tên file của bạn là viết thường:
import Home from '../views/home.vue';
import History from '../views/history.vue';

const routes = [
    {
        path: '/',
        component: Home // Đổi từ home -> Home (khớp với tên đã import ở trên)
    },
    {
        path: '/history',
        component: History // Đổi từ history -> History
    },
    {
        path: '/detail/:id',
        name: 'Detail',
        // Lưu ý đường dẫn: nếu file router nằm trong src/router/ 
        // thì phải dùng ../views/ để lùi ra ngoài rồi mới vào views
        component: () => import('../views/detail.vue'),
        props: true
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router; // Thường dùng export default cho router