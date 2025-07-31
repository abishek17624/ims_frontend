const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Using 'db' as in your file
const bcrypt = require('bcrypt'); //
const authMiddleware = require('../middleware/auth.middleware'); // <--- Import authMiddleware
const authorizeRoles = require('../middleware/role.middleware'); // <--- Import authorizeRoles

// POST /supplier/create - Add Supplier
// This route is now protected by authMiddleware and authorizeRoles('ADMIN')
router.post('/create', authMiddleware, authorizeRoles('admin'), async (req, res) => { //
    try {
        const {
            name,
            product,
            category,
            price,
            contact,
            email,
            returnPolicy,
            password, // Password is required for creating user in 'users' table
            status = 'active', // Default status if not provided
            comments = '' // Default comments if not provided
        } = req.body; //

        // Basic validation for required fields for creation
        if (!name || !email || !password || !product || !category || !price || !contact || !returnPolicy) {
            return res.status(400).json({ message: 'Missing required fields for supplier creation.' });
        }

        // 1. Hash the password
        const hashedPassword = await bcrypt.hash(password, 10); //

        // 2. Insert into users table
        // Ensure your 'users' table has a 'name' column and other fields if needed
        const [userResult] = await db.execute( //
            `INSERT INTO users ( email, password, role) VALUES (?, ?, ?)`,
            [email, hashedPassword, 'supplier']
        );
        const userId = userResult.insertId; //

        // 3. Insert into supplier table
        const [result] = await db.execute( //
            `INSERT INTO supplier
            (user_id, name, product, category, price, contact, email, returnPolicy, status, comments)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, // Removed 'password' column from supplier table
            [
                userId,
                name,
                product,
                category,
                price,
                contact,
                email,
                returnPolicy,
                status,
                comments
            ]
        );

        res.status(201).json({ message: 'Supplier created successfully', supplierId: result.insertId, userId: userId }); //
    } catch (err) { //
        console.error("Supplier Create Error:", err); //
        // Handle duplicate email error
        if (err.code === 'ER_DUP_ENTRY' && err.sqlMessage.includes('email')) {
            return res.status(409).json({ message: 'Supplier with this email already exists.' });
        }
        res.status(500).json({ message: 'Database error', error: err.message }); //
    }
});

// GET /supplier - Fetch all suppliers (example placeholder)
router.get('/', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT s.id, s.name, s.product, s.category, s.price, s.contact, s.email, s.returnPolicy, s.status, s.comments, u.created_at as dateAdded
            FROM supplier s
            JOIN users u ON s.user_id = u.id
            ORDER BY u.created_at DESC
        `);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Fetch Suppliers Error:", error);
        res.status(500).json({ message: 'Failed to fetch suppliers.' });
    }
});

// PUT /supplier/:id - Update existing supplier (example placeholder)
router.put('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    const { id } = req.params;
    const { name, product, category, price, contact, email, returnPolicy, status, comments } = req.body;

    try {
        // Find the supplier first to get user_id
        const [supplierRows] = await db.execute('SELECT user_id FROM supplier WHERE id = ?', [id]);
        if (supplierRows.length === 0) {
            return res.status(404).json({ message: 'Supplier not found.' });
        }
        const user_id = supplierRows[0].user_id;

        // Update supplier specific details
        await db.execute(
            `UPDATE supplier SET name=?, product=?, category=?, price=?, contact=?, email=?, returnPolicy=?, status=?, comments=? WHERE id=?`,
            [name, product, category, price, contact, email, returnPolicy, status, comments, id]
        );

        // Update user's email if it's changed via supplier profile
        await db.execute(
            `UPDATE users SET email=? WHERE id=?`,
            [email, user_id]
        );

        res.status(200).json({ message: 'Supplier updated successfully' });
    } catch (error) {
        console.error("Update Supplier Error:", error);
        // Handle duplicate email error for users table
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('email')) {
            return res.status(409).json({ message: 'Email already in use by another user.' });
        }
        res.status(500).json({ message: 'Failed to update supplier.' });
    }
});

// DELETE /supplier/:id - Delete supplier (example placeholder)
router.delete('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    const { id } = req.params;
    try {
        // Get user_id before deleting supplier to delete from users table as well
        const [supplierRows] = await db.execute('SELECT user_id FROM supplier WHERE id = ?', [id]);
        if (supplierRows.length === 0) {
            return res.status(404).json({ message: 'Supplier not found.' });
        }
        const user_id = supplierRows[0].user_id;

        // Delete from supplier table
        await db.execute('DELETE FROM supplier WHERE id = ?', [id]);
        // Delete from users table (cascading delete should be set up in DB, or do it manually)
        await db.execute('DELETE FROM users WHERE id = ?', [user_id]);

        res.status(200).json({ message: 'Supplier deleted successfully' });
    } catch (error) {
        console.error("Delete Supplier Error:", error);
        res.status(500).json({ message: 'Failed to delete supplier.' });
    }
});

// This is the password change route specific to suppliers, assuming it's managed via this route file
// PUT /supplier/change-password - Protected by authMiddleware, allows authenticated user to change their password
router.put('/change-password', authMiddleware, async (req, res) => { //
  // userId will be populated by authMiddleware from the JWT payload
  const userId = req.user.id; //
  const { currentPassword, newPassword } = req.body;

  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ success: 0, message: "Missing required fields." });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ success: 0, message: "New password must be at least 8 characters long." });
  }

  try {
    // 1. Fetch user from database to verify current password
    const [rows] = await db.execute('SELECT password FROM users WHERE id = ?', [userId]);
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
    await db.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    res.status(200).json({ success: 1, message: "Password updated successfully." });
  } catch (error) {
    console.error("Change password error in supplier routes:", error);
    res.status(500).json({ success: 0, message: "Internal server error." });
  }
});

module.exports = router; //