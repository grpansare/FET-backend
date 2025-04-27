// models/decryptedFile.js
const mongoose = require('mongoose');

const DecryptedFileSchema = new mongoose.Schema({
  originalName: String,
  decryptedName: String,
  decryptedPath: String,
  originalExtension:String,
  size: Number,
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date
});

module.exports = mongoose.model('DecryptedFile', DecryptedFileSchema);
