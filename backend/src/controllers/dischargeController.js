const Discharge = require('../models/Discharge');
const Patient = require('../models/Patient');

exports.createDischarge = async (req, res) => {
    try {
        const { patientId, dischargeDate } = req.body;
        
        // Save discharge record
        const newDischarge = new Discharge(req.body);
        await newDischarge.save();
        
        // Update patient status to Discharged
        await Patient.findOneAndUpdate(
            { patient_id: patientId },
            { status: 'Discharged', discharge_date: dischargeDate }
        );
        
        res.status(201).json({ success: true, discharge: newDischarge });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getDischargeByPatient = async (req, res) => {
    try {
        const discharge = await Discharge.findOne({ patientId: req.params.patientId }).sort({ createdAt: -1 });
        if (!discharge) return res.status(404).json({ success: false, message: 'Discharge record not found' });
        res.status(200).json({ success: true, discharge });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
