<script setup>
import { onMounted, ref, computed } from 'vue';
import { useDiaryStore } from '../stores/diaryStore';

const store = useDiaryStore();
const viewMode = ref('all');

onMounted(async () => {
    await store.fetchAll();
});

const filteredItems = computed(() => {
    if (viewMode.value === 'all') return store.items;

    if (viewMode.value === 'favorites') {
        return store.items.filter(item => item.isFavorite);
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return store.items.filter(item => {
        const itemDate = new Date(item.createdAt);
        const itemTime = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate()).getTime();

        if (viewMode.value === 'day') {
            return itemTime === today;
        }

        if (viewMode.value === 'week') {
            const sevenDaysAgo = today - (7 * 24 * 60 * 60 * 1000);
            return itemTime >= sevenDaysAgo && itemTime <= today;
        }

        if (viewMode.value === 'month') {
            return itemDate.getMonth() === now.getMonth() &&
                itemDate.getFullYear() === now.getFullYear();
        }
        return true;
    });
});

const convertPath = (path) => store.getDisplayPath(path);

const handleMobileShare = async (item) => {
    const shareData = {
        title: 'Kỷ niệm từ AI Diary 📸',
        text: item.content,
        url: `${window.location.origin}/detail/${item._id}`
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            console.log('User cancelled share');
        }
    } else {
        await navigator.clipboard.writeText(shareData.url);
        alert("Đã sao chép liên kết! Bạn có thể dán vào Zalo/Facebook để chia sẻ.");
    }
};

const toggleFavorite = async (item) => {
    const newStatus = !item.isFavorite;

    try {
        await store.updateDiary(item._id, { isFavorite: newStatus });
        if (navigator.vibrate) navigator.vibrate(50);
    } catch (err) {
        console.error("Không thể cập nhật yêu thích:", err);
    }
};

const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
</script>

<template>
    <div class="history-page">
        <header class="page-header">
            <div class="header-content">
                <h2>Dòng thời gian</h2>
                <div class="filter-bar">
                    <button :class="{ active: viewMode === 'all' }" @click="viewMode = 'all'">Tất cả</button>
                    <button :class="{ active: viewMode === 'favorites' }" @click="viewMode = 'favorites'">Yêu thích</button>
                    <button :class="{ active: viewMode === 'day' }" @click="viewMode = 'day'">Hôm nay</button>
                    <button :class="{ active: viewMode === 'week' }" @click="viewMode = 'week'">Tuần</button>
                    <button :class="{ active: viewMode === 'month' }" @click="viewMode = 'month'">Tháng</button>
                </div>
                <p class="count">{{ filteredItems.length }} kỷ niệm được tìm thấy</p>
            </div>
        </header>

        <div class="scroll-area">
            <div v-if="store.items.length === 0" class="empty-state">
                <div class="empty-icon">📸</div>
                <p>Không có kỷ niệm nào trong thời gian này.</p>
                <button @click="$router.push('/')" class="btn-go-home">Tạo ngay</button>
            </div>

            <div v-else class="timeline-list">
                <div v-for="item in filteredItems" :key="item._id" class="timeline-item">

                    <div class="time-column">
                        <span class="hour">{{ formatTime(item.createdAt) }}</span>
                        <span class="date">{{ formatDate(item.createdAt) }}</span>
                    </div>

                    <div class="entry-card">
                        <div class="image-wrapper" @click="$router.push(`/detail/${item._id}`)">
                           <img :src="convertPath(item.imagePath)" alt="Memory" crossorigin="anonymous" loading="eager" />
                        </div>

                        <div class="heart-btn" :class="{ 'is-active': item.isFavorite }"
                            @click.stop="toggleFavorite(item)">
                            <img v-if="item.isFavorite" src="/heart_color.png" alt="heart-color"
                                class="heart-img active-heart" />

                            <img v-else src="/heart.png" alt="heart-empty" class="heart-img" />
                        </div>

                        <div class="text-wrapper">
                            <p class="diary-content" @click="$router.push(`/detail/${item._id}`)">
                                {{ item.content }}
                            </p>

                            <div class="card-footer">
                                <span class="read-more" @click="$router.push(`/detail/${item._id}`)">Xem chi tiết</span>

                                <button class="btn-share-mobile" @click.stop="handleMobileShare(item)">
                                    <i class="fa-solid fa-arrow-up-from-bracket"></i>
                                    <span>Chia sẻ</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.filter-bar {
    display: flex;
    background: #f1f5f9;
    padding: 4px;
    border-radius: 12px;
    margin: 15px 0 10px;
    gap: 4px;
}

.filter-bar button {
    flex: 1;
    border: none;
    padding: 8px 5px;
    border-radius: 9px;
    font-size: 0.8rem;
    font-weight: 600;
    color: #64748b;
    background: transparent;
    transition: all 0.2s;
    white-space: nowrap;
}

.filter-bar button.active {
    background: white;
    color: #6366f1;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.count {
    font-size: 0.75rem;
    color: #94a3b8;
    margin-top: 5px;
}

.btn-clear {
    margin-top: 15px;
    background: #6366f1;
    color: white;
    border: none;
    padding: 8px 20px;
    border-radius: 20px;
    font-weight: 600;
}

.timeline-list::before {
    left: 77px;
}

.history-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #f8fafc;
}

.page-header {
    padding: 20px;
    background: #f8fafc;
    position: sticky;
    top: 0;
    z-index: 10;
}

.scroll-area {
    flex: 1;
    overflow-y: auto;
    padding: 0 15px 100px;
}

.timeline-list {
    position: relative;
    padding-left: 10px;
}

.timeline-list::before {
    content: '';
    position: absolute;
    left: 80px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #e2e8f0;
}

.timeline-item {
    display: flex;
    gap: 20px;
    margin-bottom: 25px;
    position: relative;
}

.timeline-item::after {
    content: '';
    position: absolute;
    left: 77px;
    top: 12px;
    width: 8px;
    height: 8px;
    background: #6366f1;
    border: 2px solid white;
    border-radius: 50%;
    z-index: 2;
}

.time-column {
    width: 65px;
    flex-shrink: 0;
    text-align: right;
}

.time-column .hour {
    font-weight: 800;
    color: #1e293b;
    display: block;
}

.time-column .date {
    font-size: 0.65rem;
    color: #94a3b8;
}

.entry-card {
    flex: 1;
    background: white;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.image-wrapper {
    width: 100%;
    aspect-ratio: 4/3;
}

.image-wrapper img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.text-wrapper {
    padding: 12px;
}

.diary-content {
    font-size: 0.9rem;
    color: #475569;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-bottom: 10px;
}

.card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #f1f5f9;
    padding-top: 10px;
}

.read-more {
    font-size: 0.8rem;
    color: #6366f1;
    font-weight: 600;
}

.btn-share-mobile {
    background: #eff6ff;
    border: none;
    padding: 6px 12px;
    border-radius: 20px;
    color: #2563eb;
    font-size: 0.8rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 5px;
}

.btn-share-mobile:active {
    background: #dbeafe;
    transform: scale(0.95);
}

.image-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 4/3;
    overflow: hidden;
}

.heart-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 5;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(4px);
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.heart-img {
    width: 20px;
    height: 20px;
    transition: transform 0.2s ease;
}

.heart-btn:active {
    transform: scale(0.8);
}

@keyframes heart-pop {
    0% {
        transform: scale(0.5);
        opacity: 0;
    }

    70% {
        transform: scale(1.2);
        opacity: 1;
    }

    100% {
        transform: scale(1);
        opacity: 1;
    }
}

.active-heart {
    animation: heart-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.heart-btn.is-active {
    background: white;
    box-shadow: 0 4px 15px rgba(255, 0, 0, 0.15);
}
</style>