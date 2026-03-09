import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192x192.png', 'pwa-512x512.png', 'favicon.ico'],
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
      }
    })
  ]
})