const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/role.middleware');

// Product routes
router.get('/all', [verifyToken, isAdmin], productController.getAllProducts);
router.post('/add', [verifyToken, isAdmin], productController.addProduct);
router.put('/:id', [verifyToken, isAdmin], productController.updateProduct);
router.delete('/:id', [verifyToken, isAdmin], productController.deactivateProduct);

// Category routes
// Ensure productController.getAllCategories, productController.addCategory,
// and productController.updateCategoryStatus are indeed functions
router.get('/category', [verifyToken], productController.getAllCategories);
router.post('/category/add', [verifyToken, isAdmin], productController.addCategory);
router.put('/category/:id', [verifyToken, isAdmin], productController.updateCategoryStatus);

module.exports = router;