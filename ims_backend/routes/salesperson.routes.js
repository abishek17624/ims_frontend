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

  console.log('Creating salesperson with data:', { name, contact, email, salesTarget, currentSales }); // Debug log

  try {
    const hashedPassword = await bcrypt.hash(password, 10); //
    console.log('Password hashed successfully'); // Debug log

    // Step 1: Insert into users table
    // Users table only has: email, password, role (no name column)
    console.log('Inserting into users table...'); // Debug log
    const [userResult] = await pool.execute( //
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      [email, hashedPassword, 'salesperson']
    );
    const userId = userResult.insertId; //
    console.log('User created with ID:', userId); // Debug log

    // Step 2: Insert into salesperson table
    // Try without password first, then with password if needed
    console.log('Inserting into salesperson table...'); // Debug log
    console.log('Data to insert:', { name, contact, email, salesTarget, currentSales, userId }); // Debug log
    let salesPersonResult;
    
    try {
      // First try without password field (ideal case)
      console.log('Attempting insert without password field...'); // Debug log
      [salesPersonResult] = await pool.execute( //
        `INSERT INTO salesperson (name, contact, email, sales_target, current_sales, performance_rating, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, contact, email, salesTarget, currentSales, 0, userId]
      );
      console.log('Insert successful without password field'); // Debug log
    } catch (insertError) {
      console.log('Insert failed, error:', insertError.code, insertError.sqlMessage); // Debug log
      if (insertError.code === 'ER_NO_DEFAULT_FOR_FIELD' && insertError.sqlMessage.includes('password')) {
        console.log('Password field required, retrying with password...'); // Debug log
        // Retry with password field
        [salesPersonResult] = await pool.execute( //
          `INSERT INTO salesperson (name, contact, email, sales_target, current_sales, performance_rating, user_id, password)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [name, contact, email, salesTarget, currentSales, 0, userId, hashedPassword]
        );
        console.log('Insert successful with password field'); // Debug log
      } else {
        throw insertError; // Re-throw if it's a different error
      }
    }
    
    console.log('Salesperson created with ID:', salesPersonResult.insertId); // Debug log

    // Verify the insertion by querying the data back
    const [verifyResult] = await pool.execute(
      'SELECT * FROM salesperson WHERE id = ?',
      [salesPersonResult.insertId]
    );
    console.log('Verification - Inserted salesperson data:', verifyResult[0]); // Debug log

    res.status(201).json({ 
      message: 'Salesperson created successfully', 
      salesPersonId: salesPersonResult.insertId, 
      userId: userId,
      insertedData: verifyResult[0] // Include inserted data for debugging
    }); //

  } catch (err) { //
    console.error("Salesperson Create Error:", err);
    console.error("Error details:", {
      code: err.code,
      errno: err.errno,
      sqlMessage: err.sqlMessage,
      sql: err.sql
    }); // Additional debug info
    
    // Handle duplicate email error
    if (err.code === 'ER_DUP_ENTRY' && err.sqlMessage.includes('email')) {
        return res.status(409).json({ message: 'Salesperson with this email already exists.' });
    }
    
    // Handle missing field error
    if (err.code === 'ER_NO_DEFAULT_FOR_FIELD') {
        return res.status(500).json({ 
          message: 'Database schema error: Missing required field', 
          details: err.sqlMessage 
        });
    }
    
    res.status(500).json({ 
      message: 'Error creating salesperson', 
      error: err.message,
      code: err.code 
    }); //
  }
});

// GET /salesperson - Fetch all salespersons
router.get('/', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    try {
        console.log('Fetching all salespersons...'); // Debug log
        const [rows] = await pool.execute(`
            SELECT sp.id, sp.name, sp.contact, sp.email, sp.sales_target AS salesTarget, 
                   sp.current_sales AS currentSales, sp.performance_rating AS performanceRating, 
                   u.created_at AS dateAdded, sp.user_id
            FROM salesperson sp
            JOIN users u ON sp.user_id = u.id
            ORDER BY u.created_at DESC
        `);
        console.log(`Found ${rows.length} salespersons in database:`, rows); // Debug log
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

        // Optionally update user's email if it's changed via salesperson profile
        await pool.execute(
            `UPDATE users SET email=? WHERE id=?`,
            [email, user_id]
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

// DEBUG route - Get all data from both tables (remove in production)
router.get('/debug', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    try {
        console.log('Debug route called - fetching all data...'); // Debug log
        
        // Get all users with role 'salesperson'
        const [users] = await pool.execute(
            'SELECT id, email, role, created_at FROM users WHERE role = ?',
            ['salesperson']
        );
        
        // Get all salesperson records
        const [salespersons] = await pool.execute(
            'SELECT * FROM salesperson ORDER BY id DESC'
        );
        
        console.log('Users with salesperson role:', users);
        console.log('Salesperson table records:', salespersons);
        
        res.status(200).json({
            users: users,
            salespersons: salespersons,
            counts: {
                users: users.length,
                salespersons: salespersons.length
            }
        });
    } catch (error) {
        console.error("Debug fetch error:", error);
        res.status(500).json({ message: 'Debug fetch failed.' });
    }
});

module.exports = router; //