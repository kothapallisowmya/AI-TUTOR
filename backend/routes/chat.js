/**
 * backend/routes/chat.js
 * Mounts chat API routes under /api/chat
 */

'use strict';

const express        = require('express');
const router         = express.Router();
const chatController = require('../controllers/chatController');

// POST   /api/chat/save
router.post('/save', chatController.saveMessage);

// GET    /api/chat/history/:sessionId  (optional ?subject=java)
router.get('/history/:sessionId', chatController.getChatHistory);

// DELETE /api/chat/history/:sessionId  (optional ?subject=java)
router.delete('/history/:sessionId', chatController.clearChatHistory);

module.exports = router;
