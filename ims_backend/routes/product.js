// backend/routes/products.routes.js
const express = require('express');
// const router = express = require('express');
const router = express.Router();
const db = require('../config/db'); // Your database connection
const authMiddleware = require('../middleware/auth.middleware');
const authorizeRoles = require('../middleware/role.middleware');

// Add a new product - PROTECTED (ADMIN only)
router.post('/add', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    console.log('Add product request received:', req.body); // Debug log

    const {
      // id, // REMOVED: Do NOT destructure 'id' for auto-increment inserts
      name,
      category,
      subcategory,
      buying_price,
      selling_price,
      quantity,
      threshold,
      expiry,
      supplier, // Supplier Name
      contact, // Supplier Contact
      supplier_id, // Supplier ID
      status // This status is for product stock status (in_stock, low_stock, out_of_stock)
    } = req.body;

    // Basic validation - 'id' is NOT required here as it's auto-generated
    if (!name || !category || buying_price == null || selling_price == null || quantity == null || threshold == null || supplier_id == null) {
      console.log('Validation failed - missing required fields or supplier_id'); // Debug log
      return res.status(400).json({ message: 'Required fields (name, category, prices, quantity, threshold, supplier_id) are missing or invalid' });
    }

    console.log('Validation passed, proceeding with insert'); // Debug log

    // REMOVED: Check for existing product ID is no longer needed here for auto-increment
    // if (id) {
    //     const [existingProduct] = await db.execute('SELECT id FROM products WHERE id = ?', [id]);
    //     if (existingProduct.length > 0) {
    //         return res.status(409).json({ message: 'Product with this ID already exists.' });
    //     }
    // }

    console.log('Executing insert query...'); // Debug log
    const [result] = await db.execute(
      `INSERT INTO products (
        name, category, subcategory, buying_price, selling_price, quantity,
        threshold, expiry, supplier, contact, supplier_id, status, action
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, // Removed 'id' placeholder
      [
        name,
        category,
        subcategory || null,
        buying_price,
        selling_price,
        quantity,
        threshold,
        expiry || null, // Ensure expiry is in YYYY-MM-DD format if date type in DB
        supplier || null,
        contact || null,
        supplier_id,
        status || 'in_stock', // Default status
        'active' // Default action
      ]
    );

    console.log('Product inserted successfully with ID:', result.insertId); // Debug log (use result.insertId)
    res.status(201).json({ message: 'Product added successfully', productId: result.insertId }); // Use insertId
  } catch (err) {
    console.error('Add Product Error:', err);
    console.error('Error details:', {
      code: err.code,
      errno: err.errno,
      sqlMessage: err.sqlMessage,
      sql: err.sql
    }); // Additional debug info for database errors
    res.status(500).json({ message: 'Failed to add product', error: err.message, code: err.code });
  }
});

// Update existing product - PROTECTED (ADMIN only)
router.put('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params; // ID from URL parameter (the product to update)
  const {
    name,
    category,
    subcategory,
    buying_price,
    selling_price,
    quantity,
    threshold,
    expiry,
    supplier,
    contact,
    supplier_id, // Supplier ID
    status
  } = req.body; // Data to update

  // Basic validation - ensure supplier_id is present
  if (!name || !category || buying_price == null || selling_price == null || quantity == null || threshold == null || supplier_id == null) {
    return res.status(400).json({ message: 'Required fields (name, category, prices, quantity, threshold, supplier_id) are missing or invalid' });
  }

  try {
    const [result] = await db.execute(
      `UPDATE products SET
        name = ?, category = ?, subcategory = ?, buying_price = ?, selling_price = ?,
        quantity = ?, threshold = ?, expiry = ?, supplier = ?, contact = ?, supplier_id = ?, status = ?
        WHERE id = ? AND action = 'active'`, // Only update active products
      [
        name,
        category,
        subcategory || null,
        buying_price,
        selling_price,
        quantity,
        threshold,
        expiry || null, // Ensure expiry is in YYYY-MM-DD format if date type in DB
        supplier || null,
        contact || null,
        supplier_id, // Update supplier_id in the query
        status || 'in_stock',
        id // Use the ID from req.params to identify the product to update
      ]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Product not found or not active.' });
    }

    res.status(200).json({ message: 'Product updated successfully' });
  } catch (err) {
    console.error('Update Product Error:', err);
    res.status(500).json({ message: 'Failed to update product', error: err.message });
  }
});

// Soft delete (set action to inactive) - PROTECTED (ADMIN only)
router.delete('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.execute(`UPDATE products SET action = 'inactive' WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Product not found or already inactive.' });
    }

    res.status(200).json({ message: 'Product deactivated successfully' });
  } catch (err) {
    console.error('Soft Delete Product Error:', err);
    res.status(500).json({ message: 'Failed to deactivate product', error: err.message });
  }
});

// Activate product (set action to active) - PROTECTED (ADMIN only)
router.put('/activate/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.execute(`UPDATE products SET action = 'active' WHERE id = ? AND action = 'inactive'`, [id]);

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Product not found or already active.' });
    }

    res.status(200).json({ message: 'Product activated successfully' });
  } catch (err) {
    console.error('Activate Product Error:', err);
    res.status(500).json({ message: 'Failed to activate product', error: err.message });
  }
});

// Get all products (active and inactive) for Admin management - PROTECTED (ADMIN only)
router.get('/all', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    // Select all fields including supplier_id
    const [rows] = await db.execute(`SELECT * FROM products ORDER BY name ASC`);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Fetch All Products Error:', err);
    res.status(500).json({ message: 'Failed to fetch all products', error: err.message });
  }
});

// Get all active products (for general use, e.g., sales, customer views) - Can be public or protected
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(`SELECT * FROM products WHERE action = 'active' ORDER BY name ASC`);
    
    // Transform database field names to match frontend interface
    const transformedRows = rows.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      subcategory: row.subcategory,
      buyingPrice: parseFloat(row.buying_price) || 0,
      sellingPrice: parseFloat(row.selling_price) || 0,
      quantity: parseInt(row.quantity) || 0,
      unit: row.unit || 'Units',
      threshold: parseInt(row.threshold) || 0,
      expiry: row.expiry,
      supplier: row.supplier,
      contact: row.contact,
      supplier_id: row.supplier_id,
      status: row.status,
      action: row.action,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
    
    res.status(200).json(transformedRows);
  } catch (err) {
    console.error('Fetch Active Products Error:', err);
    res.status(500).json({ message: 'Failed to fetch active products', error: err.message });
    }
});

// Get all categories - PROTECTED
router.get('/category', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching categories from database...');
    // Get unique categories from products table where action is active
    const [rows] = await db.execute(`SELECT DISTINCT category as name FROM products WHERE action = 'active' AND category IS NOT NULL ORDER BY category ASC`);
    console.log('Categories fetched:', rows);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Fetch Categories Error:', err);
    res.status(500).json({ message: 'Failed to fetch categories', error: err.message });
  }
});

// Get products by category - PROTECTED
router.get('/category/:category', authMiddleware, async (req, res) => {
  try {
    const { category } = req.params;
    console.log('Fetching products for category:', category);
    
    const [rows] = await db.execute(
      `SELECT * FROM products WHERE category = ? AND action = 'active' ORDER BY name ASC`,
      [category]
    );
    
    // Transform database field names to match frontend interface
    const transformedRows = rows.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      subcategory: row.subcategory,
      buyingPrice: parseFloat(row.buying_price) || 0,
      sellingPrice: parseFloat(row.selling_price) || 0,
      quantity: parseInt(row.quantity) || 0,
      unit: row.unit || 'Units',
      threshold: parseInt(row.threshold) || 0,
      expiry: row.expiry,
      supplier: row.supplier,
      contact: row.contact,
      supplier_id: row.supplier_id,
      status: row.status,
      action: row.action,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
    
    console.log(`Found ${transformedRows.length} products for category ${category}`);
    res.status(200).json(transformedRows);
  } catch (err) {
    console.error('Fetch Products by Category Error:', err);
    res.status(500).json({ message: 'Failed to fetch products by category', error: err.message });
  }
});

module.exports = router;