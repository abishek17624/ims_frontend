const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // Use 'pool' as per db.js
const bcrypt = require('bcrypt'); //
const authMiddleware = require('../middleware/auth.middleware'); // <--- Import authMiddleware
const authorizeRoles = require('../middleware/role.middleware'); // <--- Import authorizeRoles

// POST /salesperson/create - Create Salesperson
// Protected by authMiddleware and authorizeRoles('ADMIN')
router.post('/create', authMiddleware, authorizeRoles('admin'), async (req, res) => { //
  const {
    name, contact, email, password,
    salesTarget = 0, currentSales = 0
    // performanceRating is set by backend initially
  } = req.body; //

  // Basic validation for required fields
  if (!name || !contact || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields for salesperson creation.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10); //

    // Step 1: Insert into users table
    // Ensure your 'users' table has a 'name' column and other fields if needed
    const [userResult] = await pool.execute( //
      'INSERT INTO users (email, password, role, name) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, 'salesperson', name]
    );
    const userId = userResult.insertId; //

    // Step 2: Insert into salesperson table
    // Removed 'password' column from salesperson table as it's redundant
    const [salesPersonResult] = await pool.execute( //
      `INSERT INTO salesperson (name, contact, email, sales_target, current_sales, performance_rating, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, contact, email, salesTarget, currentSales, 0, userId] // Initial performanceRating to 0
    );

    res.status(201).json({ message: 'Salesperson created successfully', salesPersonId: salesPersonResult.insertId, userId: userId }); //

  } catch (err) { //
    console.error("Salesperson Create Error:", err);
    // Handle duplicate email error
    if (err.code === 'ER_DUP_ENTRY' && err.sqlMessage.includes('email')) {
        return res.status(409).json({ message: 'Salesperson with this email already exists.' });
    }
    res.status(500).json({ message: 'Error creating salesperson' }); //
  }
});

// GET /salesperson - Fetch all salespersons
router.get('/', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT sp.id, sp.name, sp.contact, sp.email, sp.sales_target AS salesTarget, 
                   sp.current_sales AS currentSales, sp.performance_rating AS performanceRating, 
                   u.created_at AS dateAdded
            FROM salesperson sp
            JOIN users u ON sp.user_id = u.id
            ORDER BY u.created_at DESC
        `);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Fetch Salespersons Error:", error);
        res.status(500).json({ message: 'Failed to fetch salespersons.' });
    }
});

// PUT /salesperson/:id - Update existing salesperson
router.put('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    const { id } = req.params;
    const { name, contact, email, salesTarget, currentSales, performanceRating } = req.body;

    try {
        // Find the salesperson first to get user_id
        const [salesPersonRows] = await pool.execute('SELECT user_id FROM salesperson WHERE id = ?', [id]);
        if (salesPersonRows.length === 0) {
            return res.status(404).json({ message: 'Salesperson not found.' });
        }
        const user_id = salesPersonRows[0].user_id;

        // Update salesperson specific details
        await pool.execute(
            `UPDATE salesperson SET name=?, contact=?, email=?, sales_target=?, current_sales=?, performance_rating=? WHERE id=?`,
            [name, contact, email, salesTarget, currentSales, performanceRating, id]
        );

        // Optionally update user's email/name if they are changed via salesperson profile
        await pool.execute(
            `UPDATE users SET email=?, name=? WHERE id=?`,
            [email, name, user_id]
        );

        res.status(200).json({ message: 'Salesperson updated successfully' });
    } catch (error) {
        console.error("Update Salesperson Error:", error);
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('email')) {
            return res.status(409).json({ message: 'Email already in use by another user.' });
        }
        res.status(500).json({ message: 'Failed to update salesperson.' });
    }
});

// DELETE /salesperson/:id - Delete salesperson
router.delete('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    const { id } = req.params;
    try {
        // Get user_id before deleting salesperson to delete from users table as well
        const [salesPersonRows] = await pool.execute('SELECT user_id FROM salesperson WHERE id = ?', [id]);
        if (salesPersonRows.length === 0) {
            return res.status(404).json({ message: 'Salesperson not found.' });
        }
        const user_id = salesPersonRows[0].user_id;

        // Delete from salesperson table
        await pool.execute('DELETE FROM salesperson WHERE id = ?', [id]);
        // Delete from users table
        await pool.execute('DELETE FROM users WHERE id = ?', [user_id]);

        res.status(200).json({ message: 'Salesperson deleted successfully' });
    } catch (error) {
        console.error("Delete Salesperson Error:", error);
        res.status(500).json({ message: 'Failed to delete salesperson.' });
    }
});

module.exports = router; //