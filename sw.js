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
        icon: 'hlogo.png',
        badge: 'hlogo.png',
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
        icon: 'hlogo.png',
        badge: 'hlogo.png',
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

// ==================== PWA OFFLINE CACHING ====================
// Cache name and assets to cache for offline capabilities
const CACHE_NAME = 'chc-koraon-cache-v1';
const ASSETS_TO_CACHE = [
    './',
    'index.html',
    'css/style.css',
    'css/dashboard.css',
    'css/patient.css',
    'css/add-patient.css',
    'css/daily-notes.css',
    'js/main.js',
    'js/realtime.js',
    'js/patients.js',
    'js/settings.js',
    'js/billing.js',
    'js/fcm-client.js',
    'hlogo-192.png',
    'hlogo-512.png'
];

// Install Event - Pre-cache critical assets
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('[Service Worker] Pre-caching offline assets');
            return cache.addAll(ASSETS_TO_CACHE).catch(function(err) {
                console.warn('[Service Worker] Pre-caching warning:', err);
            });
        })
    );
    self.skipWaiting();
});

// Activate Event - Clean up outdated caches
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cache) {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Clearing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event - Network first, falling back to cache
self.addEventListener('fetch', function(event) {
    // Only cache GET requests
    if (event.request.method !== 'GET') return;

    // Do not intercept external API requests (e.g. Firebase or backend APIs)
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        fetch(event.request)
            .then(function(response) {
                // If network request is successful, cache it and return response
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(function() {
                // If offline or network fails, fallback to cache
                return caches.match(event.request);
            })
    );
});
