// routes/decryptionRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { decryptFileController, downloadDecryptedFile } = require('../controllers/decryptionController');
const { authenticate } = require('../middleware/auth');

// Ensure temp directory exists
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure storage for uploaded encrypted files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Note that we're not adding the /decrypt prefix here since we're already mounting 
// this router at /api/decrypt in the main server.js
router.post('/', upload.single('file'),authenticate, decryptFileController);

// Download decrypted file
router.get('/download-decrypted/:id', downloadDecryptedFile);

module.exports = router;