const Billing = require('../models/Billing');
const Patient = require('../models/Patient');

async function syncPatientBilling(patientId) {
    try {
        const billing = await Billing.findOne({ patient_id: patientId });
        const patient = await Patient.findOne({ patient_id: patientId });
        if (!patient) return;

        let grandTotal = 0;
        let discount = 0;
        let totalPaid = 0;

        if (billing) {
            discount = billing.discount || 0;
            
            // 1. Calculate Bed Stay charges
            if (patient.bedHistory && patient.bedHistory.length > 0) {
                patient.bedHistory.forEach(bed => {
                    const startDate = new Date(bed.start_date);
                    const endDate = bed.end_date ? new Date(bed.end_date) : new Date();
                    const diffTime = Math.abs(endDate - startDate);
                    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays < 1) diffDays = 1;
                    grandTotal += (bed.daily_charge || 0) * diffDays;
                });
            } else if (patient.bed_no) {
                const startDate = new Date(patient.admission_date);
                const endDate = patient.discharge_date ? new Date(patient.discharge_date) : new Date();
                const diffTime = Math.abs(endDate - startDate);
                let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 1) diffDays = 1;
                grandTotal += (patient.wardChargePerDay || 0) * diffDays;
            }

            // 2. Calculate Surgery charges
            if (patient.surgeries && patient.surgeries.length > 0) {
                patient.surgeries.forEach(s => {
                    grandTotal += (s.cost || 0);
                });
            }

            // 3. Add other billing items from the billing record (skip duplicate bed charges / surgery items)
            if (billing.items && billing.items.length > 0) {
                billing.items.forEach(item => {
                    const isBedCharge = item.name.startsWith('Bed Charge');
                    const isSurgery = item.name.startsWith('Surgery:');
                    if (!isBedCharge && !isSurgery) {
                        grandTotal += (item.fee || 0) * (item.days || 1);
                    }
                });
            }

            // 4. Calculate total paid
            if (billing.payments && billing.payments.length > 0) {
                billing.payments.forEach(p => {
                    totalPaid += (p.amount || 0);
                });
            }
        } else {
            grandTotal = patient.totalBill || 0;
        }

        const netPayable = Math.max(0, grandTotal - discount);
        const pendingAmount = Math.max(0, netPayable - totalPaid);
        const paymentStatus = (pendingAmount <= 0 && netPayable > 0) ? 'Paid' : 'Pending';

        patient.totalBill = grandTotal;
        patient.pending_amount = pendingAmount;
        patient.payment_status = paymentStatus;
        await patient.save();
    } catch (err) {
        console.error('Error syncing patient billing:', err);
    }
}

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
        await syncPatientBilling(req.params.patientId);
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
        await syncPatientBilling(req.params.patientId);
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
        await syncPatientBilling(req.params.patientId);
        res.status(200).json({ success: true, payments: billing.payments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
