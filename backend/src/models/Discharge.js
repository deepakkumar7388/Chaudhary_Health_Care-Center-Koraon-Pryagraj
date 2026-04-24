const mongoose = require('mongoose');

const dischargeSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    patientId: { type: String, required: true },
    doctorName: String,
    dischargeDate: Date,
    diagnosis: String,
    summary: String,
    advisedMedicines: [{
        name: String,
        dose: String,
        freq: String,
        duration: String
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Discharge', dischargeSchema);
