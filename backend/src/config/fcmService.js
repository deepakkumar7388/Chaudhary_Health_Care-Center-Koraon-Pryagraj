const { admin } = require('./firebase');
const FCMToken = require('../models/FCMToken');

/**
 * Send push notification to a single FCM token
 */
async function sendPushNotification(token, title, body, data = {}) {
    if (!admin || !admin.apps || !admin.apps.length) {
        console.warn('[FCM] Firebase Admin not initialized. Skipping push notification.');
        return { success: false };
    }

    try {
        const message = {
            token,
            notification: { title, body },
            webpush: {
                notification: {
                    title,
                    body,
                    icon: '/hlogo.png',
                    badge: '/hlogo.png',
                    vibrate: [200, 100, 200]
                },
                fcmOptions: { link: data.url || '/' }
            },
            data: Object.fromEntries(
                Object.entries({ url: '/', ...data }).map(([k, v]) => [k, String(v)])
            )
        };

        const response = await admin.messaging().send(message);
        return { success: true, response };
    } catch (error) {
        // Remove invalid tokens automatically
        if (error.code === 'messaging/registration-token-not-registered') {
            await FCMToken.deleteOne({ token }).catch(() => {});
            console.log('[FCM] Removed invalid token');
        } else {
            console.error('[FCM] Send error:', error.message);
        }
        return { success: false, error: error.message };
    }
}

/**
 * Broadcast notification to all users of a given role (or 'all')
 * Uses FCMToken collection (multi-device support)
 */
async function broadcastNotification(title, body, data = {}, role = 'all') {
    if (!admin || !admin.apps || !admin.apps.length) {
        console.warn('[FCM] Firebase Admin not initialized. Skipping broadcast.');
        return { success: false, count: 0 };
    }

    try {
        const query = role === 'all' ? {} : { userRole: role };
        const tokenDocs = await FCMToken.find(query).lean();
        const tokens = tokenDocs.map(t => t.token).filter(Boolean);

        if (tokens.length === 0) {
            console.log('[FCM] No registered tokens found for broadcast.');
            return { success: true, count: 0 };
        }

        console.log(`[FCM] Broadcasting "${title}" to ${tokens.length} devices (role: ${role})`);

        const invalidTokens = [];
        let successCount = 0;

        // Send in batches of 500
        const batchSize = 500;
        for (let i = 0; i < tokens.length; i += batchSize) {
            const batch = tokens.slice(i, i + batchSize);
            try {
                const response = await admin.messaging().sendEachForMulticast({
                    tokens: batch,
                    notification: { title, body },
                    webpush: {
                        notification: {
                            title,
                            body,
                            icon: '/hlogo.png',
                            badge: '/hlogo.png',
                            vibrate: [200, 100, 200],
                            data: { url: data.url || '/', ...data }
                        },
                        fcmOptions: { link: data.url || '/' }
                    },
                    data: Object.fromEntries(
                        Object.entries({ url: '/', ...data }).map(([k, v]) => [k, String(v)])
                    )
                });

                response.responses.forEach((resp, idx) => {
                    if (resp.success) {
                        successCount++;
                    } else if (resp.error?.code === 'messaging/registration-token-not-registered') {
                        invalidTokens.push(batch[idx]);
                    }
                });
            } catch (batchErr) {
                console.error('[FCM] Batch error:', batchErr.message);
            }
        }

        // Cleanup stale tokens
        if (invalidTokens.length) {
            await FCMToken.deleteMany({ token: { $in: invalidTokens } }).catch(() => {});
            console.log(`[FCM] Cleaned ${invalidTokens.length} stale tokens`);
        }

        console.log(`[FCM] Broadcast done. Sent: ${successCount}/${tokens.length}`);
        return { success: true, count: successCount };
    } catch (error) {
        console.error('[FCM] Broadcast error:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = { sendPushNotification, broadcastNotification };
