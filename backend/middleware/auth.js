/**
 * backend/middleware/auth.js
 * 
 * Middleware for handling JWT authentication.
 */

'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Extracts token from header and attaches user to request if valid.
 * Does NOT reject if token is missing or invalid (allows guest access).
 */
async function optionalAuth(req, res, next) {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (user) {
      req.user = user;
    }
    next();
  } catch (error) {
    // If token is invalid/expired, still proceed as guest
    next();
  }
}

/**
 * Rejects request if valid token is not present.
 * Use for protected routes (e.g. GET /api/auth/me)
 */
async function requireAuth(req, res, next) {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ ok: false, error: 'Not authorized to access this route. Please log in.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ ok: false, error: 'User no longer exists.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ ok: false, error: 'Token is invalid or expired. Please log in again.' });
  }
}

module.exports = { optionalAuth, requireAuth };
