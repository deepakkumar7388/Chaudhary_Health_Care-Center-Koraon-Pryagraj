const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, checkRole } = require('../middleware/auth');

router.post('/signup', authController.signup);
router.post('/login', authController.login);

// Management (Admin only)
router.get('/users', authenticate, checkRole(['admin']), authController.getUsers);
router.put('/users/:id', authenticate, checkRole(['admin']), authController.updateUser);
router.delete('/users/:id', authenticate, checkRole(['admin']), authController.deleteUser);

module.exports = router;
