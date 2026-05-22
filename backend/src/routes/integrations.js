const express = require('express');
const router = express.Router();
const { authenticate, checkRole } = require('../middleware/auth');
const Setting = require('../models/Setting');
const { sendEmail } = require('../config/emailService');
const { sendPushNotification } = require('../config/fcmService');
const { configureCloudinary } = require('../config/cloudinary');

// Get status of all integrations (SMTP, Cloudinary, FCM)
router.get('/status', authenticate, checkRole(['admin']), async (req, res) => {
    try {
        // SMTP Check
        const host = await Setting.findOne({ key: 'email-host' });
        const user = await Setting.findOne({ key: 'email-user' });
        const pass = await Setting.findOne({ key: 'email-pass' });
        const isSmtpConfigured = !!(host?.value && user?.value && pass?.value) || !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

        // Cloudinary Check
        const isCloudinaryConfigured = await configureCloudinary();

        // FCM Check
        const { admin } = require('../config/firebase');
        const isFcmConfigured = !!(admin && admin.apps.length > 0);

        res.status(200).json({
            success: true,
            status: {
                smtp: {
                    configured: isSmtpConfigured,
                    details: isSmtpConfigured ? `SMTP Active (${user?.value || process.env.EMAIL_USER})` : 'Not Configured'
                },
                cloudinary: {
                    configured: isCloudinaryConfigured,
                    details: isCloudinaryConfigured ? 'Cloudinary Storage Connected' : 'Not Configured'
                },
                fcm: {
                    configured: isFcmConfigured,
                    details: isFcmConfigured ? 'Firebase Cloud Messaging Initialized' : 'Not Configured'
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Test SMTP Email Service
router.post('/test-email', authenticate, checkRole(['admin']), async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Recipient email is required' });
        }

        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #10b981;">SMTP Integration Test Successful!</h2>
                <p>Hello Admin,</p>
                <p>This is a test email from your Hospital Management System (Chaudhary Health Care). Your SMTP configurations are working perfectly!</p>
                <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">Sent at: ${new Date().toLocaleString()}</p>
            </div>
        `;

        await sendEmail({
            to: email,
            subject: 'SMTP Connection Test - Hospital Management System',
            html
        });

        res.status(200).json({ success: true, message: 'Test email sent successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'SMTP Test Failed: ' + error.message });
    }
});

// Test FCM Push Notification
router.post('/test-fcm', authenticate, checkRole(['admin']), async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ success: false, message: 'FCM Token is required' });
        }

        const result = await sendPushNotification(
            token,
            'Test Push Notification 🔔',
            'FCM configuration is active. Push notifications are working perfectly!'
        );

        if (result.success) {
            res.status(200).json({ success: true, message: 'Test push notification sent successfully' });
        } else {
            res.status(500).json({ success: false, message: 'FCM Test Failed: ' + result.message });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'FCM Test Failed: ' + error.message });
    }
});

// Get public Firebase config for FCM client setup
router.get('/config', authenticate, (req, res) => {
    res.status(200).json({
        success: true,
        config: {
            apiKey: process.env.FCM_API_KEY,
            projectId: process.env.FIREBASE_PROJECT_ID,
            messagingSenderId: process.env.FCM_MESSAGING_SENDER_ID,
            appId: process.env.FCM_APP_ID,
            vapidKey: process.env.FCM_VAPID_KEY
        }
    });
});

module.exports = router;
