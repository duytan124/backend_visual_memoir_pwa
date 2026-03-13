<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDiaryStore } from '../stores/diaryStore';

const props = defineProps(['id']);
const route = useRoute();
const router = useRouter();
const store = useDiaryStore();

// Lấy item từ store dựa trên ID từ URL
const item = computed(() => store.items.find(i => i._id === (props.id || route.params.id)));

/**
 * XỬ LÝ ĐƯỜNG DẪN ẢNH CHO PWA
 */
const convertPath = (path) => {
    if (!path) return '';
    // Nếu là ảnh base64 hoặc link tuyệt đối thì dùng luôn
    if (path.startsWith('data:image') || path.startsWith('http')) {
        return path;
    }
    // Nếu là path tương đối từ server, nối với Base URL của Backend
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return `${backendUrl}/${path}`;
};

const formatDate = (d) => new Date(d).toLocaleDateString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
});

const handleEdit = async () => {
    const newContent = window.prompt("Chỉnh sửa lời nhật ký:", item.value.content);
    if (newContent !== null && newContent.trim() !== "") {
        try {
            await store.updateDiary(item.value._id, {
                content: newContent.trim(),
                userContext: item.value.userContext
            });
            alert("✨ Đã cập nhật nội dung nhật ký");
        } catch (err) {
            alert("Lỗi khi cập nhật: " + err.message);
        }
    }
};

const handleDelete = async () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa vĩnh viễn kỷ niệm này?")) {
        try {
            await store.deleteDiary(item.value._id);
            router.push('/history');
        } catch (err) {
            alert("Lỗi khi xóa: " + err.message);
        }
    }
};
</script>

<template>
    <div class="detail-page" v-if="item">
        <header class="header">
            <button @click="$router.back()" class="btn-back">
                <span class="icon">❮</span>
            </button>
            <h2>Chi tiết kỷ niệm</h2>
        </header>

        <main class="content-container">
            <div class="image-wrapper">
               <img :src="convertPath(item.imagePath)" alt="Memory" crossorigin="anonymous" loading="eager" />
                <div class="time-tag">{{ formatDate(item.createdAt) }}</div>
            </div>

            <section class="diary-section">
                <p class="diary-content">"{{ item.content }}"</p>
            </section>

            <section class="context-section" v-if="item.userContext">
                <label>Cảm xúc lúc đó</label>
                <div class="context-box">
                    <span class="quote-icon">💭</span>
                    <p>{{ item.userContext }}</p>
                </div>
            </section>

            <footer class="action-footer">
                <button @click="handleEdit" class="btn-action edit">
                    <span>✏️</span> Chỉnh sửa
                </button>
                <button @click="handleDelete" class="btn-action delete">
                    <span>🗑️</span> Xóa
                </button>
            </footer>
        </main>
    </div>

    <div v-else class="error-state">
        <p>Không tìm thấy kỷ niệm này...</p>
        <button @click="$router.push('/history')" class="btn-go-back">Quay lại danh sách</button>
    </div>
</template>

<style scoped>
/* GIỮ NGUYÊN CSS GIAO DIỆN CỦA BẠN */
.detail-page {
    min-height: 100vh;
    background: #fff;
    padding-bottom: 100px;
}

.header {
    display: flex;
    align-items: center;
    padding: 15px 20px;
    position: sticky;
    top: 0;
    background: white;
    z-index: 10;
    gap: 15px;
}

.btn-back {
    background: #f8fafc;
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    color: #6366f1;
    cursor: pointer;
}

h2 {
    font-size: 1.2rem;
    font-weight: 700;
    color: #1e293b;
}

.content-container {
    padding: 0 20px;
}

.image-wrapper {
    position: relative;
    width: 100%;
    border-radius: 28px;
    overflow: hidden;
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.12);
}

.image-wrapper img {
    width: 100%;
    display: block;
    max-height: 70vh;
    object-fit: cover;
}

.time-tag {
    position: absolute;
    bottom: 15px;
    right: 15px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(5px);
    padding: 8px 14px;
    border-radius: 14px;
    font-size: 0.75rem;
    font-weight: 700;
    color: #475569;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.diary-section {
    padding: 30px 10px;
}

.diary-content {
    font-size: 1.1rem;
    line-height: 1.7;
    color: #1e293b;
    font-family: 'Inter', sans-serif;
    text-align: center;
    font-style: italic;
    font-weight: 500;
}

.context-section {
    background: #f1f5f9;
    padding: 18px;
    border-radius: 20px;
    margin-bottom: 30px;
}

.context-section label {
    font-size: 0.7rem;
    font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    margin-bottom: 10px;
    display: block;
    letter-spacing: 0.05em;
}

.context-box {
    display: flex;
    gap: 10px;
    color: #334155;
    font-size: 0.95rem;
    line-height: 1.5;
}

.action-footer {
    display: flex;
    gap: 12px;
    padding-top: 10px;
}

.btn-action {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 15px;
    border: none;
    border-radius: 16px;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    transition: opacity 0.2s;
}

.btn-action:active {
    opacity: 0.8;
}

.edit {
    background: #6366f1;
    color: white;
}

.delete {
    background: #fff1f2;
    color: #e11d48;
}

.error-state {
    text-align: center;
    padding: 100px 20px;
}

.btn-go-back {
    margin-top: 20px;
    padding: 10px 20px;
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 10px;
}
</style>