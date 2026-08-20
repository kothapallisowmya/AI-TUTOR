/**
 * backend/controllers/authController.js
 * 
 * Handles user signup, login, and fetching current user profile.
 */

'use strict';

const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

/**
 * POST /api/auth/signup
 * Body: { name, email, password, sessionId }
 */
async function signup(req, res) {
  try {
    const { name, email, password, sessionId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, error: 'Please provide name, email, and password.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters.' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ ok: false, error: 'An account with that email already exists.' });
    }

    // If a guest sessionId is provided, check if a generic User record exists for it
    let user;
    if (sessionId) {
      user = await User.findOne({ sessionId, email: { $exists: false } });
    }

    if (user) {
      // Upgrade guest session to registered user
      user.name = name;
      user.email = email;
      user.password = password;
      await user.save();
    } else {
      // Create entirely new user
      const newSessionId = sessionId || 'sess-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      user = await User.create({
        name,
        email,
        password,
        sessionId: newSessionId
      });
    }

    const token = generateToken(user._id);

    return res.status(201).json({
      ok: true,
      message: 'Signup successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        sessionId: user.sessionId
      }
    });

  } catch (error) {
    console.error('[authController.signup]', error.message);
    return res.status(500).json({ ok: false, error: 'Failed to sign up.' });
  }
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      const token = generateToken(user._id);
      
      return res.json({
        ok: true,
        message: 'Login successful.',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          sessionId: user.sessionId
        }
      });
    } else {
      return res.status(401).json({ ok: false, error: 'Invalid email or password.' });
    }
  } catch (error) {
    console.error('[authController.login]', error.message);
    return res.status(500).json({ ok: false, error: 'Failed to log in.' });
  }
}

/**
 * GET /api/auth/me
 * Protected Route
 */
async function getMe(req, res) {
  try {
    const user = req.user;
    return res.json({
      ok: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        sessionId: user.sessionId
      }
    });
  } catch (error) {
    console.error('[authController.getMe]', error.message);
    return res.status(500).json({ ok: false, error: 'Failed to fetch user data.' });
  }
}

module.exports = { signup, login, getMe };
