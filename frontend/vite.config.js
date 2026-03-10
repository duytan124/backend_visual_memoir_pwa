import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192x192.svg', 'pwa-512x512.svg', 'favicon.ico'],
      manifest: {
        name: 'Visual Memoir AI',
        short_name: 'MemoirAI',
        description: 'Ghi chép kỷ niệm bằng hình ảnh và AI',
        theme_color: '#6366f1',
        icons: [
          {
            src: '/pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg'
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg',
            purpose: 'any maskable'
          }
        ]
      },
      // --- PHẦN CẦN THÊM ĐỂ CHẠY OFFLINE ---
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'], // Cache tất cả tài nguyên build
        runtimeCaching: [
          {
            // Cache hình ảnh từ Cloudinary
            urlPattern: ({ url }) => url.host === 'res.cloudinary.com',
            handler: 'CacheFirst', // Ưu tiên lấy trong bộ nhớ máy
            options: {
              cacheName: 'cloudinary-images',
              expiration: {
                maxEntries: 50, // Giữ tối đa 50 ảnh
                maxAgeSeconds: 30 * 24 * 60 * 60 // Lưu trong 30 ngày
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache dữ liệu danh sách kỷ niệm từ Backend Render
            urlPattern: ({ url }) => url.origin === 'https://backend-visual-memoir-pwa.onrender.com/api/diaries', // Thay bằng link thật của Tân
            handler: 'StaleWhileRevalidate', // Lấy dữ liệu cũ hiện ra trước, sau đó cập nhật dữ liệu mới sau
            options: {
              cacheName: 'api-data-cache',
              expiration: {
                maxEntries: 100
              }
            }
          }
        ]
      }
    })
  ]
})