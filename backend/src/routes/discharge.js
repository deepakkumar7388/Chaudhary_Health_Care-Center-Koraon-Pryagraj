const express = require('express');
const router = express.Router();
const dischargeController = require('../controllers/dischargeController');
const { authenticate } = require('../middleware/auth');

router.get('/:patientId', authenticate, dischargeController.getDischargeByPatient);
router.post('/', authenticate, dischargeController.createDischarge);

module.exports = router;
