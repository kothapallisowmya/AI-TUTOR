/**
 * backend/models/ChatHistory.js
 * 
 * Stores chat messages per session per subject.
 * Each document = one session's chat for one subject.
 * Messages are stored as an array inside the document for efficient retrieval.
 */

'use strict';

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    role: {
      type:     String,
      required: true,
      enum:     ['user', 'ai'],
    },
    // For user messages: plain text
    text: { type: String, default: '' },
    // For AI messages: serialized response object (type + content)
    responseType: {
      type: String,
      enum: ['explanation', 'notes', 'example', 'quiz', ''],
      default: '',
    },
    responseTitle: { type: String, default: '' },
    actionType:    { type: String, default: 'general' },
    timestamp:     { type: Date, default: Date.now },
  },
  { _id: false }
);

const chatHistorySchema = new mongoose.Schema(
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
      index:    true,
    },
    subjectName: { type: String, default: '' },
    messages:    [messageSchema],
    messageCount: {
      type:    Number,
      default: 0,
    },
  },
  {
    timestamps: true, // tracks when chat was first created and last updated
  }
);

// Allow quick lookup by either userId or sessionId + subject
chatHistorySchema.index({ userId: 1, subject: 1 });
chatHistorySchema.index({ sessionId: 1, subject: 1 });

// Keep messageCount in sync
chatHistorySchema.pre('save', function (next) {
  this.messageCount = this.messages.length;
  next();
});

// Hard cap: keep only the last 100 messages per chat to avoid unbounded growth
chatHistorySchema.pre('save', function (next) {
  if (this.messages.length > 100) {
    this.messages = this.messages.slice(-100);
  }
  next();
});

const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);

module.exports = ChatHistory;
