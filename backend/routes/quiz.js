/**
 * backend/routes/quiz.js
 * Mounts quiz API routes under /api/quiz
 */

'use strict';

const express        = require('express');
const router         = express.Router();
const quizController = require('../controllers/quizController');

// POST /api/quiz/save
router.post('/save', quizController.saveQuizAttempt);

// GET  /api/quiz/history/:sessionId  (optional ?subject=java &limit=20)
router.get('/history/:sessionId', quizController.getQuizHistory);

// GET  /api/quiz/stats/:sessionId
router.get('/stats/:sessionId', quizController.getQuizStats);

module.exports = router;
