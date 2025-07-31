const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // Use 'pool' as per db.js
const bcrypt = require('bcrypt');
const authMiddleware = require('../middleware/auth.middleware'); // <-- Import authMiddleware

// POST /admin/create - Route for creating new admin users
router.post('/create', async (req, res) => { //
  const { name, email, password } = req.body; //

  try {
    const hashedPassword = await bcrypt.hash(password, 10); //

    // Step 1: Insert into users table
    const [userResult] = await pool.execute( //
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)', // Users table only has email, password, role
      [email, hashedPassword, 'admin'] // Removed name
    );
    const userId = userResult.insertId; //

    // Step 2: Insert into admin table with the new userId
    const [adminResult] = await pool.execute( //
      // Removed 'password' column from admin table as it's redundant and insecure
      'INSERT INTO admin (name, email, user_id) VALUES (?, ?, ?)',
      [name, email, userId]
    );

    res.status(201).json({ //
      message: 'Admin created successfully', //
      admin_id: adminResult.insertId, //
      user_id: userId //
    });

  } catch (err) { //
    console.error(err); //
    res.status(500).json({ message: 'Error creating admin' }); //
  }
});

// PUT /admin/change-password - Route for an authenticated user (typically admin) to change their password
// This route is protected by authMiddleware
router.put('/change-password', authMiddleware, async (req, res) => { //
  // userId will be populated by authMiddleware from the JWT payload
  const userId = req.user.id; // <-- req.user is from authMiddleware
  const { currentPassword, newPassword } = req.body;

  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ success: 0, message: "Missing required fields." });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ success: 0, message: "New password must be at least 8 characters long." });
  }

  try {
    // 1. Fetch user from database to verify current password
    const [rows] = await pool.execute('SELECT password FROM users WHERE id = ?', [userId]); // Using 'pool'
    if (rows.length === 0) {
      return res.status(404).json({ success: 0, message: "User not found." });
    }
    const user = rows[0];

    // 2. Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ success: 0, message: "Invalid current password." });
    }

    // 3. Check if new password is the same as current
    if (currentPassword === newPassword) {
      return res.status(400).json({ success: 0, message: "New password cannot be the same as current password." });
    }

    // 4. Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 5. Update password in the database
    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    res.status(200).json({ success: 1, message: "Password updated successfully." });
  } catch (error) {
    console.error("Change password error in admin routes:", error);
    res.status(500).json({ success: 0, message: "Internal server error." });
  }
});

module.exports = router; //