const pool = require('../config/db');

// Get all products
exports.getAllProducts = async (req, res) => {
    try {
        const [products] = await pool.query(
            'SELECT * FROM products WHERE status = "active" ORDER BY created_at DESC'
        );
        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Add new product
exports.addProduct = async (req, res) => {
    try {
        const {
            id, name, category, subcategory, buying_price,
            selling_price, quantity, threshold, expiry,
            supplier, contact
        } = req.body;

        // Validate required fields
        if (!id || !name || !category || !buying_price || !selling_price || quantity === undefined || !supplier || !contact) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if product ID already exists
        const [existingProduct] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
        if (existingProduct.length > 0) {
            return res.status(409).json({ message: 'Product ID already exists' });
        }

        const [result] = await pool.query(
            'INSERT INTO products (id, name, category, subcategory, buying_price, selling_price, quantity, threshold, expiry, supplier, contact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, category, subcategory || null, buying_price, selling_price, quantity, threshold, expiry || null, supplier, contact]
        );

        res.status(201).json({ message: 'Product added successfully' });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update product
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, category, subcategory, buying_price,
            selling_price, quantity, threshold, expiry,
            supplier, contact
        } = req.body;

        const [result] = await pool.query(
            `UPDATE products 
             SET name = ?, category = ?, subcategory = ?, buying_price = ?,
                 selling_price = ?, quantity = ?, threshold = ?, expiry = ?,
                 supplier = ?, contact = ?
             WHERE id = ? AND status = "active"`,
            [name, category, subcategory || null, buying_price, selling_price,
             quantity, threshold, expiry || null, supplier, contact, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Product not found or inactive' });
        }

        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Deactivate product (soft delete)
exports.deactivateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query(
            'UPDATE products SET status = "inactive" WHERE id = ? AND status = "active"',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Product not found or already inactive' });
        }

        res.json({ message: 'Product deactivated successfully' });
    } catch (error) {
        console.error('Error deactivating product:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Category Management
exports.addCategory = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Category name is required' });
        }

        const [result] = await pool.query(
            'INSERT INTO categories (name) VALUES (?)',
            [name]
        );

        res.status(201).json({ message: 'Category added successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Category already exists' });
        }
        console.error('Error adding category:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getAllCategories = async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT * FROM categories ORDER BY name');
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.updateCategoryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body;

        if (!['active', 'inactive'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action' });
        }

        const [result] = await pool.query(
            'UPDATE categories SET action = ? WHERE id = ?',
            [action, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json({ message: 'Category status updated successfully' });
    } catch (error) {
        console.error('Error updating category status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
