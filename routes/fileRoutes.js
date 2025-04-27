const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const userController = require("../controllers/userController");
const { sendEmail, resetPassword } = require("../controllers/EmailController");
const { encrypt, download } = require("../controllers/FileController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Setup Upload Directory
const uploadDir = path.join(__dirname, "../uploads"); // use relative path out of routes folder
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Setup Encrypted Directory
const encryptedDir = path.join(__dirname, "../encrypted");
if (!fs.existsSync(encryptedDir)) {
  fs.mkdirSync(encryptedDir, { recursive: true });
}

// Store this globally for access inside controller if needed
global.encryptedDir = encryptedDir;

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Routes
router.post("/api/encrypt", upload.single("file"),authenticate, encrypt);
router.get("/api/download/:id", download);

module.exports = router;
