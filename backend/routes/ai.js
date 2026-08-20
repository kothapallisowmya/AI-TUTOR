/**
 * backend/routes/ai.js
 * Mounts AI API routes under /api/ai
 */

'use strict';

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// POST /api/ai/chat
router.post('/chat', aiController.generateChatResponse);

module.exports = router;
