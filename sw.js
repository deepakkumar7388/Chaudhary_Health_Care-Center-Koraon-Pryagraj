// Service Worker for Firebase Cloud Messaging (FCM)
// Handles background push notifications when app is closed/minimized

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Firebase config — must be hardcoded here since SW has no DOM/localStorage access
const firebaseConfig = {
    apiKey: 'AIzaSyC9b2wqPZboF4FE9sNv47-IQ11iptagutw',
    authDomain: 'hos-management-ce6e8.firebaseapp.com',
    projectId: 'hos-management-ce6e8',
    storageBucket: 'hos-management-ce6e8.appspot.com',
    messagingSenderId: '199385175936',
    appId: '1:199385175936:web:835230eccc3d6a93591365'
};

// Initialize Firebase in service worker
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

// Handle background messages (when app tab is not active)
messaging.onBackgroundMessage(function(payload) {
    console.log('[Service Worker] Background message received:', payload);

    const title = payload.notification?.title || 'CHC Hospital Alert';
    const options = {
        body: payload.notification?.body || 'You have a new update.',
        icon: '/hlogo.png',
        badge: '/hlogo.png',
        vibrate: [200, 100, 200],
        tag: 'hms-notification',
        data: payload.data || {},
        actions: [
            { action: 'open', title: 'Open HMS' }
        ]
    };

    self.registration.showNotification(title, options);
});

// Handle foreground push (fallback for non-FCM push)
self.addEventListener('push', function(event) {
    if (!event.data) return;

    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        data = { title: 'CHC Alert', body: event.data.text() };
    }

    const title = data.notification?.title || data.title || 'Chaudhary Health Care Center';
    const options = {
        body: data.notification?.body || data.body || 'You have a new hospital update.',
        icon: '/hlogo.png',
        badge: '/hlogo.png',
        data: data.data || {},
        vibrate: [200, 100, 200],
        tag: data.tag || 'hms-notification'
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click — open or focus the HMS app
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(windowClients) {
                for (let i = 0; i < windowClients.length; i++) {
                    const client = windowClients[i];
                    if ('focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});
