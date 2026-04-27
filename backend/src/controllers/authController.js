const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.signup = async (req, res) => {
    try {
        const { name, email, mobile, username, password, role, status: requestedStatus } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Check if this is the first user or if request is from an admin
        const userCount = await User.countDocuments();
        
        let status = 'pending';
        let finalRole = role || 'staff';

        if (userCount === 0) {
            status = 'active';
            finalRole = 'admin';
        } else {
            // If an authenticated admin is creating the user, use provided status/role
            const authHeader = req.headers.authorization;
            if (authHeader) {
                try {
                    const token = authHeader.split(' ')[1];
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    const creator = await User.findById(decoded.userId);
                    if (creator && creator.role === 'admin') {
                        status = requestedStatus || 'active';
                        finalRole = role || 'staff';
                    }
                } catch (e) {
                    // Fallback to pending if token is invalid
                }
            }
        }

        const newUser = new User({ name, email, mobile, username, password, role: finalRole, status });
        await newUser.save();

        res.status(201).json({
            success: true,
            message: status === 'active' ? 'Account created and activated!' : 'Account created! Pending admin approval.'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ success: false, message: `Account is ${user.status}` });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            success: true,
            token,
            user_id: user._id,
            username: user.username,
            name: user.name,
            role: user.role,
            email: user.email,
            mobile: user.mobile
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Verify Current Password
exports.verifyPassword = async (req, res) => {
    try {
        const { currentPassword } = req.body;
        const user = await User.findById(req.userData.userId);

        if (!user || !(await user.comparePassword(currentPassword))) {
            return res.status(401).json({ success: false, message: 'Incorrect current password.' });
        }

        res.status(200).json({ success: true, message: 'Password verified.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const targetId = req.params.id;
        const requesterId = req.userData.userId;
        const requesterRole = req.userData.role;

        // Security Check: Only Admin OR the User themselves can update the profile
        if (requesterRole !== 'admin' && requesterId !== targetId) {
            return res.status(403).json({ success: false, message: 'Access denied. You can only update your own profile.' });
        }

        const { password, ...updateData } = req.body;
        
        // Handle Avatar File
        if (req.file) {
            updateData.avatar = `/uploads/avatars/${req.file.filename}`;
        }

        // Prevent non-admins from changing their own role or status
        if (requesterRole !== 'admin') {
            delete updateData.role;
            delete updateData.status;
        }

        if (password) {
            updateData.password = await require('bcryptjs').hash(password, 10);
        }
        
        const user = await User.findByIdAndUpdate(targetId, updateData, { new: true }).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.status(200).json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Forgot Password - Send OTP
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'No account found with this email address.' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordToken = otp;
        user.resetPasswordExpires = Date.now() + 600000; // Valid for 10 minutes
        await user.save();

        // Email Transport Configuration
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || 'dk21230621@gmail.com', // Fallback to user email if env not set
                pass: process.env.EMAIL_PASS || 'your_app_password_here'
            }
        });

        const mailOptions = {
            from: `"Chaudhary Health Care" <${process.env.EMAIL_USER || 'dk21230621@gmail.com'}>`,
            to: email,
            subject: 'Password Reset OTP - Hospital Management System',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">
                    <h2 style="color: #4CAF50;">Password Reset Request</h2>
                    <p>Hello <strong>${user.name}</strong>,</p>
                    <p>We received a request to reset your password. Use the following 6-digit OTP to complete the process:</p>
                    <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #333; border-radius: 5px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #999;">If you did not request this, please ignore this email or contact support.</p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            res.status(200).json({ success: true, message: 'OTP has been sent to your email.' });
        } catch (mailError) {
            console.error('Mail Sending Failed:', mailError);
            // Development Fallback: If mail fails, tell the user the OTP (for testing only)
            if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_PASS || process.env.EMAIL_PASS === 'your_app_password_here') {
                res.status(200).json({ 
                    success: true, 
                    message: 'Email service not configured. [DEBUG MODE] Your OTP is: ' + otp,
                    debugOtp: otp 
                });
            } else {
                throw mailError;
            }
        }

    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ success: false, message: 'Failed to process request. ' + error.message });
    }
};

// Verify OTP Only
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({
            email,
            resetPasswordToken: otp,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
        }

        res.status(200).json({ success: true, message: 'OTP verified successfully.' });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Verify OTP & Reset Password
exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        const user = await User.findOne({
            email,
            resetPasswordToken: otp,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please try again.' });
        }

        // Set new password
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ success: true, message: 'Password has been reset successfully. You can now login.' });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
