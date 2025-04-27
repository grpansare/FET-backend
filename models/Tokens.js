// models/Token.js - Token model schema

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Token Schema
 * Used for email verification and password reset
 */
const TokenSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['verification', 'reset'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // 24 hours in seconds
  }
});

/**
 * Create a Token model
 */
const Token = mongoose.model('Token', TokenSchema);

module.exports = Token;