const Discharge = require('../models/Discharge');
const Patient = require('../models/Patient');
const { emitPatientDischarged } = require('../socket/socketHandler');
const fcmService = require('../config/fcmService');

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

            // Emit real-time Socket.IO discharge event
            emitPatientDischarged(patient);

            // Send FCM discharge notification (controlled by setting)
            setTimeout(async () => {
                try {
                    const Setting = require('../models/Setting');
                    const notifyDischargeSetting = await Setting.findOne({ key: 'email-discharge' });
                    const isNotifyEnabled = notifyDischargeSetting
                        ? (notifyDischargeSetting.value === true || notifyDischargeSetting.value === 'true')
                        : true; // Default: ON

                    if (isNotifyEnabled) {
                        await fcmService.broadcastNotification(
                            '✅ Patient Discharged',
                            `${patient.name} has been discharged from the hospital.`,
                            { url: '/#patients' },
                            'admin'
                        );
                    }
                } catch (err) {
                    console.error('[Notification] Error in discharge notification broadcast:', err.message);
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
