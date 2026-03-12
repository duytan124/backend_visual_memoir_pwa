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
            <div v-for="(msg, index) in messages" :key="index"
                :class="['message-row', msg.role === 'user' ? 'user-row' : 'ai-row']">

                <div v-if="msg.role === 'ai'" class="ai-avatar">🤖</div>

                <div class="bubble">
                    {{ msg.text }}
                    <span class="time">{{ formatTime(msg.time) }}</span>
                </div>
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
                <textarea v-model="newMessage" placeholder="Tâm sự với AI..." rows="1" @input="adjustTextarea"
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

const messages = ref([
    { role: 'ai', text: 'Chào Tân, mình đã xem qua các kỷ niệm của bạn. Hôm nay bạn thấy thế nào?', time: new Date() }
]);

const scrollToBottom = async () => {
    await nextTick();
    if (scrollBox.value) {
        scrollBox.value.scrollTop = scrollBox.value.scrollHeight;
    }
};

const sendMessage = async () => {
    if (!newMessage.value.trim()) return;

    const userText = newMessage.value;
    messages.value.push({ role: 'user', text: userText, time: new Date() });
    newMessage.value = '';
    await scrollToBottom();

    // Gọi AI
    isTyping.value = true;
    try {
        const aiReply = await store.sendMessage(userText);
        messages.value.push({ role: 'ai', text: aiReply, time: new Date() });
    } catch (error) {
        messages.value.push({ role: 'ai', text: 'Xin lỗi Tân, mình gặp chút trục trặc kết nối.', time: new Date() });
    } finally {
        isTyping.value = false;
        await scrollToBottom();
    }
};

const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const adjustTextarea = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = (e.target.scrollHeight) + 'px';
};

onMounted(async () => {
    // Load lịch sử từ DB
    const history = await store.fetchChatHistory();
    if (history.length > 0) {
        messages.value = history.map(m => ({
            role: m.role,
            text: m.text,
            time: m.createdAt
        }));
    } else {
        // Nếu chưa có gì thì hiện câu chào mặc định
        messages.value.push({
            role: 'ai',
            text: 'Chào Tân, mình đã sẵn sàng lắng nghe bạn.',
            time: new Date()
        });
    }
    scrollToBottom();
});
</script>

<style scoped>
.chat-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #f1f5f9;
}

/* Header */
.chat-header {
    padding: 15px;
    background: white;
    display: flex;
    align-items: center;
    gap: 15px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    z-index: 10;
}

.header-info h3 {
    font-size: 1.1rem;
    margin: 0;
    color: #1e293b;
}

.header-info .status {
    font-size: 0.75rem;
    color: #10b981;
}

/* Messages Area */
.messages-area {
    flex: 1;
    overflow-y: auto;
    padding: 20px 15px;
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.message-row {
    display: flex;
    gap: 10px;
    max-width: 85%;
}

.user-row {
    align-self: flex-end;
    flex-direction: row-reverse;
}

.ai-row {
    align-self: flex-start;
}

.ai-avatar {
    width: 35px;
    height: 35px;
    background: #6366f1;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
}

.bubble {
    padding: 12px 16px;
    border-radius: 18px;
    font-size: 0.95rem;
    line-height: 1.4;
    position: relative;
}

.user-row .bubble {
    background: #6366f1;
    color: white;
    border-bottom-right-radius: 4px;
}

.ai-row .bubble {
    background: white;
    color: #1e293b;
    border-bottom-left-radius: 4px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
}

.time {
    font-size: 0.65rem;
    display: block;
    margin-top: 5px;
    opacity: 0.7;
    text-align: right;
}

/* Input Area */
.input-area {
    background: white;
    padding: 10px 15px 30px;
    /* Padding bottom sâu cho iPhone Safe Area */
}

.input-wrapper {
    background: #f8fafc;
    border-radius: 25px;
    display: flex;
    align-items: flex-end;
    padding: 5px 15px;
    border: 1px solid #e2e8f0;
}

textarea {
    flex: 1;
    border: none;
    background: transparent;
    padding: 10px 0;
    max-height: 120px;
    resize: none;
    font-family: inherit;
    font-size: 1rem;
}

textarea:focus {
    outline: none;
}

.btn-send {
    background: #6366f1;
    color: white;
    border: none;
    width: 35px;
    height: 35px;
    border-radius: 50%;
    margin-bottom: 5px;
    margin-left: 10px;
    transition: 0.2s;
}

.btn-send:disabled {
    background: #cbd5e1;
}

/* Typing Animation */
.typing-bubble {
    display: flex;
    gap: 4px;
    padding: 15px !important;
}

.dot {
    width: 6px;
    height: 6px;
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
        transform: scale(1);
    }

    50% {
        opacity: 1;
        transform: scale(1.2);
    }
}
</style>