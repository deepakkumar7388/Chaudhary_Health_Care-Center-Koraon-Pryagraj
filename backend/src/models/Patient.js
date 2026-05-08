const mongoose = require('mongoose');

const surgerySchema = new mongoose.Schema({
    surgeryName: String,
    surgeonName: String,
    surgeryDate: Date,
    cost: Number,
    paid: { type: Boolean, default: false }
});

const bedHistorySchema = new mongoose.Schema({
    ward_type: String,
    bed_no: String,
    daily_charge: { type: Number, default: 0 },
    start_date: { type: Date, default: Date.now },
    end_date: { type: Date, default: null }
});

const patientSchema = new mongoose.Schema({
    patient_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    age: Number,
    gender: String,
    guardian_name: String,
    bed_no: String,
    admission_date: { type: Date, default: Date.now },
    discharge_date: Date,
    status: { type: String, enum: ['Admitted', 'Discharged'], default: 'Admitted' },
    payment_status: { type: String, enum: ['Paid', 'Pending'], default: 'Pending' },
    pending_amount: { type: Number, default: 0 },
    problem: String,
    doctor_assigned: String,
    mobile: String,
    address: String,
    surgeries: [surgerySchema],
    wardChargePerDay: Number,
    doctorFees: Number,
    totalBill: Number,
    bedHistory: { type: [bedHistorySchema], default: [] },
    guardianSignature: { type: String, default: null },
    documents: [{ type: String }],
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Patient', patientSchema);
