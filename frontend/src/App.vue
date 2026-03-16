<script setup>
import BottomNav from './components/bottomNav.vue';
import { onMounted, ref, computed } from 'vue';
import { useDiaryStore } from './stores/diaryStore';

const store = useDiaryStore();

const isNotificationSupported = ref('Notification' in window && 'serviceWorker' in navigator);
const notificationPermission = ref(isNotificationSupported.value ? Notification.permission : 'denied');

const shouldShowNotifyBtn = computed(() => {
  return isNotificationSupported.value &&
    notificationPermission.value !== 'granted' &&
    !store.isPushSubscribed;
});

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

const enableNotifications = async () => {
  if (!isNotificationSupported.value) return;

  try {
    const permission = await Notification.requestPermission();
    notificationPermission.value = permission;

    if (permission === "granted") {
      const reg = await navigator.serviceWorker.ready;

      // 🔑 QUAN TRỌNG: Thay bằng Public Key thật từ Backend của Tân
      const publicVapidKey = "BC8G3662sguTZk81YL7TO1zliLeNU423P8qBhf52e-A2b9_40RqASN_bi-Fkbfisc7Ad9GvqcPoVtovnND3MoTg";

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      // Gọi action từ Store để lưu subscription lên Backend
      await store.subscribePush(subscription);

      // Thông báo thành công cục bộ
      await sendLocalNotification(
        "✨ Đã bật nhắc nhở",
        "Mình sẽ ghé thăm bạn vào lúc 16:00 mỗi ngày nhé! 📝"
      );
    }
  } catch (error) {
    console.error("Lỗi đăng ký Push:", error);
    alert("Có lỗi khi kết nối với máy chủ thông báo. Tân thử lại sau nhé!");
  }
};

const sendLocalNotification = async (title, body) => {
  const isGranted = notificationPermission.value === 'granted';
  if ('serviceWorker' in navigator && isGranted) {
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      vibrate: [200, 100, 200],
      data: { url: window.location.origin }
    });
  }
};

onMounted(() => {
  if (notificationPermission.value === 'granted') {
    console.log("🔔 Hệ thống thông báo đã sẵn sàng.");
  }
});
</script>

<template>
  <div class="app-shell">
    <button v-if="shouldShowNotifyBtn" @click="enableNotifications" class="btn-notification">
      🔔 Nhận lời nhắc 16:00
    </button>

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
  --primary-dark: #4f46e5;
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

.btn-notification {
  position: fixed;
  top: 15px;
  right: 15px;
  z-index: 1000;
  padding: 10px 18px;
  background: var(--primary);
  color: white;
  border-radius: 50px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-notification:active {
  transform: scale(0.95);
  background: var(--primary-dark);
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
</style>