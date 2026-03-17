<script setup>
import BottomNav from './components/bottomNav.vue';
import { onMounted, ref } from 'vue';
import { useDiaryStore } from './stores/diaryStore';

const store = useDiaryStore();
const isNotificationSupported = ref('Notification' in window && 'serviceWorker' in navigator);

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

const setupPushNotifications = async () => {
  if (!isNotificationSupported.value) return;
  
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
      console.log("✅ Đã tự động đăng ký thông báo.");
    }
  } catch (error) {
    console.warn("⚠️ Không thể tự động đăng ký:", error);
  }
};

onMounted(() => {
  if (isNotificationSupported.value) {
    const shouldRegister = Notification.permission === 'default' ||
      (Notification.permission === 'granted' && !store.isPushSubscribed);

    if (shouldRegister) {
      const triggerOnce = () => {
        setupPushNotifications();
        window.removeEventListener('click', triggerOnce);
        window.removeEventListener('touchstart', triggerOnce);
      };

      window.addEventListener('click', triggerOnce);
      window.addEventListener('touchstart', triggerOnce);
    }
  }
});
</script>

<template>
  <div class="app-shell">
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
</style>