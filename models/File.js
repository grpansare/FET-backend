const { default: mongoose } = require("mongoose");

const FileSchema = new mongoose.Schema({
  originalName: String,
  encryptedName: String,
  encryptionKey: String,
  iv: String,
  size: Number,
  format: String,
  encryptedPath: String,
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date,
});

const File = mongoose.model("File", FileSchema);
module.exports = File;
