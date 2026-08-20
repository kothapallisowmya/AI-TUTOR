/**
 * backend/models/QuizAttempt.js
 * 
 * Stores each completed quiz attempt with full question snapshot,
 * the student's chosen answers, correct answers, and final score.
 */

'use strict';

const mongoose = require('mongoose');

const questionResultSchema = new mongoose.Schema(
  {
    question:     { type: String, required: true },
    options:      [{ type: String }],
    chosenIndex:  { type: Number, required: true }, // index of the option the student picked
    correctIndex: { type: Number, required: true }, // index of the correct answer
    isCorrect:    { type: Boolean, required: true },
    explanation:  { type: String, default: '' },
  },
  { _id: false } // no separate _id per sub-doc
);

const quizAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    sessionId: {
      type:     String,
      required: true,
      index:    true,
      trim:     true,
    },
    subject: {
      type:     String,
      required: true,
      enum:     ['java', 'python', 'dsa', 'dbms', 'os', 'cn', 'se'],
    },
    subjectName: {
      type:    String,
      default: '',
    },
    quizTitle: {
      type:    String,
      default: '',
    },
    score: {
      type: Number,
      required: true,
      min:  0,
    },
    total: {
      type: Number,
      required: true,
      min:  1,
    },
    percentage: {
      type:    Number,
      default: 0,
    },
    questions: [questionResultSchema],
    completedAt: {
      type:    Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-calculate percentage before saving
quizAttemptSchema.pre('save', function (next) {
  this.percentage = Math.round((this.score / this.total) * 100);
  next();
});

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);

module.exports = QuizAttempt;
