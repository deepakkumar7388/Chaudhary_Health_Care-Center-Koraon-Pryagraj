const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.signup = async (req, res) => {
    try {
        const { name, email, mobile, username, password, role, status: requestedStatus } = req.body;

        // Check if user exists by email
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'This email is already registered.' });
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

        const finalUsername = username || email.split('@')[0];
        const newUser = new User({ name, email, mobile, username: finalUsername, password, role: finalRole, status });
        await newUser.save();

        res.status(201).json({
            success: true,
            message: status === 'active' ? 'Account created and activated!' : 'Account created! Pending admin approval.'
        });

        // Send welcome email non-blocking (does not delay the API response)
        const { sendWelcomeEmail } = require('../config/emailService');
        sendWelcomeEmail(email, name, finalRole).then(() => {
            console.log(`✅ Welcome email sent to ${email}`);
        }).catch((mailErr) => {
            console.error(`❌ Welcome email failed for ${email}:`, mailErr.message);
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

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

        // Cookie mein JWT token set karo (httpOnly = JS nahi chhoo sakta)
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('token', token, {
            httpOnly: true,                  // XSS se bachao
            secure: isProduction,            // HTTPS par hi chalega (production mein)
            sameSite: isProduction ? 'strict' : 'lax', // CSRF se bachao
            maxAge: 24 * 60 * 60 * 1000     // 24 ghante
        });

        res.status(200).json({
            success: true,
            token, // Purana frontend ka support bana raha hai (Hybrid)
            user_id: user._id,
            username: user.username || user.email.split('@')[0],
            name: user.name,
            role: user.role,
            email: user.email,
            mobile: user.mobile,
            avatar: user.avatar || null
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Logout - Cookie clear karo
exports.logout = (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
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
            const { uploadToCloudinary, configureCloudinary } = require('../config/cloudinary');
            const hasCloudinary = await configureCloudinary();
            if (hasCloudinary) {
                try {
                    const cloudRes = await uploadToCloudinary(req.file.buffer, 'hms/avatars');
                    updateData.avatar = cloudRes.secure_url;
                    console.log('✅ Avatar uploaded to Cloudinary:', cloudRes.secure_url);
                } catch (cloudinaryErr) {
                    console.error('❌ Cloudinary avatar upload error:', cloudinaryErr.message);
                    // Fallback: store as base64 data URI in database
                    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
                    updateData.avatar = base64;
                }
            } else {
                // No Cloudinary configured: store as base64 data URI
                const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
                updateData.avatar = base64;
            }
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

        // Respond IMMEDIATELY to user — don't wait for email delivery
        res.status(200).json({ success: true, message: 'OTP has been sent to your email.' });

        // Send email in background (non-blocking)
        const { sendOtpEmail } = require('../config/emailService');
        sendOtpEmail(email, otp, user.name).then(() => {
            console.log(`✅ OTP email sent successfully to ${email}`);
        }).catch((mailError) => {
            console.error(`❌ Failed to send OTP email to ${email}:`, mailError.message);
        });

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

// Update FCM Token for push notifications
exports.updateFcmToken = async (req, res) => {
    try {
        const { fcmToken } = req.body;
        const userId = req.userData.userId;

        const user = await User.findByIdAndUpdate(userId, { fcmToken }, { new: true });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, message: 'FCM Token updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
