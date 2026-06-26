const User = require('../models/User');
const jwt = require('jsonwebtoken');

// In-memory cache for signup OTPs (Email -> { otp, userData, expiresAt })
const signupOtpCache = new Map();

exports.signup = async (req, res) => {
    try {
        const { name, email, mobile, username, password, role, status: requestedStatus } = req.body;

        // Check if user exists by email
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'This email is already registered.' });
        }

        // Check if this is the first user
        const userCount = await User.countDocuments();
        
        let status = 'pending';
        let finalRole = role || 'staff';

        // 🔒 SECURITY: Nobody can create a developer account through signup
        if (finalRole === 'developer') finalRole = 'staff';

        let isAdminCreation = false;

        if (userCount === 0) {
            status = 'active';
            finalRole = 'admin';
            isAdminCreation = true; // First user is implicitly trusted
        } else {
            // If an authenticated admin/developer is creating the user, use provided status/role
            const authHeader = req.headers.authorization;
            if (authHeader) {
                try {
                    const token = authHeader.split(' ')[1];
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    const creator = await User.findById(decoded.userId);
                    if (creator && (creator.role === 'admin' || creator.role === 'developer')) {
                        status = requestedStatus || 'active';
                        finalRole = role || 'staff';
                        // 🔒 Even admin/developer cannot create another developer account
                        if (finalRole === 'developer') finalRole = 'admin';
                        isAdminCreation = true;
                    }
                } catch (e) {
                    // Fallback to public signup if token is invalid
                }
            }
        }

        const finalUsername = username || email.split('@')[0];

        // If it's an Admin creating the account, bypass OTP and save immediately
        if (isAdminCreation) {
            const newUser = new User({ name, email, mobile, username: finalUsername, password, role: finalRole, status });
            await newUser.save();

            res.status(201).json({
                success: true,
                message: status === 'active' ? 'Account created and activated!' : 'Account created! Pending admin approval.'
            });

            // Send welcome email non-blocking
            const { sendWelcomeEmail } = require('../config/emailService');
            sendWelcomeEmail(email, name, finalRole).then(() => {
                console.log(`✅ Welcome email sent to ${email}`);
            }).catch((mailErr) => {
                console.error(`❌ Welcome email failed for ${email}:`, mailErr.message);
            });
            return;
        }

        // --- PUBLIC SIGNUP (OTP REQUIRED) --- //
        
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store in cache for 10 minutes
        signupOtpCache.set(email, {
            otp,
            userData: { name, email, mobile, username: finalUsername, password, role: finalRole, status },
            expiresAt: Date.now() + 10 * 60 * 1000
        });

        // Send OTP Email
        const { sendOtpEmail } = require('../config/emailService');
        await sendOtpEmail(email, otp, name);

        res.status(200).json({ 
            success: true, 
            requiresOtp: true, 
            message: 'OTP sent to your email. Please verify to complete signup.' 
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.verifySignupOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const cached = signupOtpCache.get(email);
        if (!cached) {
            return res.status(400).json({ success: false, message: 'OTP expired or email not found. Please sign up again.' });
        }

        if (cached.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP.' });
        }

        if (Date.now() > cached.expiresAt) {
            signupOtpCache.delete(email);
            return res.status(400).json({ success: false, message: 'OTP has expired. Please sign up again.' });
        }

        // OTP is valid. Create the user.
        const { name, mobile, username, password, role, status } = cached.userData;
        
        const newUser = new User({ name, email, mobile, username, password, role, status });
        await newUser.save();

        // Clear cache
        signupOtpCache.delete(email);

        res.status(201).json({
            success: true,
            message: status === 'active' ? 'Account created and activated!' : 'Account created! Pending admin approval.'
        });

        // Send welcome email non-blocking
        const { sendWelcomeEmail } = require('../config/emailService');
        sendWelcomeEmail(email, name, role).then(() => {
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

        // 🔒 SECURITY: Developer role is exclusively reserved for authorized emails
        if (user.role === 'developer' && user.email !== 'chaudharyhealthcare198@gmail.com' && user.email !== 'dk21230621@gmail.com') {
            return res.status(403).json({ success: false, message: 'Access denied. Contact system administrator.' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ success: false, message: `Account is ${user.status}` });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Save current session token for Single Active Session
        user.currentSessionToken = token;
        await user.save();

        // Send security alert email for Developer and Admin
        if (user.role === 'developer' || user.role === 'admin') {
            const { sendSecurityAlertEmail } = require('../config/emailService');
            sendSecurityAlertEmail(user.email, user.name, req.ip, req.headers['user-agent']).catch(err => {
                console.error('Failed to send security alert email:', err.message);
            });
        }

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
            avatar: user.avatar || null,
            // Developer & Admin always have full billing access
            billingAccess: (user.role === 'developer' || user.role === 'admin') ? true : (user.billingAccess || false)
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

// Google Single Sign-On (SSO)
exports.googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) return res.status(400).json({ success: false, message: 'Google ID Token is required' });

        // Verify Firebase Token
        const { admin } = require('../config/firebase');
        if (!admin || admin.apps.length === 0) {
            return res.status(500).json({ success: false, message: 'Firebase Admin not configured on server' });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const email = decodedToken.email;

        if (!email) return res.status(400).json({ success: false, message: 'No email found in Google token' });

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Account not found. Please sign up first.' });
        }

        // 🔒 SECURITY: Developer account CANNOT use Google Login
        if (user.role === 'developer') {
            return res.status(403).json({ success: false, message: 'Developer account cannot use Google Login for security reasons. Please use email and password.' });
        }

        // Status check
        if (user.status !== 'active') {
            return res.status(403).json({ success: false, message: `Your account is currently ${user.status}. Please wait for admin approval.` });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Save session
        user.currentSessionToken = token;
        await user.save();

        // Send security alert (Optional for Google login, but good practice for Admin)
        if (user.role === 'admin') {
            const { sendSecurityAlertEmail } = require('../config/emailService');
            sendSecurityAlertEmail(user.email, user.name, req.ip, req.headers['user-agent']).catch(err => {
                console.error('Failed to send security alert email:', err.message);
            });
        }

        // Set Cookie
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('token', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            success: true,
            token,
            user_id: user._id,
            username: user.username || user.email.split('@')[0],
            name: user.name,
            role: user.role,
            email: user.email,
            mobile: user.mobile,
            avatar: user.avatar || null,
            billingAccess: (user.role === 'developer' || user.role === 'admin') ? true : (user.billingAccess || false)
        });
    } catch (error) {
        console.error('Google Login Error:', error);
        res.status(401).json({ success: false, message: 'Invalid Google Token. ' + error.message });
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
        const requesterRole = req.userData?.role;
        let query = {};

        // 🔒 SECURITY: Developer accounts are NEVER visible to anyone except the developer themselves
        if (requesterRole !== 'developer') {
            query.role = { $ne: 'developer' }; // Exclude all developer accounts
        }

        const users = await User.find(query).select('-password');
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

        // Security Check: Only Admin/Developer OR the User themselves can update the profile
        if (requesterRole !== 'admin' && requesterRole !== 'developer' && requesterId !== targetId) {
            return res.status(403).json({ success: false, message: 'Access denied. You can only update your own profile.' });
        }

        // 🔒 SECURITY: Developer account can only be modified by the developer themselves
        const targetUser = await User.findById(targetId);
        if (targetUser?.role === 'developer' && requesterId !== targetId) {
            return res.status(403).json({ success: false, message: 'Access denied. Developer account is protected.' });
        }

        const { password, ...updateData } = req.body;

        // 🔒 SECURITY: Nobody can assign developer role through API
        if (updateData.role === 'developer') {
            delete updateData.role; // Silently remove it
        }

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

        // Prevent non-admins/non-developers from changing their own role or status
        if (requesterRole !== 'admin' && requesterRole !== 'developer') {
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

// Toggle Billing Access — Admin Only
exports.toggleBillingAccess = async (req, res) => {
    try {
        const { billingAccess } = req.body;
        if (typeof billingAccess !== 'boolean') {
            return res.status(400).json({ success: false, message: 'billingAccess must be true or false.' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.role === 'admin') {
            return res.status(400).json({ success: false, message: 'Admin always has billing access. No change needed.' });
        }

        user.billingAccess = billingAccess;
        await user.save();

        res.status(200).json({
            success: true,
            message: `Billing access ${billingAccess ? 'granted' : 'revoked'} successfully.`,
            billingAccess: user.billingAccess
        });
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
