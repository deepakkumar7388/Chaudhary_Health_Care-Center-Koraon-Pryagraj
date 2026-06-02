const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authenticate = async (req, res, next) => {
    try {
        // Hybrid: Cookie se pehle lo, phir Authorization header se fallback
        let token = req.cookies?.token;

        if (!token && req.headers.authorization) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
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
        if (!roles.includes(req.userData.role)) {
            return res.status(403).json({
                message: 'Access denied. Insufficient permissions.'
            });
        }
        next();
    };
};
