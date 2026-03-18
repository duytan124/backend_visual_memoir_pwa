// File: public/push-sw.js
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/pwa-192x192.jpg', // Dùng luôn icon PWA của bạn
            badge: '/pwa-192x192.jpg',
            vibrate: [200, 100, 200, 100, 200],
            data: { url: data.url || '/' }
        };
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});