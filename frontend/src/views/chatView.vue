<template>
    <div class="chat-container">
        <header class="chat-header">
            <button @click="$router.back()" class="btn-back">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <div class="header-info">
                <h3>Bạn đồng hành AI</h3>
                <span class="status">Đang lắng nghe...</span>
            </div>
        </header>

        <div class="messages-area" ref="scrollBox">
            <template v-for="(msg, index) in messages" :key="index">
                <div v-if="shouldShowDate(msg, index)" class="date-divider">
                    <span>{{ formatDateLabel(msg.time) }}</span>
                </div>

                <div :class="['message-row', msg.role === 'user' ? 'user-row' : 'ai-row']">
                    <div v-if="msg.role === 'ai'" class="ai-avatar">🤖</div>
                    <div class="bubble">
                        {{ msg.text }}
                        <span class="time">{{ formatTime(msg.time) }}</span>
                    </div>
                </div>
            </template>

            <div v-if="messages.length === 0 && !isTyping" class="empty-state">
                <i class="fa-solid fa-comment-dots"></i>
                <p>Bắt đầu tâm sự với AI về ngày hôm nay của bạn...</p>
            </div>

            <div v-if="isTyping" class="message-row ai-row">
                <div class="ai-avatar">🤖</div>
                <div class="bubble typing-bubble">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
            </div>
        </div>

        <footer class="input-area">
            <div class="input-wrapper">
                <textarea v-model="newMessage" placeholder="Viết tin nhắn..." rows="1" @input="adjustTextarea"
                    @keyup.enter.prevent="sendMessage"></textarea>
                <button @click="sendMessage" :disabled="!newMessage.trim()" class="btn-send">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        </footer>
    </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useDiaryStore } from '../stores/diaryStore';

const store = useDiaryStore();
const scrollBox = ref(null);
const newMessage = ref('');
const isTyping = ref(false);
const messages = ref([]);

// --- LOGIC HIỂN THỊ THỜI GIAN ---
const shouldShowDate = (msg, index) => {
    if (index === 0) return true;
    const prevMsg = messages.value[index - 1];
    return new Date(msg.time).toDateString() !== new Date(prevMsg.time).toDateString();
};

const formatDateLabel = (date) => {
    const d = new Date(date);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Hôm nay';
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';
    return d.toLocaleDateString('vi-VN');
};

const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

// --- LOGIC CHÍNH ---
const scrollToBottom = async () => {
    await nextTick();
    if (scrollBox.value) {
        scrollBox.value.scrollTo({
            top: scrollBox.value.scrollHeight,
            behavior: 'smooth'
        });
    }
};

const sendMessage = async () => {
    if (!newMessage.value.trim()) return;

    const userText = newMessage.value;
    const tempTime = new Date();

    messages.value.push({ role: 'user', text: userText, time: tempTime });
    newMessage.value = '';
    await scrollToBottom();

    isTyping.value = true;
    try {
        const aiReply = await store.sendMessage(userText);
        messages.value.push({ role: 'ai', text: aiReply, time: new Date() });
    } catch (error) {
        messages.value.push({ role: 'ai', text: 'Mình gặp chút lỗi kết nối.', time: new Date() });
    } finally {
        isTyping.value = false;
        await scrollToBottom();
    }
};

const adjustTextarea = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = (e.target.scrollHeight) + 'px';
};

onMounted(async () => {
    const history = await store.fetchChatHistory();
    if (history && history.length > 0) {
        messages.value = history.map(m => ({
            role: m.role,
            text: m.text,
            time: m.createdAt
        }));
    }
    scrollToBottom();
});
</script>

<style scoped>
.chat-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: -webkit-fill-available;
    /* Fix chiều cao cho trình duyệt di động */
    background: #f8fafc;
}

.chat-header {
    padding: 12px 16px;
    background: #ffffff;
    display: flex;
    align-items: center;
    gap: 15px;
    border-bottom: 1px solid #e2e8f0;
    flex-shrink: 0;
}

.header-info h3 {
    font-size: 1rem;
    margin: 0;
    font-weight: 600;
}

.header-info .status {
    font-size: 0.7rem;
    color: #10b981;
}

.messages-area {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    -webkit-overflow-scrolling: touch;
    /* Cuộn mượt trên iOS */
}

/* Date Divider */
.date-divider {
    display: flex;
    justify-content: center;
    margin: 10px 0;
}

.date-divider span {
    background: #e2e8f0;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.65rem;
    color: #64748b;
    font-weight: 500;
}

.message-row {
    display: flex;
    gap: 8px;
    max-width: 88%;
}

.user-row {
    align-self: flex-end;
    flex-direction: row-reverse;
}

.ai-row {
    align-self: flex-start;
}

.ai-avatar {
    width: 32px;
    height: 32px;
    background: #6366f1;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    flex-shrink: 0;
}

.bubble {
    padding: 10px 14px;
    border-radius: 18px;
    font-size: 0.95rem;
    line-height: 1.5;
}

.user-row .bubble {
    background: #6366f1;
    color: white;
    border-bottom-right-radius: 4px;
}

.ai-row .bubble {
    background: white;
    border: 1px solid #e2e8f0;
    border-bottom-left-radius: 4px;
}

.time {
    font-size: 0.6rem;
    margin-top: 4px;
    opacity: 0.6;
    display: block;
    text-align: right;
}

/* Input Area */
.input-area {
    background: white;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
    border-top: 1px solid #e2e8f0;
}

.input-wrapper {
    background: #f1f5f9;
    border-radius: 24px;
    display: flex;
    align-items: flex-end;
    padding: 4px 6px 4px 14px;
}

textarea {
    flex: 1;
    border: none;
    background: transparent;
    padding: 10px 0;
    max-height: 100px;
    font-size: 1rem;
    resize: none;
    outline: none;
}

.btn-send {
    background: #6366f1;
    color: white;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.empty-state {
    text-align: center;
    margin-top: 40px;
    color: #94a3b8;
}

.empty-state i {
    font-size: 2rem;
    margin-bottom: 10px;
}

/* Typing Animation */
.typing-bubble {
    display: flex;
    gap: 4px;
    padding: 14px !important;
}

.dot {
    width: 5px;
    height: 5px;
    background: #94a3b8;
    border-radius: 50%;
    animation: blink 1.4s infinite;
}

.dot:nth-child(2) {
    animation-delay: 0.2s;
}

.dot:nth-child(3) {
    animation-delay: 0.4s;
}

@keyframes blink {

    0%,
    100% {
        opacity: 0.3;
    }

    50% {
        opacity: 1;
    }
}
</style>