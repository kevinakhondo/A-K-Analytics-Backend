const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
            id: decoded.id, // Changed from userId to id for consistency
            email: decoded.email,
            role: decoded.role
        };
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
module.exports = authMiddleware;