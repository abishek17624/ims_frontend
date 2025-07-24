// backend/routes/category.routes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Your database connection
const authMiddleware = require('../middleware/auth.middleware'); // [cite: uploaded:auth.middleware.js]
const authorizeRoles = require('../middleware/role.middleware'); // [cite: uploaded:role.middleware.js]

// Add new category - PROTECTED (ADMIN only)
router.post('/add', authMiddleware, authorizeRoles('admin'), async (req, res) => { // [cite: uploaded:auth.middleware.js, uploaded:role.middleware.js]
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Category name is required' });
    }

    try {
        const [existing] = await db.execute('SELECT * FROM category WHERE name = ?', [name]);
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Category already exists' });
        }

        await db.execute('INSERT INTO category (name) VALUES (?)', [name]);
        res.status(201).json({ message: 'Category added successfully' });
    } catch (err) {
        console.error('Add Category Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Soft delete (set inactive) - PROTECTED (ADMIN only)
router.put('/deactivate/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => { // [cite: uploaded:auth.middleware.js, uploaded:role.middleware.js]
    const { id } = req.params;
    try {
        const [result] = await db.execute('UPDATE category SET action = "inactive" WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json({ message: 'Category deactivated successfully' });
    } catch (err) {
        console.error('Deactivate Category Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Reactivate category - PROTECTED (ADMIN only)
router.put('/activate/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => { // [cite: uploaded:auth.middleware.js, uploaded:role.middleware.js]
    const { id } = req.params;
    try {
        const [result] = await db.execute('UPDATE category SET action = "active" WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json({ message: 'Category reactivated successfully' });
    } catch (err) {
        console.error('Activate Category Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Permanent delete - (Keep this for backend-only use if needed, or remove completely)
// router.delete('/delete/:id', authMiddleware, authorizeRoles('ADMIN'), async (req, res) => {
//     const { id } = req.params;
//     try {
//         const [result] = await db.execute('DELETE FROM category WHERE id = ?', [id]);
//         if (result.affectedRows === 0) {
//             return res.status(404).json({ message: 'Category not found or already deleted' });
//         }
//         res.json({ message: 'Category permanently deleted' });
//     } catch (err) {
//         console.error('Delete Category Error:', err);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// Get all categories (for Admin management) - PROTECTED (ADMIN only)
router.get('/', authMiddleware, authorizeRoles('admin'), async (req, res) => { // [cite: uploaded:auth.middleware.js, uploaded:role.middleware.js]
    try {
        const [rows] = await db.execute('SELECT * FROM category ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        console.error('Get All Categories Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all active categories (for general use, e.g., product creation dropdowns) - Can be public or protected
router.get('/active', async (req, res) => { // You might want to protect this too, depending on app needs
    try {
        const [rows] = await db.execute('SELECT * FROM category WHERE action = "active" ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        console.error('Get Active Categories Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;