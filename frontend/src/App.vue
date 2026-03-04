<script setup>
// Nhập component bạn vừa tạo
import BottomNav from './components/bottomNav.vue';
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
/* Reset và Font chữ */
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
  /* Chặn cuộn ngang trên mobile */
  overflow-x: hidden;
}

.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.content-area {
  flex: 1;
  /* Quan trọng: Cách ra một khoảng bằng chiều cao BottomNav 
     để nội dung không bị che khuất khi cuộn xuống cuối */
  padding-bottom: 80px;
}

/* Hiệu ứng chuyển trang mượt mà */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>