const mongoose = require('mongoose');

const dischargeSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    patientId: { type: String, required: true },
    doctorName: String,
    dischargeDate: Date,
    dischargeTime: String,
    diagnosis: String,
    summary: String,
    advisedMedicines: [{
        name: String,
        dose: String,
        freq: String,
        duration: String
    }],
    isMedicalCert: { type: Boolean, default: false },
    symptoms: String,
    advice: String,
    dischargedBy: String,
    createdAt: { type: Date, default: Date.now }
});

// Automatic Real-Time Discharge Event Trigger
dischargeSchema.post('save', async function(doc) {
    try {
        const { emitPatientDischarged } = require('../socket/socketHandler');
        const Patient = require('./Patient');
        const p = await Patient.findOne({ patient_id: doc.patientId }).lean();
        emitPatientDischarged(p || { patient_id: doc.patientId, name: doc.patientId });
    } catch (err) {
        console.error('[Discharge Hook] Error emitting realtime event:', err.message);
    }
});

module.exports = mongoose.model('Discharge', dischargeSchema);
