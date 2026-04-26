const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { authenticate, checkRole } = require('../middleware/auth');

router.get('/', authenticate, settingController.getSettings);
router.post('/', authenticate, checkRole(['admin']), settingController.updateSettings);

module.exports = router;
