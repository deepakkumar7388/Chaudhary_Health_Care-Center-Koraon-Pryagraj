const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticate, checkRole } = require('../middleware/auth');

router.get('/', authenticate, billingController.getAllBillings);
router.get('/:patientId', authenticate, billingController.getBillingByPatient);
router.put('/:patientId', authenticate, billingController.updateBilling);
router.post('/:patientId/payments', authenticate, billingController.addPayment);
router.delete('/:patientId/payments/:paymentId', authenticate, checkRole(['admin']), billingController.deletePayment);

module.exports = router;
