import { createRouter, createWebHistory } from 'vue-router';
// 1. Hãy kiểm tra chính xác tên file trong thư mục views là home.vue hay Home.vue
// Giả sử tên file của bạn là viết thường:
import Home from '../views/home.vue';
import History from '../views/history.vue';

const routes = [
    {
        path: '/',
        component: Home
    },
    {
        path: '/history',
        component: History
    },
    {
        path: '/detail/:id',
        name: 'Detail',
        component: () => import('../views/detail.vue'),
        props: true
    },
    {
        path: '/chat',
        name: 'Chat',
        component: () => import('../views/chatView.vue')
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router; // Thường dùng export default cho router