/**
 * backend/config/db.js
 * MongoDB connection via Mongoose
 */

'use strict';

const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not defined in .env — check your environment configuration.');
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // fail fast if MongoDB is unreachable
    });

    isConnected = true;
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected.');
      isConnected = true;
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
      isConnected = false;
    });
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    console.error('   Make sure MongoDB is running or MONGO_URI is correct in .env');
    // Don't crash the server — backend still works for static file serving
    isConnected = false;
  }
}

function getConnectionStatus() {
  return {
    connected: isConnected,
    state: mongoose.connection.readyState,
    // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  };
}

module.exports = { connectDB, getConnectionStatus };
