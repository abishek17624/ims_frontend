// backend/routes/orders.routes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Your database connection
const { v4: uuidv4 } = require('uuid'); // For generating UUIDs for order IDs
const authMiddleware = require('../middleware/auth.middleware'); //
const authorizeRoles = require('../middleware/role.middleware'); //

// Helper to format dates from DB for frontend (YYYY-MM-DD)
function formatDateForFrontend(date) {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // YYYY-MM-DD for Angular date input
}


// POST /orders/add - Create a new order (Protected: Admin only)
router.post('/add', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  const {
    product_id, quantity, unit, supplier_id, // Order item details
    supplier, supplier_phone, // Manual supplier entry (name and phone)
    delivery_date, // Order dates
    category, // Category field (can be overridden by product category)
    admin_notes, supplier_notes // Notes
  } = req.body;

  console.log('Received order payload:', req.body); // Debug log

  // Initial status for new orders
  const delivery_status = 'On time'; // Default
  const status = 'Pending'; // Default

  // Basic validation (ensure necessary fields are present)
  if (product_id == null || !quantity || !unit || !supplier || !delivery_date) {
    return res.status(400).json({ message: 'Required order fields (product, quantity, unit, supplier, delivery date) are missing.' });
  }

  try {
    // Generate a simple sequential order ID like 1, 2, 3, etc.
    const [orderCountResult] = await db.execute('SELECT COUNT(*) as count FROM orders');
    const orderCount = orderCountResult[0].count + 1;
    const order_id = orderCount.toString();
    const order_date = new Date().toISOString().split('T')[0]; // Current date as YYYY-MM-DD

    // Fetch complete product details from products table
    const [productRows] = await db.execute(
      'SELECT id, name, category, subcategory, selling_price, supplier, contact FROM products WHERE id = ?', 
      [product_id]
    );
    if (productRows.length === 0) {
        return res.status(404).json({ message: 'Product not found.' });
    }
    
    const productDetails = productRows[0];
    const product_name = productDetails.name;
    const product_code = productDetails.id; // product_code is products.id
    const product_category = category || productDetails.category; // Use provided category or product's category
    const selling_price = productDetails.selling_price;
    
    // Calculate order value (quantity * selling_price)
    const order_value = quantity * selling_price;

    // Use manually entered supplier information (takes priority over product's supplier)
    const supplier_name = supplier.trim();
    const supplier_phone_value = supplier_phone ? supplier_phone.trim() : null;
    
    // Handle supplier_id - try to find matching supplier or use default
    let supplier_id_value = null;
    
    if (supplier_id && supplier_id.trim() !== '') {
        // Use provided supplier_id if given
        supplier_id_value = supplier_id.trim();
    } else {
        // Try to find matching supplier in database by name
        const [supplierRows] = await db.execute(
            'SELECT id FROM supplier WHERE name = ? OR contact = ?', 
            [supplier_name, supplier_phone_value || '']
        );
        if (supplierRows.length > 0) {
            supplier_id_value = supplierRows[0].id;
        } else {
            // If no matching supplier found, create a default entry or use a default ID
            // For now, we'll use '1' as default or create a new supplier entry
            supplier_id_value = '1'; // You may want to create a default supplier with ID 1
        }
    }

    // If supplier details are not manually provided, try to get from product's supplier info
    let final_supplier_name = supplier_name;
    let final_supplier_phone = supplier_phone_value;
    
    if (!supplier_name && productDetails.supplier) {
        final_supplier_name = productDetails.supplier;
        final_supplier_phone = productDetails.contact || null;
    }

    console.log('Order details to insert:', {
      order_id, order_date, product_id, product_name, product_code, 
      quantity, unit, order_value, product_category, final_supplier_name, 
      final_supplier_phone, delivery_date, delivery_status, status,
      supplier_id_value
    }); // Debug log

    // Always include supplier_id and value columns
    const insertQuery = `INSERT INTO orders (
        order_id, order_date, product_id, product_name, product_code, quantity, unit, value,
        supplier_id, supplier, supplier_phone, category, delivery_date, delivery_status, status,
        admin_notes, supplier_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const insertValues = [
        order_id, order_date, product_id, product_name, product_code, quantity, unit, order_value,
        supplier_id_value, final_supplier_name, final_supplier_phone, product_category, 
        delivery_date, delivery_status, status,
        admin_notes || null, supplier_notes || null
    ];

    const [result] = await db.execute(insertQuery, insertValues);

    res.status(201).json({ 
      message: 'Order created successfully', 
      orderId: order_id,
      orderDetails: {
        order_id,
        product_name,
        category: product_category,
        quantity,
        unit,
        value: quantity * selling_price, // Calculate value for response
        supplier: final_supplier_name,
        supplier_phone: final_supplier_phone
      }
    });
  } catch (err) {
    console.error('Create Order Error:', err);
    res.status(500).json({ message: 'Failed to create order', error: err.message });
  }
});

// GET /orders - Fetch all orders (Protected: Admin, Supplier - filtered)
// Admin gets all, Supplier gets their own orders
router.get('/', authMiddleware, async (req, res) => { // AuthMiddleware will set req.user
  try {
    const userRole = req.user.role; //
    const userId = req.user.id; //

    let query = `
        SELECT o.order_id, o.order_date, o.product_id, o.quantity, o.unit, 
               o.value,
               o.category, o.delivery_date, o.delivery_status, o.status,
               o.admin_notes, o.supplier_notes, o.last_updated,
               p.name AS product_name, o.product_code,
               o.supplier AS supplier_name, o.supplier_phone, o.supplier_id,
               s.user_id as supplier_user_id
        FROM orders o
        JOIN products p ON o.product_id = p.id
        LEFT JOIN supplier s ON o.supplier_id = s.id
    `;
    let queryParams = [];

    if (userRole === 'admin') {
      // Admins can view all orders
      // No additional WHERE clause n766777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777776eeded
    } else if (userRole === 'supplier') {
      // Suppliers can only view orders where the supplier_id matches their user_id
      query += ' WHERE s.user_id = ?';
      queryParams.push(userId);
    } else {
      // Other roles are denied access
      return res.status(403).json({ message: 'Access denied for this role to view orders.' });
    }

    query += ' ORDER BY o.order_date DESC, o.last_updated DESC'; // Order by newest first

    const [rows] = await db.execute(query, queryParams);

    // Format dates and map to frontend interface names
    const formattedRows = rows.map(order => ({
      order_id: order.order_id,
      orderDate: formatDateForFrontend(order.order_date),
      product_id: order.product_id,
      productName: order.product_name,
      productCode: order.product_code, // Restored product_code mapping
      quantity: order.quantity,
      unit: order.unit,
      value: parseFloat(order.value), // Ensure value is a number
      supplierName: order.supplier_name, // Direct from orders table
      supplierPhone: order.supplier_phone, // Direct from orders table
      category: order.category, // Map category
      deliveryDate: formatDateForFrontend(order.delivery_date),
      deliveryStatus: order.delivery_status,
      status: order.status,
      adminNotes: order.admin_notes,
      supplierNotes: order.supplier_notes,
      lastUpdated: order.last_updated // Keep as ISO string or format as needed
    }));

    res.status(200).json(formattedRows);
  } catch (err) {
    console.error('Fetch Orders Error:', err);
    res.status(500).json({ message: 'Failed to fetch orders', error: err.message });
  }
});

// PUT /orders/:id - Update an order (Protected: Admin, Supplier - restricted editing)
// No permanent delete, but status can be changed (e.g., to Cancelled/Returned)
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params; // order_id from URL
  const {
    product_id, quantity, unit, value, supplier_id,
    delivery_date, delivery_status, status, admin_notes, supplier_notes,
    category // New category field
  } = req.body; // All potential fields for update

  const userRole = req.user.role; //
  const userId = req.user.id; //

  try {
    // 1. Fetch the existing order to check ownership/existence
    const [existingOrders] = await db.execute('SELECT * FROM orders WHERE order_id = ?', [id]);
    if (existingOrders.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    const existingOrder = existingOrders[0];

    // 2. Role-based access control for editing
    if (userRole === 'supplier') {
      // For suppliers, check if the order's supplier_id matches their user_id
      const [supplierCheck] = await db.execute(
        'SELECT s.user_id FROM supplier s WHERE s.id = ?', 
        [existingOrder.supplier_id]
      );
      
      if (supplierCheck.length === 0 || supplierCheck[0].user_id !== userId) {
        return res.status(403).json({ message: 'Access denied: You can only update orders assigned to you.' });
      }
    }

    let updateFields = [];
    let updateValues = [];

    // Fields that can be looked up from foreign keys if product_id/supplier_id change
    let product_name = existingOrder.product_name;
    // let product_code = existingOrder.product_code;
    let supplier_name = existingOrder.supplier; // Current supplier name
    let supplier_phone = existingOrder.supplier_phone;

    // Admin can edit product/supplier details linked to the order
    if (userRole === 'admin') {
      if (product_id !== undefined && product_id !== existingOrder.product_id) {
          const [prodRows] = await db.execute('SELECT name, id FROM products WHERE id = ?', [product_id]);
          if (prodRows.length === 0) return res.status(400).json({ message: 'New product not found.' });
          product_name = prodRows[0].name;
          product_code = prodRows[0].id; // New product_code
          updateFields.push('product_id = ?', 'product_name = ?', 'product_code = ?');
          updateValues.push(product_id, product_name, product_code);
      }
      if (supplier_id !== undefined && supplier_id !== existingOrder.supplier_id) {
          const [supRows] = await db.execute('SELECT name, contact FROM supplier WHERE id = ?', [supplier_id]);
          if (supRows.length === 0) return res.status(400).json({ message: 'New supplier not found.' });
          supplier_name = supRows[0].name;
          supplier_phone = supRows[0].contact;
          updateFields.push('supplier_id = ?', 'supplier = ?', 'supplier_phone = ?');
          updateValues.push(supplier_id, supplier_name, supplier_phone);
      }
    }


    // Add fields that are directly editable by either role (or only admin)
    if (quantity !== undefined) { updateFields.push('quantity = ?'); updateValues.push(quantity); }
    if (unit !== undefined) { updateFields.push('unit = ?'); updateValues.push(unit); }
    if (value !== undefined) { updateFields.push('value = ?'); updateValues.push(value); }
    if (delivery_date !== undefined) { updateFields.push('delivery_date = ?'); updateValues.push(delivery_date); }
    if (category !== undefined) { updateFields.push('category = ?'); updateValues.push(category); }


    // Role-specific status/notes updates
    if (userRole === 'admin') {
      if (delivery_status !== undefined) { updateFields.push('delivery_status = ?'); updateValues.push(delivery_status); }
      if (status !== undefined) { updateFields.push('status = ?'); updateValues.push(status); }
      if (admin_notes !== undefined) { updateFields.push('admin_notes = ?'); updateValues.push(admin_notes); }
      if (supplier_notes !== undefined) { updateFields.push('supplier_notes = ?'); updateValues.push(supplier_notes); } // Admin can also edit supplier notes
    } else if (userRole === 'supplier') {
      // Supplier can only update these fields for their own orders
      if (delivery_status !== undefined) { updateFields.push('delivery_status = ?'); updateValues.push(delivery_status); }
      if (status !== undefined) { updateFields.push('status = ?'); updateValues.push(status); }
      if (supplier_notes !== undefined) { updateFields.push('supplier_notes = ?'); updateValues.push(supplier_notes); }
      // Deny other fields if supplier tries to edit them
      if (product_id !== undefined || quantity !== undefined || unit !== undefined || value !== undefined || category !== undefined || admin_notes !== undefined) {
         return res.status(403).json({ message: 'Access denied: Suppliers can only update delivery details and notes.' });
      }
    } else {
        return res.status(403).json({ message: 'Access denied: This role cannot update orders.' });
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update.' });
    }

    const updateQuery = `UPDATE orders SET ${updateFields.join(', ')} WHERE order_id = ?`; // Use order_id
    updateValues.push(id); // Add ID to the end of values for WHERE clause

    const [result] = await db.execute(updateQuery, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order not found or no changes made.' });
    }

    res.status(200).json({ message: 'Order updated successfully' });
  } catch (err) {
    console.error('Update Order Error:', err);
    res.status(500).json({ message: 'Failed to update order', error: err.message });
  }
});

module.exports = router;