const mongoose = require('mongoose');

const dailyNoteSchema = new mongoose.Schema({
    patient_id: { type: String, required: true },
    type: { type: String, enum: ['vitals', 'medication'], required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    
    // Vitals fields
    pulse: String,
    bp: String,
    temp: String,
    spo2: String,
    rbs: String,
    
    // Medication fields
    medType: String,
    drugName: String,
    dose: String,
    status: { type: String, enum: ['Pending', 'Given'], default: 'Pending' },
    doneBy: String,
    doneTime: String,
    
    addedBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DailyNote', dailyNoteSchema);
