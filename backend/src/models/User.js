const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String },
    username: { type: String, unique: true, sparse: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'doctor', 'receptionist', 'staff'], default: 'staff' },
    status: { type: String, enum: ['active', 'pending', 'rejected'], default: 'pending' },
    avatar: { type: String }, // Stores image URL or base64
    billingAccess: { type: Boolean, default: false }, // Admin-controlled billing access
    fcmToken: { type: String }, // Browser push notification token
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

// Index for optimizing pending user status check and expiration cleanup
userSchema.index({ status: 1, createdAt: 1 });

// Hash password before saving
userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    this.password = await require('bcryptjs').hash(this.password, 10);
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
