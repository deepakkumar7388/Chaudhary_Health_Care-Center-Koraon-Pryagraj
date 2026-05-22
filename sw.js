// Service Worker for Firebase Cloud Messaging (FCM)
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Since service worker cannot access localStorage or DOM, we listen to push events directly or initialize Firebase if we have the config.
// When a push is received, the browser fires a 'push' event. We can capture it and display a rich visual notification.

self.addEventListener('push', function(event) {
    console.log('[Service Worker] Push Received.');
    
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'Notification', body: event.data.text() };
        }
    }

    // Default values if notification properties are missing
    const title = data.notification?.title || data.title || 'Chaudhary Health Care Alert';
    const options = {
        body: data.notification?.body || data.body || 'You have a new update.',
        icon: '/hlogo.png',
        badge: '/hlogo.png',
        data: data.data || {},
        vibrate: [200, 100, 200],
        tag: data.tag || 'hms-notification',
        renew: true
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
    console.log('[Service Worker] Notification click Received.');
    event.notification.close();

    // Open index page or specific url if provided in data
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function(windowClients) {
            // Check if there is already a window open
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not open, open a new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
