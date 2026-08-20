/**
 * backend/controllers/quizController.js
 * 
 * Handles all quiz-related API operations:
 *   POST /api/quiz/save       — save a completed quiz attempt
 *   GET  /api/quiz/history/:sessionId — get all attempts for a session
 *   GET  /api/quiz/stats/:sessionId   — aggregate stats per subject
 */

'use strict';

const QuizAttempt    = require('../models/QuizAttempt');
const User           = require('../models/User');
const { getConnectionStatus } = require('../config/db');

// ── Helpers ──────────────────────────────────────────────────────────────────

function dbRequired(res) {
  const { connected } = getConnectionStatus();
  if (!connected) {
    res.status(503).json({
      ok:    false,
      error: 'Database not available. Check MongoDB connection.',
    });
    return false;
  }
  return true;
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/quiz/save
 * Body: { sessionId, subject, subjectName, quizTitle, score, total, questions }
 */
async function saveQuizAttempt(req, res) {
  if (!dbRequired(res)) return;

  try {
    const {
      sessionId, subject, subjectName,
      quizTitle, score, total, questions = [],
    } = req.body;

    // Validation
    if (!sessionId || !subject || score === undefined || !total) {
      return res.status(400).json({
        ok:    false,
        error: 'Missing required fields: sessionId, subject, score, total',
      });
    }

    const VALID_SUBJECTS = ['java', 'python', 'dsa', 'dbms', 'os', 'cn', 'se'];
    if (!VALID_SUBJECTS.includes(subject)) {
      return res.status(400).json({ ok: false, error: `Invalid subject: ${subject}` });
    }

    // Ensure session/user exists
    await User.findOrCreate(sessionId);

    // Save quiz attempt
    const attempt = new QuizAttempt({
      userId:      req.user ? req.user._id : undefined,
      sessionId,
      subject,
      subjectName: subjectName || subject,
      quizTitle:   quizTitle   || `${subjectName || subject} Quiz`,
      score:       Number(score),
      total:       Number(total),
      questions:   questions.map(q => ({
        question:     q.question     || '',
        options:      q.options      || [],
        chosenIndex:  q.chosenIndex  ?? -1,
        correctIndex: q.correctIndex ?? -1,
        isCorrect:    q.isCorrect    ?? false,
        explanation:  q.explanation  || '',
      })),
    });

    await attempt.save();

    return res.status(201).json({
      ok:        true,
      message:   'Quiz attempt saved successfully.',
      attemptId: attempt._id,
      percentage: attempt.percentage,
    });
  } catch (err) {
    console.error('[quizController.saveQuizAttempt]', err.message);
    return res.status(500).json({ ok: false, error: 'Failed to save quiz attempt.' });
  }
}

/**
 * GET /api/quiz/history/:sessionId
 * Returns all quiz attempts for a session, newest first.
 * Optional query: ?subject=java
 */
async function getQuizHistory(req, res) {
  if (!dbRequired(res)) return;

  try {
    const { sessionId } = req.params;
    const { subject, limit = 20 } = req.query;

    if (!sessionId && !req.user) {
      return res.status(400).json({ ok: false, error: 'sessionId or auth token is required.' });
    }

    const filter = req.user ? { userId: req.user._id } : { sessionId };
    if (subject) filter.subject = subject;

    const attempts = await QuizAttempt.find(filter)
      .sort({ completedAt: -1 })
      .limit(Number(limit))
      .select('-questions') // omit question details for list view
      .lean();

    return res.json({ ok: true, count: attempts.length, attempts });
  } catch (err) {
    console.error('[quizController.getQuizHistory]', err.message);
    return res.status(500).json({ ok: false, error: 'Failed to fetch quiz history.' });
  }
}

/**
 * GET /api/quiz/stats/:sessionId
 * Returns per-subject aggregate stats (attempts, avg score, best score).
 */
async function getQuizStats(req, res) {
  if (!dbRequired(res)) return;

  try {
    const { sessionId } = req.params;
    const filter = req.user ? { userId: req.user._id } : { sessionId };

    const stats = await QuizAttempt.aggregate([
      { $match: filter },
      {
        $group: {
          _id:          '$subject',
          attempts:     { $sum: 1 },
          avgScore:     { $avg: '$percentage' },
          bestScore:    { $max: '$percentage' },
          totalCorrect: { $sum: '$score' },
          totalQs:      { $sum: '$total' },
          lastAttempt:  { $max: '$completedAt' },
        },
      },
      { $sort: { lastAttempt: -1 } },
    ]);

    return res.json({
      ok:    true,
      stats: stats.map(s => ({
        subject:      s._id,
        attempts:     s.attempts,
        avgScore:     Math.round(s.avgScore),
        bestScore:    Math.round(s.bestScore),
        totalCorrect: s.totalCorrect,
        totalQs:      s.totalQs,
        lastAttempt:  s.lastAttempt,
      })),
    });
  } catch (err) {
    console.error('[quizController.getQuizStats]', err.message);
    return res.status(500).json({ ok: false, error: 'Failed to fetch quiz stats.' });
  }
}

module.exports = { saveQuizAttempt, getQuizHistory, getQuizStats };
