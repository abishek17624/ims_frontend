const express = require('express');
const app = express();
require('dotenv').config();
const adminRoutes = require('./routes/admin.routes');
const salespersonRoutes = require('./routes/salesperson.routes');
const supplierRoutes = require('./routes/supplier.routes');
const cors = require('cors');

app.use(express.json());

// Enable CORS for Angular frontend
app.use(cors({
  origin: 'http://localhost:4200', // Replace with your Angular app's URL if different
  credentials: true
}));

const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

const meRouter = require('./routes/auth/me.router');
app.use('/auth', meRouter);

const categoryRoutes = require('./routes/category');
app.use('/api/category', categoryRoutes);

const productRoutes = require('./routes/product');
app.use('/api/product', productRoutes);

const orderRoutes = require('./routes/orders.routes');
app.use('/api/orders', orderRoutes);  

// In your main backend file (e.g., app.js or server.js)
const billingRoutes = require('./routes/billing.routes');
app.use('/api/billing', billingRoutes); // Or whatever base path you use

app.use('/api/admin', adminRoutes);
app.use('/api/salesperson', salespersonRoutes);
app.use('/api/supplier', supplierRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
