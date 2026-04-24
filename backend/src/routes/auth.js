const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/signup', authController.signup);
router.post('/login', authController.login);

// Management (Admin only)
router.get('/users', auth, authController.getUsers);
router.put('/users/:id', auth, authController.updateUser);
router.delete('/users/:id', auth, authController.deleteUser);

module.exports = router;
