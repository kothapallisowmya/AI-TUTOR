/**
 * backend/routes/auth.js
 * 
 * Authentication API routes
 */

'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// POST /api/auth/signup
router.post('/signup', authController.signup);

// POST /api/auth/login
router.post('/login', authController.login);

// GET /api/auth/me
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
