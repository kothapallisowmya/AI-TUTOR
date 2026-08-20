/**
 * backend/models/User.js
 * 
 * Simple session-based user model.
 * No passwords — each browser gets a UUID stored in localStorage.
 * This lets us associate quiz attempts and chat history without a login system.
 */

'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    sessionId: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
      trim:     true,
    },
    // Auth fields (optional, for registered students)
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
    },
    createdAt: {
      type:    Date,
      default: Date.now,
    },
    lastActive: {
      type:    Date,
      default: Date.now,
    },
    // Optional metadata — can be extended later
    meta: {
      userAgent: { type: String, default: '' },
      timezone:  { type: String, default: '' },
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
  }
);

// Update lastActive on every interaction
userSchema.methods.touch = async function () {
  this.lastActive = new Date();
  return this.save();
};

// Password hashing hook
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Upsert helper — create session if not exists, update lastActive if exists
userSchema.statics.findOrCreate = async function (sessionId, meta = {}) {
  return this.findOneAndUpdate(
    { sessionId },
    {
      $set:         { lastActive: new Date(), meta },
      $setOnInsert: { sessionId },
    },
    { upsert: true, new: true, runValidators: true }
  );
};

const User = mongoose.model('User', userSchema);

module.exports = User;
