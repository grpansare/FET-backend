// utils/decryptionUtils.js
const crypto = require('crypto');
const fs = require('fs');

// Utility function to derive key from password and salt
function deriveKey(password, salt) {
  // PBKDF2 with 100,000 iterations and 256-bit key
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha512');
}

// Decrypt a file using AES-256-GCM
async function decryptFile(sourceFile, destinationFile, password, socketId, io) {
  return new Promise((resolve, reject) => {
    // Create read stream to get file header first
    const headerReadStream = fs.createReadStream(sourceFile, { end: 38 }); // 6 bytes for magic + 16 for salt + 16 for IV
    
    let headerData = Buffer.alloc(0);
    
    headerReadStream.on('data', chunk => {
      headerData = Buffer.concat([headerData, chunk]);
    });
    
    headerReadStream.on('error', err => {
      reject(new Error(`Failed to read file header: ${err.message}`));
    });
    
    headerReadStream.on('end', () => {
      try {
        // Check if file has correct format
        const magicBytes = headerData.slice(0, 6).toString('utf8');
        if (magicBytes !== 'AESENC') {
          return reject(new Error('Invalid file format. Not an AESENC encrypted file.'));
        }
        
        // Extract salt and IV from header
        const salt = headerData.slice(6, 22);
        const iv = headerData.slice(22, 38);
        
        // Derive key from password and salt
        const key = deriveKey(password, salt);
        
        // Get file stats for progress tracking
        const stats = fs.statSync(sourceFile);
        const fileSize = stats.size - 38 - 16; // Subtract header size and auth tag size
        
        // Create read stream for the encrypted data (skip header)
        const readStream = fs.createReadStream(sourceFile, { start: 38, end: stats.size - 17 });
        
        // Create decipher
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        
        // Read auth tag (last 16 bytes of file)
        const authTagBuffer = fs.readFileSync(sourceFile).slice(-16);
        decipher.setAuthTag(authTagBuffer);
        
        // Create write stream for decrypted file
        const writeStream = fs.createWriteStream(destinationFile);
        
        let bytesProcessed = 0;
        let lastPercentReported = 0;
        
        // Process data chunks
        readStream.on('data', chunk => {
          try {
            bytesProcessed += chunk.length;
            const percent = Math.floor((bytesProcessed / fileSize) * 100);
            
            // Report progress every 5%
            if (percent >= lastPercentReported + 5) {
              lastPercentReported = percent;
              if (io && socketId) {
                io.to(socketId).emit('decryption-progress', { percent });
              }
            }
            
            // Decrypt chunk
            const decryptedChunk = decipher.update(chunk);
            if (decryptedChunk.length > 0) {
              writeStream.write(decryptedChunk);
            }
          } catch (error) {
            readStream.destroy();
            writeStream.destroy();
            reject(new Error(`Decryption error: ${error.message}`));
          }
        });
        
        // Handle errors
        readStream.on('error', err => {
          writeStream.destroy();
          reject(new Error(`Read stream error: ${err.message}`));
        });
        
        writeStream.on('error', err => {
          readStream.destroy();
          reject(new Error(`Write stream error: ${err.message}`));
        });
        
        // Finish decryption
        readStream.on('end', () => {
          try {
            // Finalize decryption
            const final = decipher.final();
            if (final.length > 0) {
              writeStream.write(final);
            }
            
            writeStream.end();
            
            // Send 100% completion
            if (io && socketId) {
              io.to(socketId).emit('decryption-progress', { percent: 100 });
            }
            
            writeStream.on('finish', () => {
              resolve({ success: true });
            });
          } catch (error) {
            reject(new Error(`Authentication failed: ${error.message}. The password may be incorrect or the file may be corrupted.`));
          }
        });
      } catch (error) {
        reject(new Error(`Decryption initialization error: ${error.message}`));
      }
    });
  });
}

// Function to clean up expired decrypted files
async function cleanExpiredDecryptedFiles(DecryptedFile) {
  try {
    const expiredFiles = await DecryptedFile.find({ expiresAt: { $lt: new Date() } });
    
    for (const file of expiredFiles) {
      if (fs.existsSync(file.decryptedPath)) {
        fs.unlinkSync(file.decryptedPath);
      }
      await DecryptedFile.findByIdAndDelete(file._id);
    }
    
    console.log(`Cleaned ${expiredFiles.length} expired decrypted files`);
  } catch (error) {
    console.error('Error cleaning expired decrypted files:', error);
  }
}

module.exports = {
  deriveKey,
  decryptFile,
  cleanExpiredDecryptedFiles
};