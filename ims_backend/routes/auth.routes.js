// routes/auth/auth.routes.js (consolidated)
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller'); // For login
// Removed registerRouter import as it is undefined
const refreshTokenRouter = require('./refresh.router'); // The new refresh token router
const meRouter = require('./auth/me.router'); // The new /me router
const logoutRouter = require('./logout'); // Your existing logout router

// Authentication routes
router.post('/login', authController.login);
// router.use('/register', registerRouter); // Assuming register has its own router structure
// Removed usage of registerRouter to fix ReferenceError
router.use('/refresh-token', refreshTokenRouter);
router.use('/me', meRouter); // This needs the authMiddleware before it for protection
router.post('/logout', logoutRouter);

module.exports = router;