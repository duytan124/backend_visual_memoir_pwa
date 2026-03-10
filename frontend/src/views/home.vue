<script setup>
import { ref } from 'vue';
import { useDiaryStore } from '../stores/diaryStore';

const store = useDiaryStore();
const previewUrl = ref(null);
const selectedFileBase64 = ref(null);
const userContext = ref('');
const fileInput = ref(null);

// --- HÀM NÉN ẢNH (GIẢM ĐỘ TRỄ) ---
const compressImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Giới hạn chiều rộng tối đa 1024px để giữ chất lượng vừa đủ
                const MAX_WIDTH = 1024;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Nén thành định dạng JPEG với chất lượng 0.7 (70%)
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                resolve(compressedBase64);
            };
        };
    });
};

const triggerFileInput = () => {
    fileInput.value.click();
};

const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert("Vui lòng chọn một file ảnh nhé!");
        return;
    }

    try {
        // Thực hiện nén ảnh ngay khi chọn
        const compressedBase64 = await compressImage(file);

        previewUrl.value = compressedBase64;
        // Lưu chuỗi base64 đã nén (tách header) để gửi API
        selectedFileBase64.value = compressedBase64.split(',')[1];
    } catch (error) {
        console.error("Lỗi nén ảnh:", error);
        alert("Không thể xử lý ảnh này, vui lòng thử ảnh khác.");
    }
};

const createDiary = async () => {
    if (!selectedFileBase64.value) {
        alert("Vui lòng chọn hoặc chụp một bức ảnh trước nhé!");
        return;
    }

    try {
        store.isAnalyzing = true;

        const fullBase64 = `data:image/jpeg;base64,${selectedFileBase64.value}`;

        // Gửi chuỗi đã nén lên AI và Database
        const aiContent = await store.analyzeImage(fullBase64, userContext.value);

        if (!aiContent) {
            throw new Error("Gemini không thể phản hồi vào lúc này.");
        }

        const result = await store.addEntry(
            fullBase64,
            aiContent,
            userContext.value
        );

        if (result) {
            alert("✨ Kỷ niệm tuyệt vời này đã được lưu lại!");
            previewUrl.value = null;
            selectedFileBase64.value = null;
            userContext.value = '';
            if (fileInput.value) fileInput.value.value = '';
        }

    } catch (error) {
        console.error("❌ Lỗi quy trình:", error);
        alert("Có lỗi xảy ra: " + (error.response?.data?.error || error.message));
    } finally {
        store.isAnalyzing = false;
    }
};
</script>

<template>
    <div class="home-page">
        <input type="file" ref="fileInput" accept="image/*" style="display: none" @change="handleFileChange" />

        <header class="page-header">
            <h1>Tạo kỷ niệm mới</h1>
            <p class="subtitle">Ghi lại khoảnh khắc, để AI viết nên cảm xúc.</p>
        </header>

        <div class="upload-container">
            <div class="main-preview" :class="{ 'has-content': previewUrl }">
                <img v-if="previewUrl" :src="previewUrl" class="image-preview" />

                <div v-else class="drop-zone" @click="triggerFileInput">
                    <div class="icon-circle">✨</div>
                    <p>Nhấn để chọn ảnh từ thư viện</p>
                </div>
            </div>

            <Transition name="slide">
                <div v-if="previewUrl" class="context-box">
                    <label>Bạn đang cảm thấy thế nào?</label>
                    <textarea v-model="userContext"
                        placeholder="Ví dụ: Hôm nay mình đi biển với gia đình..."></textarea>
                </div>
            </Transition>

            <div class="control-panel">
                <div class="source-actions">
                    <button @click="triggerFileInput" class="action-card">
                        <span class="action-icon">📁</span>
                        <div class="action-label">
                            <strong>Thư viện</strong>
                            <span>Chọn từ máy</span>
                        </div>
                    </button>

                    <button @click="triggerFileInput" class="action-card">
                        <span class="action-icon">📷</span>
                        <div class="action-label">
                            <strong>Máy ảnh</strong>
                            <span>Chụp trực tiếp</span>
                        </div>
                    </button>
                </div>

                <button @click="createDiary" :disabled="!selectedFileBase64 || store.isAnalyzing"
                    class="btn-generate-magic" :class="{ 'loading': store.isAnalyzing }">
                    <span v-if="!store.isAnalyzing">✨ Bắt đầu tạo nhật kí</span>
                    <div v-else class="loader-group">
                        <div class="spinner"></div>
                        <span>Gemini đang suy ngẫm...</span>
                    </div>
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
body.keyboard-open {
    position: fixed;
    width: 100%;
}

.context-box {
    margin-top: 24px;
    background: white;
    padding: 16px;
    border-radius: 20px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.context-box label {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    color: #475569;
    margin-bottom: 8px;
}

.context-box textarea {
    width: 100%;
    border: 1px solid #f1f5f9;
    background: #f8fafc;
    border-radius: 12px;
    padding: 12px;
    font-family: inherit;
    font-size: 16px;
    resize: none;
    transition: all 0.2s;
    touch-action: manipulation;
}

.context-box textarea:focus {
    outline: none;
    border-color: #6366f1;
    background: white;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.slide-enter-active,
.slide-leave-active {
    transition: all 0.4s ease;
}

.slide-enter-from {
    opacity: 0;
    transform: translateY(-10px);
}

.home-page {
    animation: slideUp 0.6s ease-out;
}

.page-header {
    margin-bottom: 32px;
}

h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 8px;
}

.subtitle {
    color: #64748b;
    font-size: 1rem;
}

.upload-container {
    max-width: 800px;
    margin: 0 auto;
}

.main-preview {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    background: #ffffff;
    border-radius: 32px;
    border: 2px dashed #e2e8f0;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
}

.main-preview.has-content {
    border-style: solid;
    border-color: transparent;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.drop-zone {
    text-align: center;
    cursor: pointer;
    padding: 40px;
}

.icon-circle {
    width: 80px;
    height: 80px;
    background: #f0f3ff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    margin: 0 auto 16px;
    transition: transform 0.3s ease;
}

.drop-zone:hover .icon-circle {
    transform: scale(1.1) rotate(10deg);
}

.image-preview {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.control-panel {
    margin-top: 32px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.source-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.action-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    cursor: pointer;
    text-align: left;
    transition: all 0.3s ease;
}

.action-card:hover {
    border-color: #6366f1;
    background: #f8faff;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
}

.action-icon {
    font-size: 1.5rem;
}

.action-label strong {
    display: block;
    color: #1e293b;
    font-size: 1rem;
}

.action-label span {
    color: #64748b;
    font-size: 0.8rem;
}

.btn-generate-magic {
    width: 100%;
    padding: 18px;
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
    color: white;
    border: none;
    border-radius: 20px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 10px 20px -5px rgba(99, 102, 241, 0.4);
}

.btn-generate-magic:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 15px 25px -5px rgba(99, 102, 241, 0.5);
}

.btn-generate-magic:disabled {
    background: #cbd5e1;
    box-shadow: none;
    cursor: not-allowed;
}

.loader-group {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
}

.spinner {
    width: 20px;
    height: 20px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>