const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.signup = async (req, res) => {
    try {
        const { name, email, mobile, username, password, role } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Check if this is the first user
        const userCount = await User.countDocuments();
        const status = userCount === 0 ? 'active' : 'pending';
        const finalRole = userCount === 0 ? 'admin' : role;

        const newUser = new User({ name, email, mobile, username, password, role: finalRole, status });
        await newUser.save();

        res.status(201).json({
            success: true,
            message: userCount === 0 ? 'Admin account created and activated!' : 'Account created! Pending admin approval.'
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
        const { password, ...updateData } = req.body;
        if (password) {
            updateData.password = await require('bcryptjs').hash(password, 10);
        }
        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
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
