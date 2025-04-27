const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const mongoose = require("./config/conn");
const express = require("express");
const userRoutes = require("./routes/userRoutes");
const fileRoutes = require("./routes/fileRoutes");
const decryptionRoutes = require("./routes/decryptionRoutes");
const logger = require("./Utils/logger");
const { errorHandler } = require("./Utils/errorHandler");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { cleanExpiredDecryptedFiles } = require("./utils/decryptionUtils");
const File = require("./models/File");
const DecryptedFile = require("./models/decryptedFile");

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173", // Allow requests from your frontend
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

const server = http.createServer(app); // create a server instance
const { Server } = require("socket.io");
const PORT = process.env.PORT || 6006;
console.log(PORT);

const io = new Server(server, {
  cors: {
    origin: "*", // allow frontend to connect
    methods: ["GET", "POST"],
  },
});

// Store io globally (optional, useful for use in controllers)
global.io = io;
// Also set io as app property for use in the decryption routes
app.set("io", io);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure required directories exist for decryption service
const decryptedDir = path.join(__dirname, "decrypted");
if (!fs.existsSync(decryptedDir)) {
  fs.mkdirSync(decryptedDir, { recursive: true });
}

const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// File cleanup functions
async function cleanExpiredFiles() {
  try {
    const expiredFiles = await File.find({ expiresAt: { $lt: new Date() } });

    for (const file of expiredFiles) {
      if (fs.existsSync(file.encryptedPath)) {
        fs.unlinkSync(file.encryptedPath);
      }
      await File.findByIdAndDelete(file._id);
    }

    logger.info(`Cleaned ${expiredFiles.length} expired files`);
  } catch (error) {
    logger.error("Error cleaning expired files:", error);
  }
}

// Routes
app.use("/api/users", userRoutes);
app.use("/fileencrypt", fileRoutes);
app.use("/api/decrypt", decryptionRoutes);

// Error handling middleware
app.use(errorHandler);

// Scheduled cleanup jobs
// Run encrypted files cleanup job every hour
setInterval(cleanExpiredFiles, 60 * 60 * 1000);
// Run decrypted files cleanup job more frequently (every 15 minutes) for enhanced security
setInterval(() => cleanExpiredDecryptedFiles(DecryptedFile), 15 * 60 * 1000);

// Start the server
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app; // For testing purposes
