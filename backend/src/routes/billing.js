const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticate, checkRole } = require('../middleware/auth');

// Custom middleware: admin ko always allow, baki users ko billingAccess check karo
const checkBillingAccess = (req, res, next) => {
    if (req.user.role === 'admin' || req.user.billingAccess === true) {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Access denied. You do not have billing access.' });
};

router.get('/', authenticate, checkBillingAccess, billingController.getAllBillings);
router.get('/:patientId', authenticate, checkBillingAccess, billingController.getBillingByPatient);
router.put('/:patientId', authenticate, checkBillingAccess, billingController.updateBilling);
router.post('/:patientId/sync', authenticate, checkBillingAccess, billingController.syncBillingStatus);
router.post('/:patientId/payments', authenticate, checkBillingAccess, billingController.addPayment);
router.delete('/:patientId/payments/:paymentId', authenticate, checkRole(['admin']), billingController.deletePayment);

module.exports = router;

