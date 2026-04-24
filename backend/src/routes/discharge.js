const express = require('express');
const router = express.Router();
const dischargeController = require('../controllers/dischargeController');
const auth = require('../middleware/auth');

router.get('/:patientId', auth, dischargeController.getDischargeByPatient);
router.post('/', auth, dischargeController.createDischarge);

module.exports = router;
