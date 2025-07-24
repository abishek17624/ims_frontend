const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken
const jwtUtil = require('../utils/jwt.util'); // Still use this for basic token generation if desired

// Make sure your .env has JWT_SECRET and REFRESH_TOKEN_SECRET
// process.env.JWT_SECRET
// process.env.REFRESH_TOKEN_SECRET

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email' });
        }
        const user = rows[0];

        // Ensure the password column name is correct (it's 'password' in your users table)
        const isPasswordValid = await bcrypt.compare(password, user.password); // Using user.password directly

        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid password' });
        }

        // Prepare payload for JWTs
        const payload = {
            id: user.id, // Use user.id from the users table
            name: user.name || user.email.split('@')[0], // Assuming 'name' might be in users table, else derive
            role: user.role,
            email: user.email,
            // Add other user fields if they exist in the 'users' table or related tables
            // email_verified: user.email_verified,
            // mobile_verified: user.mobile_verified,
        };

        // ✅ Generate short-lived Access Token
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        // ✅ Generate long-lived Refresh Token
        const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

        // ✅ Set refresh token as HttpOnly cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Use NODE_ENV for secure flag
            sameSite: 'Lax', // Or 'Strict' depending on your cross-domain needs. 'Lax' is often safer for SPAs.
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // ✅ Set access token as HttpOnly cookie (optional but good for SSR/some guards)
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 60 * 60 * 1000, // 1 hour
        });

        // ✅ Send back full user data AND access token for Bearer token usage in frontend memory
        res.status(200).json({
            success: true,
            message: 'Login successful',
            accessToken: accessToken, // Frontend's AuthService expects this in the body
            user: { // Ensure these match Angular's User interface
                id: user.id,
                name: payload.name, // Use the name from payload
                email: user.email,
                role: user.role,
                // Include other fields like email_verified, mobile_verified if they exist in your users table
                // email_verified: user.email_verified || false,
                // mobile_verified: user.mobile_verified || false,
            },
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};