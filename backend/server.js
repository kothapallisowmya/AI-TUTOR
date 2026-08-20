/**
 * backend/server.js
 * 
 * Express server for BTech AI Tutor.
 * - Serves the frontend static files (index.html, style.css, app.js)
 * - Provides REST API at /api/*
 * - Connects to MongoDB via Mongoose
 */

'use strict';

// Load environment variables first
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const { connectDB, getConnectionStatus } = require('./config/db');
const quizRoutes = require('./routes/quiz');
const chatRoutes = require('./routes/chat');
const authRoutes = require('./routes/auth');
const aiRoutes   = require('./routes/ai');
const { optionalAuth } = require('./middleware/auth');

// ─────────────────────────────────────────────────────────────────────────────
// App Setup
// ─────────────────────────────────────────────────────────────────────────────

const app  = express();
const PORT = process.env.PORT || 3001;
const isDev = (process.env.NODE_ENV || 'development') === 'development';

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

// CORS — in dev allow all origins; in prod restrict to FRONTEND_URL
const corsOptions = {
  origin: isDev ? '*' : (process.env.FRONTEND_URL || 'http://localhost:3001'),
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Parse JSON bodies (limit 1mb to prevent abuse)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logger (dev only)
if (isDev) {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Serve Frontend Static Files
// The frontend lives in the parent directory (project root)
// ─────────────────────────────────────────────────────────────────────────────

const FRONTEND_DIR = path.join(__dirname, '..');
app.use(express.static(FRONTEND_DIR, {
  index: 'index.html',
  // Don't serve .env, node_modules, backend/ as static files
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') && !filePath.includes('node_modules')) {
      res.setHeader('Cache-Control', 'no-cache'); // easy dev iteration
    }
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  const db = getConnectionStatus();
  res.json({
    ok:        true,
    server:    'BTech AI Tutor Backend',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
    database: {
      connected: db.connected,
      state:     ['disconnected', 'connected', 'connecting', 'disconnecting'][db.state] || 'unknown',
    },
    mode: process.env.NODE_ENV || 'development',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────────────────────────────────

// Apply optional auth to all API routes to populate req.user if a token is present
app.use('/api', optionalAuth);

app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai', aiRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// 404 for unknown /api/* routes
// ─────────────────────────────────────────────────────────────────────────────

app.use('/api/*', (_req, res) => {
  res.status(404).json({ ok: false, error: 'API endpoint not found.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// SPA Fallback — all non-API, non-static routes serve index.html
// ─────────────────────────────────────────────────────────────────────────────

app.get('*', (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// ─────────────────────────────────────────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Global Error Handler]', err.stack || err.message);
  res.status(err.status || 500).json({
    ok:    false,
    error: isDev ? err.message : 'An unexpected error occurred.',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────────────────

async function startServer() {
  // Connect to MongoDB (non-blocking — server starts even if DB is down)
  await connectDB();

  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║        BTech AI Tutor — Backend Server           ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  🌐  http://localhost:${PORT}                       ║`);
    console.log(`║  📡  API: http://localhost:${PORT}/api/health        ║`);
    console.log(`║  🗄️   DB:  ${getConnectionStatus().connected ? '✅ Connected' : '❌ Not connected'}                       ║`);
    console.log(`║  🔧  Mode: ${process.env.NODE_ENV || 'development'}                          ║`);
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
  });
}

startServer().catch(err => {
  console.error('❌ Fatal startup error:', err.message);
  process.exit(1);
});

module.exports = app; // for testing
