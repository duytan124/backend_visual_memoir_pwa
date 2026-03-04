<script setup>
import { onMounted } from 'vue';
import { useDiaryStore } from '../stores/diaryStore';

const store = useDiaryStore();

// Đảm bảo dữ liệu mới nhất được tải về
onMounted(async () => {
    if (store.items.length === 0) {
        await store.fetchAll();
    }
});

const convertPath = (path) => store.getDisplayPath(path);

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};
</script>

<template>
    <div class="favorites-page">
        <header class="page-header">
            <div class="header-content">
                <h2>Kỷ niệm yêu thích</h2>
                <p class="count">{{ store.favoriteItems.length }} khoảnh khắc được trân trọng</p>
            </div>
        </header>

        <div class="scroll-area">
            <div v-if="store.favoriteItems.length === 0" class="empty-state">
                <div class="empty-icon">💝</div>
                <h3>Chưa có mục yêu thích</h3>
                <p>Nhấn vào biểu tượng trái tim ở các kỷ niệm để lưu chúng vào đây nhé.</p>
                <button @click="$router.push('/history')" class="btn-explore">Khám phá nhật ký</button>
            </div>

            <div v-else class="favorites-grid">
                <div v-for="item in store.favoriteItems" :key="item._id" class="fav-card"
                    @click="$router.push(`/detail/${item._id}`)">
                    <div class="image-box">
                        <img :src="convertPath(item.imagePath)" alt="Favorite" loading="lazy" />
                        <div class="badge-date">{{ formatDate(item.createdAt) }}</div>
                        <button class="btn-unfav" @click.stop="store.toggleFavorite(item._id)">
                            ❤️
                        </button>
                    </div>
                    <div class="info-box">
                        <p class="summary">{{ item.content }}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.favorites-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #fff;
    /* Trắng tinh khôi cho trang yêu thích */
}

.page-header {
    padding: 24px 20px 10px;
    background: white;
}

h2 {
    font-size: 1.8rem;
    color: #1e293b;
    font-weight: 800;
}

.count {
    color: #ef4444;
    /* Màu đỏ hồng cho text count */
    font-weight: 600;
    font-size: 0.9rem;
}

.scroll-area {
    flex: 1;
    overflow-y: auto;
    padding: 15px 20px 100px;
}

/* Bố cục Grid 2 cột cho trang Favorites */
.favorites-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

.fav-card {
    background: white;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
    border: 1px solid #f1f5f9;
    display: flex;
    flex-direction: column;
    transition: transform 0.2s;
}

.fav-card:active {
    transform: scale(0.95);
}

.image-box {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1;
    /* Ảnh vuông cho gọn */
}

.image-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.badge-date {
    position: absolute;
    top: 10px;
    left: 10px;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(4px);
    padding: 4px 8px;
    border-radius: 8px;
    font-size: 0.65rem;
    font-weight: 700;
    color: #475569;
}

.btn-unfav {
    position: absolute;
    bottom: 10px;
    right: 10px;
    background: white;
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    cursor: pointer;
}

.info-box {
    padding: 12px;
}

.summary {
    font-size: 0.85rem;
    color: #334155;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* Trạng thái trống */
.empty-state {
    text-align: center;
    padding-top: 80px;
}

.empty-icon {
    font-size: 4rem;
    margin-bottom: 15px;
}

.btn-explore {
    margin-top: 20px;
    background: #ef4444;
    color: white;
    border: none;
    padding: 12px 25px;
    border-radius: 12px;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}
</style>