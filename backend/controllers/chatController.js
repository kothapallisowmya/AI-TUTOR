/**
 * backend/controllers/chatController.js
 *
 * Handles chat history persistence:
 *   POST   /api/chat/save              — append a message
 *   GET    /api/chat/history/:sessionId — get chat for a session+subject
 *   DELETE /api/chat/history/:sessionId — clear chat (e.g. on "Clear Chat" button)
 */

'use strict';

const ChatHistory    = require('../models/ChatHistory');
const User           = require('../models/User');
const { getConnectionStatus } = require('../config/db');

// ── Helper ────────────────────────────────────────────────────────────────────

function dbRequired(res) {
  const { connected } = getConnectionStatus();
  if (!connected) {
    res.status(503).json({ ok: false, error: 'Database not available.' });
    return false;
  }
  return true;
}

const VALID_SUBJECTS = ['java', 'python', 'dsa', 'dbms', 'os', 'cn', 'se'];

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/chat/save
 * Body: {
 *   sessionId, subject, subjectName,
 *   role: 'user'|'ai',
 *   text,           // user message text
 *   responseType,   // AI response type: 'explanation'|'notes'|'example'|'quiz'
 *   responseTitle,  // short title of AI response
 *   actionType      // 'general'|'explain'|'notes'|'quiz'|'example'
 * }
 */
async function saveMessage(req, res) {
  if (!dbRequired(res)) return;

  try {
    const {
      sessionId, subject, subjectName,
      role, text = '',
      responseType = '', responseTitle = '', actionType = 'general',
    } = req.body;

    // Validation
    if (!sessionId || !subject || !role) {
      return res.status(400).json({
        ok:    false,
        error: 'Missing required fields: sessionId, subject, role',
      });
    }
    if (!VALID_SUBJECTS.includes(subject)) {
      return res.status(400).json({ ok: false, error: `Invalid subject: ${subject}` });
    }
    if (!['user', 'ai'].includes(role)) {
      return res.status(400).json({ ok: false, error: 'role must be "user" or "ai"' });
    }

    // Ensure user session exists
    await User.findOrCreate(sessionId);

    // Upsert: find existing chat for this session/user + subject, or create new one
    const newMessage = {
      role,
      text:          role === 'user' ? String(text).slice(0, 2000) : '',
      responseType:  role === 'ai' ? responseType : '',
      responseTitle: role === 'ai' ? responseTitle : '',
      actionType,
      timestamp:     new Date(),
    };

    const filter = req.user ? { userId: req.user._id, subject } : { sessionId, subject };
    
    const setOnInsert = req.user ? { userId: req.user._id, sessionId, subject } : { sessionId, subject };

    const chat = await ChatHistory.findOneAndUpdate(
      filter,
      {
        $push:         { messages: newMessage },
        $set:          { subjectName: subjectName || subject },
        $setOnInsert:  setOnInsert,
      },
      { upsert: true, new: true, runValidators: true }
    );

    return res.status(201).json({
      ok:           true,
      message:      'Message saved.',
      messageCount: chat.messageCount,
    });
  } catch (err) {
    console.error('[chatController.saveMessage]', err.message);
    return res.status(500).json({ ok: false, error: 'Failed to save message.' });
  }
}

/**
 * GET /api/chat/history/:sessionId?subject=java
 * Returns messages for a given session and subject.
 */
async function getChatHistory(req, res) {
  if (!dbRequired(res)) return;

  try {
    const { sessionId } = req.params;
    const { subject } = req.query;

    if (!sessionId && !req.user) {
      return res.status(400).json({ ok: false, error: 'sessionId or auth token is required.' });
    }

    const filter = req.user ? { userId: req.user._id } : { sessionId };
    if (subject) {
      if (!VALID_SUBJECTS.includes(subject)) {
        return res.status(400).json({ ok: false, error: `Invalid subject: ${subject}` });
      }
      filter.subject = subject;
    }

    const chats = await ChatHistory.find(filter)
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({ ok: true, chats });
  } catch (err) {
    console.error('[chatController.getChatHistory]', err.message);
    return res.status(500).json({ ok: false, error: 'Failed to fetch chat history.' });
  }
}

/**
 * DELETE /api/chat/history/:sessionId?subject=java
 * Clears messages for a session (optionally filtered by subject).
 */
async function clearChatHistory(req, res) {
  if (!dbRequired(res)) return;

  try {
    const { sessionId } = req.params;
    const { subject }   = req.query;

    if (!sessionId && !req.user) {
      return res.status(400).json({ ok: false, error: 'sessionId or auth token is required.' });
    }

    const filter = req.user ? { userId: req.user._id } : { sessionId };
    if (subject) filter.subject = subject;

    if (subject) {
      // Clear messages array for one subject
      await ChatHistory.updateOne(filter, { $set: { messages: [], messageCount: 0 } });
    } else {
      // Delete all chat docs for this session
      await ChatHistory.deleteMany(filter);
    }

    return res.json({ ok: true, message: 'Chat history cleared.' });
  } catch (err) {
    console.error('[chatController.clearChatHistory]', err.message);
    return res.status(500).json({ ok: false, error: 'Failed to clear chat history.' });
  }
}

module.exports = { saveMessage, getChatHistory, clearChatHistory };
