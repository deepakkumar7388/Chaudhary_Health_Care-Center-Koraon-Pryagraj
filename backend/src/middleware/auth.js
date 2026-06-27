const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authenticate = async (req, res, next) => {
    try {
        // Hybrid: Authorization header ko pehle priority do, phir Cookie fallback
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token && req.cookies?.token) {
            token = req.cookies.token;
        }

        if (!token || token === 'null' || token === 'undefined') {
            return res.status(401).json({ message: 'Authentication failed: No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Security Check: Verify user still exists and is active
        const user = await User.findById(decoded.userId);
        if (!user || user.status !== 'active') {
            return res.status(403).json({
                message: 'Account is inactive or has been suspended. Please contact admin.'
            });
        }

        // Single Active Session Check
        if (user.currentSessionToken && user.currentSessionToken !== token) {
            return res.status(401).json({
                message: 'Session expired. Your account was logged in from another device.'
            });
        }

        req.userData = decoded;
        req.user = user; // Attach full user object for convenience
        next();
    } catch (error) {
        return res.status(401).json({
            message: 'Authentication failed'
        });
    }
};

exports.checkRole = (roles) => {
    return (req, res, next) => {
        // Developer (system owner) always has access to everything
        if (req.userData.role === 'developer') return next();
        if (!roles.includes(req.userData.role)) {
            return res.status(403).json({
                message: 'Access denied. Insufficient permissions.'
            });
        }
        next();
    };
};
