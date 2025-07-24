// routes/auth/me.router.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware'); // Your authentication middleware
const db = require('../../config/db'); // Your database connection

router.get("/me", authMiddleware, async (req, res) => {
  try {
    // req.user is populated by authMiddleware after successful token verification
    const userId = req.user.id;
    const userRole = req.user.role;

    // Fetch full user details from the database based on their ID and role
    // This example fetches from the 'users' table. You might need joins for specific role data.
    const [rows] = await db.execute(
      'SELECT id, email, role, name, email_verified, mobile_verified FROM users WHERE id = ?',
      [userId]
    );

    if (rows.length === 0) {
      // This should ideally not happen if authMiddleware passed, but as a safeguard
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];

    // Ensure the response structure matches Angular's User interface
    res.json({
        id: user.id,
        name: user.name || user.email.split('@')[0], // Fallback if 'name' column doesn't exist or is null
        email: user.email,
        role: user.role,
        email_verified: user.email_verified || false, // Default to false if not in DB
        mobile_verified: user.mobile_verified || false, // Default to false if not in DB
    });

  } catch (error) {
    console.error("Error in /auth/me:", error);
    // authMiddleware already handles token expiration/invalidity as 401
    // For other unexpected errors, return 500
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;