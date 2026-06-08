const mongoose = require('mongoose');

const fcmTokenSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userRole: { type: String, default: 'staff' },
    token: { type: String, required: true, unique: true },
    device: { type: String, default: 'browser' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update updatedAt on save
fcmTokenSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('FCMToken', fcmTokenSchema);
