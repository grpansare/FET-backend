// models/User.js - User model schema

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * User Schema
 */
const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    match: /^[a-zA-Z0-9_]+$/,
  },
  password: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  resetToken: String,
  resetTokenExpiry: Date,
});

/**
 * Create a User model
 */
const User = mongoose.model("Users", UserSchema);

module.exports = User;
