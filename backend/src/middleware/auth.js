const jwt = require('jsonwebtoken');

exports.authenticate = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userData = decoded;
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
