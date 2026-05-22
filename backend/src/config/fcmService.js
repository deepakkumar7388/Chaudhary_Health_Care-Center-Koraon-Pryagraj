const { admin } = require('./firebase');
const Setting = require('../models/Setting');
const User = require('../models/User');

/**
 * Sends a push notification to a specific FCM device token.
 * @param {string} token - FCM registration token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} [data] - Optional metadata payload
 */
async function sendPushNotification(token, title, body, data = {}) {
    if (!admin || !admin.apps.length) {
        console.warn('Firebase Admin is not initialized. Cannot send push notification.');
        return { success: false, message: 'Firebase Admin not initialized' };
    }

    const message = {
        notification: {
            title,
            body
        },
        data: data || {},
        token: token
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('FCM Notification sent successfully:', response);
        return { success: true, response };
    } catch (error) {
        console.error('Error sending FCM notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Sends a notification to all active staff/admins who have registered tokens.
 * Useful for emergency notifications or admission alerts.
 */
async function broadcastNotification(title, body, data = {}) {
    try {
        const users = await User.find({ status: 'active', fcmToken: { $exists: true, $ne: null } });
        const tokens = users.map(u => u.fcmToken).filter(t => t);

        if (tokens.length === 0) {
            console.log('No registered FCM tokens found for broadcast.');
            return { success: true, count: 0 };
        }

        console.log(`Broadcasting push notification to ${tokens.length} devices...`);
        const sendPromises = tokens.map(token => sendPushNotification(token, title, body, data));
        const results = await Promise.all(sendPromises);

        return {
            success: true,
            totalSent: tokens.length,
            successCount: results.filter(r => r.success).length
        };
    } catch (error) {
        console.error('FCM Broadcast Error:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendPushNotification,
    broadcastNotification
};
