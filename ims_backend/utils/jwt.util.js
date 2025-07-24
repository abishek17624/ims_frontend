const jwt = require('jsonwebtoken');
require('dotenv').config();

// Generate JWT token with userId and role
exports.generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
};
