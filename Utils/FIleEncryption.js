
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
function deriveKey(password, salt) {
  // PBKDF2 with 100,000 iterations and 256-bit key
  return crypto.pbkdf2Sync(password, salt, 100000, 32, "sha512");
}

// Encrypt a file using AES-256-GCM
async function encryptFile(sourceFile, destinationFile, password, socketId) {
  return new Promise((resolve, reject) => {
    // Generate a random salt
    const salt = crypto.randomBytes(16);
    // Derive key from password
    const key = deriveKey(password, salt);
    // Generate a random IV
    const iv = crypto.randomBytes(16);

    // Create cipher using AES-256-GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    // Create read and write streams
    const readStream = fs.createReadStream(sourceFile);
    const writeStream = fs.createWriteStream(destinationFile);

    // Get file size for progress calculation
    const fileSize = fs.statSync(sourceFile).size;
    let bytesProcessed = 0;
    let lastPercentReported = 0;

    // Write custom header with encryption metadata (salt and iv)
    const header = Buffer.concat([
      Buffer.from("AESENC", "utf8"), // Magic bytes for identifying our format
      salt, // 16 bytes for salt
      iv, // 16 bytes for IV
    ]);
    writeStream.write(header);

    // Set up error handlers
    readStream.on("error", (err) => reject(err));
    writeStream.on("error", (err) => reject(err));

    // Process the file
    readStream.on("data", (chunk) => {
      bytesProcessed += chunk.length;
      const percent = Math.floor((bytesProcessed / fileSize) * 100);

      // Report progress every 5%
      if (percent >= lastPercentReported + 5) {
        lastPercentReported = percent;
        io.to(socketId).emit("encryption-progress", { percent });
      }

      // Process the chunk
      const encryptedChunk = cipher.update(chunk);
      if (encryptedChunk.length > 0) {
        writeStream.write(encryptedChunk);
      }
    });

    // Finalize encryption
    readStream.on("end", () => {
      try {
        const final = cipher.final();
        if (final.length > 0) {
          writeStream.write(final);
        }

        // Get authentication tag and write it at the end
        const authTag = cipher.getAuthTag();
        writeStream.write(authTag);

        writeStream.end();

        // Send 100% completion
        io.to(socketId).emit("encryption-progress", { percent: 100 });

        writeStream.on("finish", () => {
          resolve({
            key: key.toString("base64"),
            iv: iv.toString("base64"),
            salt: salt.toString("base64"),
            authTag: authTag.toString("base64"),
          });
        });
      } catch (err) {
        reject(err);
      }
    });
  });
}

module.exports = { encryptFile };
