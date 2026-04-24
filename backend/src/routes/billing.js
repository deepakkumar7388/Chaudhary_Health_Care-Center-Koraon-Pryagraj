const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const auth = require('../middleware/auth');

router.get('/:patientId', auth, billingController.getBillingByPatient);
router.put('/:patientId', auth, billingController.updateBilling);
router.post('/:patientId/payments', auth, billingController.addPayment);
router.delete('/:patientId/payments/:paymentId', auth, billingController.deletePayment);

module.exports = router;
