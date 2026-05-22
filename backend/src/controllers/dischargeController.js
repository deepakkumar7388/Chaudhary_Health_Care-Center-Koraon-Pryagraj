const Discharge = require('../models/Discharge');
const Patient = require('../models/Patient');

exports.createDischarge = async (req, res) => {
    try {
        const { patientId, dischargeDate, dischargeTime } = req.body;
        
        // Save discharge record
        const newDischarge = new Discharge(req.body);
        await newDischarge.save();
        
        // Update patient status to Discharged and close active bed history stay
        const patient = await Patient.findOne({ patient_id: patientId });
        if (patient) {
            patient.status = 'Discharged';
            patient.discharge_date = dischargeDate || Date.now();
            patient.discharge_time = dischargeTime || '';
            
            if (patient.bedHistory && patient.bedHistory.length > 0) {
                const lastBed = patient.bedHistory[patient.bedHistory.length - 1];
                if (!lastBed.end_date) {
                    lastBed.end_date = dischargeDate || Date.now();
                }
            }
            await patient.save();

            // Send discharge email asynchronously in the background
            setTimeout(async () => {
                try {
                    const Setting = require('../models/Setting');
                    const emailDischargeSetting = await Setting.findOne({ key: 'email-discharge' });
                    const isEmailEnabled = emailDischargeSetting ? (emailDischargeSetting.value === true || emailDischargeSetting.value === 'true') : false;

                    if (isEmailEnabled && patient.email) {
                        const emailService = require('../config/emailService');
                        await emailService.sendDischargeEmail(patient.email, patient, newDischarge);
                        console.log(`[Notification] Discharge email sent successfully to ${patient.email}`);
                    }
                } catch (err) {
                    console.error('[Notification] Error in discharge email background process:', err.message);
                }
            }, 0);
        }
        
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
