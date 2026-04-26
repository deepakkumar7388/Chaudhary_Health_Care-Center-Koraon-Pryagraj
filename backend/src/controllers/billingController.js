const Billing = require('../models/Billing');

// Get all billing records (for dashboard analytics)
exports.getAllBillings = async (req, res) => {
    try {
        const billings = await Billing.find({});
        res.status(200).json({ success: true, billings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getBillingByPatient = async (req, res) => {
    try {
        const billing = await Billing.findOne({ patient_id: req.params.patientId });
        if (!billing) {
            return res.status(200).json({ success: true, billing: { items: [], payments: [], discount: 0 } });
        }
        res.status(200).json({ success: true, billing });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateBilling = async (req, res) => {
    try {
        const billing = await Billing.findOneAndUpdate(
            { patient_id: req.params.patientId },
            { ...req.body, updatedAt: Date.now() },
            { new: true, upsert: true }
        );
        res.status(200).json({ success: true, billing });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.addPayment = async (req, res) => {
    try {
        const billing = await Billing.findOne({ patient_id: req.params.patientId });
        if (!billing) return res.status(404).json({ success: false, message: 'Billing record not found' });
        
        billing.payments.push(req.body);
        await billing.save();
        res.status(200).json({ success: true, payments: billing.payments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deletePayment = async (req, res) => {
    try {
        const billing = await Billing.findOne({ patient_id: req.params.patientId });
        if (!billing) return res.status(404).json({ success: false, message: 'Billing record not found' });
        
        billing.payments = billing.payments.filter(p => String(p._id) !== req.params.paymentId);
        await billing.save();
        res.status(200).json({ success: true, payments: billing.payments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
