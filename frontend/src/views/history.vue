<script setup>
import { onMounted } from 'vue';
import { useDiaryStore } from '../stores/diaryStore';

const store = useDiaryStore();

onMounted(async () => {
    await store.fetchAll();
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
                <p class="count">{{ store.items.length }} kỷ niệm</p>
            </div>
        </header>

        <div class="scroll-area">
            <div v-if="store.items.length === 0" class="empty-state">
                <div class="empty-icon">📸</div>
                <p>Chưa có kỷ niệm nào...</p>
                <button @click="$router.push('/')" class="btn-go-home">Tạo ngay</button>
            </div>

            <div v-else class="timeline-list">
                <div v-for="item in store.items" :key="item._id" class="timeline-item">

                    <div class="time-column">
                        <span class="hour">{{ formatTime(item.createdAt) }}</span>
                        <span class="date">{{ formatDate(item.createdAt) }}</span>
                    </div>

                    <div class="entry-card">
                        <div class="image-wrapper" @click="$router.push(`/detail/${item._id}`)">
                           <img :src="convertPath(item.imagePath)" alt="Memory" crossorigin="anonymous" loading="eager" />
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

/* Chấm xanh trên timeline */
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
</style>