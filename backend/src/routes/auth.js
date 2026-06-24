const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, checkRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOtp);
router.post('/reset-password', authController.resetPassword);
router.post('/logout', authController.logout); // Cookie clear karo
router.post('/verify-password', authenticate, authController.verifyPassword);

// Management (Admin only)
router.get('/users', authenticate, checkRole(['admin']), authController.getUsers);
router.put('/users/:id', authenticate, upload.single('avatar'), authController.updateUser);
router.delete('/users/:id', authenticate, checkRole(['admin']), authController.deleteUser);
router.put('/users/:id/billing-access', authenticate, checkRole(['admin']), authController.toggleBillingAccess);
router.post('/fcm-token', authenticate, authController.updateFcmToken);

module.exports = router;
