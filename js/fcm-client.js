// ==================== FCM PUSH NOTIFICATIONS ====================
// Handles browser push notification permission and FCM token registration

(function() {
    'use strict';

    const FCM_API_KEY = window.FCM_API_KEY || 'AIzaSyC9b2wqPZboF4FE9sNv47-IQ11iptagutw';
    const FCM_MESSAGING_SENDER_ID = window.FCM_MESSAGING_SENDER_ID || '199385175936';
    const FCM_APP_ID = window.FCM_APP_ID || '1:199385175936:web:835230eccc3d6a93591365';
    const FCM_VAPID_KEY = window.FCM_VAPID_KEY || 'BLb_0R3IlzuMxoCZPGn7j3JxMbPxJMcv5jmK0KBc5_94435OKROkwqnxxpcC0VNXfzqHWi8vNUhze6YQTDYda0E';

    let messaging = null;

    function getToken() {
        try {
            return sessionStorage.getItem('token') || localStorage.getItem('token');
        } catch { return null; }
    }

    // ==================== FIREBASE INIT ====================
    async function initFirebaseMessaging() {
        try {
            // Wait for firebase scripts to load
            if (typeof firebase === 'undefined') {
                console.warn('[FCM] Firebase SDK not loaded. Push notifications unavailable.');
                return false;
            }

            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp({
                    apiKey: FCM_API_KEY,
                    messagingSenderId: FCM_MESSAGING_SENDER_ID,
                    appId: FCM_APP_ID
                });
            }

            messaging = firebase.messaging();
            return true;
        } catch (err) {
            console.error('[FCM] Firebase init error:', err.message);
            return false;
        }
    }

    // ==================== REGISTER SERVICE WORKER ====================
    async function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('[FCM] Service workers not supported');
            return null;
        }
        return null; // PWA completely removed
    }

    // ==================== REQUEST PERMISSION + GET TOKEN ====================
    async function requestNotificationPermission() {
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.log('[FCM] Notification permission denied');
                return null;
            }
            console.log('[FCM] Notification permission granted');

            // Try native FCM token first
            if (messaging) {
                try {
                    const swReg = await registerServiceWorker();
                    const token = await messaging.getToken({
                        vapidKey: FCM_VAPID_KEY,
                        serviceWorkerRegistration: swReg
                    });
                    if (token) {
                        console.log('[FCM] Token obtained:', token.substring(0, 20) + '...');
                        return token;
                    }
                } catch (fcmErr) {
                    console.warn('[FCM] Token generation failed, using SW fallback:', fcmErr.message);
                }
            }

            // Fallback: register SW only (handles push events directly in sw.js)
            await registerServiceWorker();
            return 'sw-only'; // SW registered, no FCM token

        } catch (err) {
            console.error('[FCM] Permission request error:', err.message);
            return null;
        }
    }

    // ==================== SEND TOKEN TO BACKEND ====================
    async function sendTokenToBackend(token) {
        if (!token || token === 'sw-only') return;
        const authToken = getToken();
        if (!authToken) return;

        const apiBase = (window.location.protocol === 'file:' || window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')
            ? 'http://127.0.0.1:5000/api/'
            : 'https://chaudhary-hms-api-h7nl.onrender.com/api/';

        try {
            await fetch(`${apiBase}notifications/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + authToken
                },
                body: JSON.stringify({ token, device: 'browser' })
            });
            console.log('[FCM] Token registered with server');
        } catch (err) {
            console.error('[FCM] Token registration failed:', err.message);
        }
    }

    // ==================== SETUP (called after login) ====================
    async function setupPushNotifications() {
        // Don't ask immediately — wait 3 seconds after login
        setTimeout(async () => {
            try {
                // Skip if already denied
                if (Notification.permission === 'denied') {
                    console.log('[FCM] Notifications previously denied by user.');
                    return;
                }

                // Skip if already granted and token cached
                const cachedToken = localStorage.getItem('fcm_token');
                if (Notification.permission === 'granted' && cachedToken) {
                    await sendTokenToBackend(cachedToken);
                    return;
                }

                await initFirebaseMessaging();
                const token = await requestNotificationPermission();

                if (token && token !== 'sw-only') {
                    localStorage.setItem('fcm_token', token);
                    await sendTokenToBackend(token);
                }
            } catch (err) {
                console.error('[FCM] Setup error:', err.message);
            }
        }, 3000);
    }

    // Foreground message handler
    async function setupForegroundMessages() {
        if (!messaging) return;
        try {
            messaging.onMessage((payload) => {
                console.log('[FCM] Foreground message:', payload);
                const title = payload.notification?.title || 'HMS Alert';
                const body = payload.notification?.body || '';

                // Show using existing notification system
                if (typeof window.showNotification === 'function') {
                    window.showNotification(`🔔 ${title}: ${body}`, 'info');
                } else if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(title, {
                        body,
                        icon: 'hlogo.png',
                        badge: 'hlogo.png'
                    });
                }
            });
        } catch (err) {
            console.warn('[FCM] Foreground handler error:', err.message);
        }
    }

    // ==================== PUBLIC API ====================
    window.hmsFCM = {
        setup: setupPushNotifications,
        setupForeground: setupForegroundMessages
    };

})();
