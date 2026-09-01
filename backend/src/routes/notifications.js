const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const FCMToken = require('../models/FCMToken');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { admin } = require('../config/firebase');

// ==================== GET LIVE NOTIFICATIONS ====================
// Returns live hospital notifications from real MongoDB patient & system events
router.get('/', authenticate, async (req, res) => {
    try {
        const notifications = [];

        // 1. Recent Patient Admissions & Discharges
        const recentPatients = await Patient.find({ isDeleted: false })
            .sort({ createdAt: -1 })
            .limit(12)
            .lean();

        recentPatients.forEach(p => {
            const isDischarged = p.status === 'Discharged';
            if (isDischarged && p.discharge_date) {
                notifications.push({
                    id: `discharge_${p._id}`,
                    title: `Patient Discharged: ${p.name}`,
                    message: `${p.patient_type || 'IPD'} Patient ${p.name} (ID: ${p.patient_id}) was discharged. Pending balance: ₹${p.pending_amount || 0}.`,
                    timestamp: p.discharge_date || p.createdAt,
                    type: 'success',
                    category: 'discharge'
                });
            }

            notifications.push({
                id: `admission_${p._id}`,
                title: `New ${p.patient_type || 'IPD'} Admission: ${p.name}`,
                message: `${p.name} (ID: ${p.patient_id}) admitted with "${p.problem || 'General Checkup'}". Assigned to ${p.doctor_assigned || 'Duty Doctor'}${p.bed_no ? ` on Bed ${p.bed_no}` : ''}.`,
                timestamp: p.createdAt || p.admission_date,
                type: p.patient_type === 'IPD' ? 'info' : 'success',
                category: 'admission'
            });
        });

        // 2. Pending User Approvals (for Admin & Developer)
        if (req.user?.role === 'admin' || req.user?.role === 'developer') {
            const pendingUsers = await User.find({ status: 'pending' }).lean();
            pendingUsers.forEach(u => {
                notifications.push({
                    id: `user_pending_${u._id}`,
                    title: `Pending User Approval: ${u.name}`,
                    message: `${u.name} (${u.email}) registered as ${u.role}. Needs administrator verification.`,
                    timestamp: u.createdAt || new Date(),
                    type: 'warning',
                    category: 'security'
                });
            });
        }

        // 3. System Connection Status
        notifications.push({
            id: 'sys_online',
            title: 'Database Synchronized',
            message: 'HMS Core v2.0 is actively connected to MongoDB Cloud Atlas database.',
            timestamp: new Date(Date.now() - 3600000),
            type: 'info',
            category: 'system'
        });

        // Sort by timestamp descending
        notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json({
            success: true,
            total: notifications.length,
            notifications: notifications.slice(0, 20)
        });
    } catch (err) {
        console.error('[Notifications] Fetch error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
});

// ==================== SUBSCRIBE ====================

// Save or update FCM token for a user
router.post('/subscribe', authenticate, async (req, res) => {
    try {
        const { token, device } = req.body;
        const userId = req.user?.id || req.user?._id?.toString();
        const userRole = req.user?.role || 'staff';

        if (!token) {
            return res.status(400).json({ success: false, message: 'FCM token is required' });
        }

        // Upsert: if token exists update, else create
        await FCMToken.findOneAndUpdate(
            { token },
            { userId, userRole, device: device || 'browser', updatedAt: new Date() },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: 'Subscribed to push notifications' });
    } catch (err) {
        console.error('[FCM] Subscribe error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to subscribe' });
    }
});

// ==================== UNSUBSCRIBE ====================
router.post('/unsubscribe', authenticate, async (req, res) => {
    try {
        const { token } = req.body;
        if (token) {
            await FCMToken.deleteOne({ token });
        }
        res.json({ success: true, message: 'Unsubscribed from notifications' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to unsubscribe' });
    }
});

// ==================== SEND NOTIFICATION (internal helper exported) ====================
// Also exposed as a test endpoint for admins
router.post('/send', authenticate, async (req, res) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin only' });
    }
    try {
        const { title, body, targetRole, url } = req.body;
        const result = await sendFCMToRole(targetRole || 'all', title, body, { url });
        res.json({ success: true, sent: result.sent, failed: result.failed });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==================== INTERNAL SEND HELPERS ====================

/**
 * Send FCM notification to all users of a specific role (or 'all')
 */
async function sendFCMToRole(role, title, body, data = {}) {
    try {
        if (!admin || !admin.messaging) {
            console.warn('[FCM] Firebase Admin not initialized. Skipping notification.');
            return { sent: 0, failed: 0 };
        }

        // Get tokens for target role
        const query = role === 'all' ? {} : { userRole: role };
        const tokenDocs = await FCMToken.find(query).lean();

        if (!tokenDocs.length) return { sent: 0, failed: 0 };

        const tokens = tokenDocs.map(t => t.token);
        const invalidTokens = [];
        let sent = 0;
        let failed = 0;

        // Send in batches of 500 (FCM limit)
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
                        sent++;
                    } else {
                        failed++;
                        // Collect invalid/expired tokens for cleanup
                        if (resp.error?.code === 'messaging/registration-token-not-registered') {
                            invalidTokens.push(batch[idx]);
                        }
                    }
                });
            } catch (batchErr) {
                console.error('[FCM] Batch send error:', batchErr.message);
                failed += batch.length;
            }
        }

        // Cleanup invalid tokens
        if (invalidTokens.length) {
            await FCMToken.deleteMany({ token: { $in: invalidTokens } });
            console.log(`[FCM] Removed ${invalidTokens.length} invalid tokens`);
        }

        console.log(`[FCM] Sent: ${sent}, Failed: ${failed}`);
        return { sent, failed };
    } catch (err) {
        console.error('[FCM] sendFCMToRole error:', err.message);
        return { sent: 0, failed: 0 };
    }
}

module.exports = router;
module.exports.sendFCMToRole = sendFCMToRole;
