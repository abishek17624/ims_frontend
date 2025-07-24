const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { jwtRefreshSecret, jwtAccessSecret } = require('../../config/jwt.config');

router.post('/', async (req, res) => {
    try {
        const refreshToken = req.cookies['refreshToken'];
        
        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh token not found' });
        }

        // Verify refresh token
        jwt.verify(refreshToken, jwtRefreshSecret, (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Invalid refresh token' });
            }

            // Generate new access token
            const accessToken = jwt.sign(
                { userId: decoded.userId, role: decoded.role },
                jwtAccessSecret,
                { expiresIn: '15m' }
            );

            // Send new access token
            res.json({
                accessToken,
                user: {
                    id: decoded.userId,
                    role: decoded.role
                }
            });
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
