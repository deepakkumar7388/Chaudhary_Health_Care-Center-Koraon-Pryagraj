const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    id: { type: String, default: Date.now },
    amount: Number,
    date: { type: Date, default: Date.now },
    mode: String,
    performed_by: String
});

const billingSchema = new mongoose.Schema({
    patient_id: { type: String, required: true, ref: 'Patient' },
    discount: { type: Number, default: 0 },
    items: [{
        fee: Number,
        days: Number,
        name: String
    }],
    payments: [paymentSchema],
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Billing', billingSchema);
