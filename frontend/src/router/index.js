import { createRouter, createWebHistory } from 'vue-router';
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
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;