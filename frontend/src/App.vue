<script setup>
import BottomNav from './components/bottomNav.vue';
import { onMounted, ref } from 'vue';
import { useDiaryStore } from './stores/diaryStore';

const store = useDiaryStore();
const isNotificationSupported = ref('Notification' in window && 'serviceWorker' in navigator);

// Biến điều khiển hiển thị Modal xin quyền "mồi"
const showPushPrompt = ref(false);

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Hàm xử lý khi user nhấn "Đồng ý" trên Modal
const handleAcceptPush = async () => {
  showPushPrompt.value = false;

  if (store.setPrompted) store.setPrompted();

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const reg = await navigator.serviceWorker.ready;
      const publicVapidKey = "BC8G3662sguTZk81YL7TO1zliLeNU423P8qBhf52e-A2b9_40RqASN_bi-Fkbfisc7Ad9GvqcPoVtovnND3MoTg";

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      await store.subscribePush(subscription);
      console.log("✅ Đăng ký thông báo thành công.");
    }
  } catch (error) {
    console.warn("⚠️ Lỗi đăng ký:", error);
  }
};

// Hàm đóng modal khi user chọn "Để sau"
const handleDeclinePush = () => {
  showPushPrompt.value = false;
  if (store.setPrompted) store.setPrompted();
};

onMounted(() => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  if (isNotificationSupported.value && isStandalone) {
    const needsPrompt = Notification.permission === 'default' && !store.isPushSubscribed && !store.hasPromptedForPush;
    if (needsPrompt) {
      setTimeout(() => {
        showPushPrompt.value = true;
      }, 2000);
    }
  }
});
</script>

<template>
  <div class="app-shell">
    <transition name="slide-up">
      <div v-if="showPushPrompt" class="push-overlay">
        <div class="push-card">
          <div class="push-icon">🔔</div>
          <h3>Nhắc nhở kỷ niệm</h3>
          <p>Cho phép mình nhắc bạn ghi lại những khoảnh khắc đẹp vào 19:00 mỗi tối nhé?</p>
          <div class="push-actions">
            <button @click="handleDeclinePush" class="btn-later">Để sau</button>
            <button @click="handleAcceptPush" class="btn-primary">Bật thông báo</button>
          </div>
        </div>
      </div>
    </transition>

    <main class="content-area">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <BottomNav />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap');

:root {
  --primary: #6366f1;
  --bg-main: #f8fafc;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', sans-serif;
  background-color: var(--bg-main);
  overflow-x: hidden;
  color: #1e293b;
  -webkit-tap-highlight-color: transparent;
}

.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.content-area {
  flex: 1;
  padding-bottom: 90px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.push-overlay {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.5);
  z-index: 10000;
  display: flex;
  align-items: flex-end;
  backdrop-filter: blur(4px);
}

.push-card {
  background: white;
  width: 100%;
  padding: 24px;
  border-radius: 24px 24px 0 0;
  text-align: center;
  box-shadow: 0 -10px 25px rgba(0, 0, 0, 0.1);
}

.push-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.push-card h3 {
  margin-bottom: 8px;
  font-weight: 600;
  color: #1e293b;
}

.push-card p {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 20px;
  line-height: 1.5;
}

.push-actions {
  display: flex;
  gap: 12px;
}

.push-actions button {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  border: none;
  font-weight: 600;
  cursor: pointer;
}

.btn-later {
  background: #f1f5f9;
  color: #64748b;
}

.btn-primary {
  background: #6366f1;
  color: white;
}

/* Hiệu ứng trượt lên */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.4s ease, opacity 0.4s;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>