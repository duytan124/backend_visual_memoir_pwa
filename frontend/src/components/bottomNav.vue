<template>
  <nav class="bottom-nav">
    <router-link to="/" class="nav-item" active-class="active">
      <span class="icon">🏠</span>
      <span>Trang chủ</span>
    </router-link>
    <router-link to="/history" class="nav-item" active-class="active">
      <span class="icon">📜</span>
      <span>Lịch sử</span>
    </router-link>
    <router-link to="/favorite" class="nav-item" active-class="active">
      <span class="icon">❤️</span>
      <span>Yêu thích</span>
    </router-link>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 70px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-top: 1px solid #e2e8f0;
  padding-bottom: env(safe-area-inset-bottom);
  /* Hỗ trợ iPhone đời mới */
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.3s;
}

.nav-item.active {
  color: #6366f1;
}

.icon {
  font-size: 1.5rem;
  margin-bottom: 4px;
}
</style>