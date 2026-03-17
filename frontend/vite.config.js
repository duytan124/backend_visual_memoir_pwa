// File: vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'pwa-192x192.jpg', 'pwa-512x512.jpg'],

      // 1. CẤU HÌNH WORKBOX ĐỂ KẾT HỢP CACHE & PUSH
      workbox: {
        importScripts: ['/push-sw.js'],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cloudinary-images',
              expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/backend-visual-memoir-pwa\.onrender\.com\/api\/diaries.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-data-cache',
              expiration: { maxEntries: 100 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },

      manifest: {
        name: 'Visual Memoir AI',
        short_name: 'Visual Memoir',
        description: 'Ghi chép kỷ niệm bằng hình ảnh và AI',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/pwa-192x192.jpg', sizes: '192x192', type: 'image/jpeg' },
          { src: '/pwa-512x512.jpg', sizes: '512x512', type: 'image/jpeg', purpose: 'any maskable' }
        ]
      }
    })
  ]
})