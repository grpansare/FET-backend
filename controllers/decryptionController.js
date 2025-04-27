// controllers/decryptionController.js
const fs = require('fs');
const path = require('path');
const DecryptedFile = require('../models/decryptedFile');
// Import model for encryption info
const { decryptFile } = require('../utils/decryptionUtils');
const File = require('../models/File');
const { log } = require('winston');

// Process file decryption
async function decryptFileController(req, res) {
  try {
    const { file } = req;
    const { password} = req.body; // Added encryptedFileId parameter
    const socketId = req.body.socketId;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    
    // Retrieve original file information from encrypted file collection
    let originalExtension = '';
    let originalName = file.originalname.replace('.enc', '');
    

    try {
      const encryptedFileInfo = await File.findOne({encryptedName:file.originalname});
      console.log(encryptedFileInfo);
      if (encryptedFileInfo && encryptedFileInfo.originalName) {
          const parts = encryptedFileInfo.originalName.split('.');
          originalExtension = parts.length > 1 ? parts.pop() : '';
          originalName = encryptedFileInfo.originalName;
        } else {
          console.error('Error: Encrypted file info or originalName missing.');
          // Handle error properly here (maybe return response or throw error)
        }
        
        
    } catch (dbError) {
      console.error('Error retrieving original file info:', dbError);
      // Continue with decryption even if original info retrieval fails
    }
    
    // Create a unique name for the decrypted file with original extension
    const decryptedName = `${Date.now()}-decrypted${originalExtension ? '.' + originalExtension.replace(/^\./, '') : ''}`;
    const decryptedPath = path.join(path.resolve(__dirname, '../decrypted'), decryptedName);
    
    try {
      // Decrypt the file with progress reporting
      await decryptFile(file.path, decryptedPath, password, socketId, req.app.get('io'));
      
      // Set expiration (1 hour for decrypted files for security)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      
      // Get file size
      const stats = fs.statSync(decryptedPath);

      console.log(originalExtension);
      
      // Create file record in database
      const fileRecord = new DecryptedFile({
        originalName: originalName,
        originalExtension: originalExtension, // Remove leading dot if present
        decryptedName,
        decryptedPath,
        size: stats.size,
        expiresAt
      });
      
      await fileRecord.save();
      
      // Remove the uploaded encrypted file
      fs.unlinkSync(file.path);
      
      // Return file information
      res.status(200).json({
        fileId: fileRecord._id,
        originalName: fileRecord.originalName,
        originalExtension: fileRecord.originalExtension,
        decryptedName,
        size: stats.size,
        expiresAt
      });
    } catch (decryptionError) {
      // Clean up the partial decrypted file if it exists
      if (fs.existsSync(decryptedPath)) {
        fs.unlinkSync(decryptedPath);
      }
      
      console.error('Decryption error:', decryptionError);
      return res.status(400).json({ 
        error: 'Decryption failed', 
        message: decryptionError.message 
      });
    }
  } catch (error) {
    console.error('Server error during decryption:', error);
    res.status(500).json({ error: 'File decryption failed' });
  }
}

// Download decrypted file
async function downloadDecryptedFile(req, res) {
  try {
    const { id } = req.params;
    
    // Find the file record
    const fileRecord = await DecryptedFile.findById(id);
    
    if (!fileRecord) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check if file is expired
    if (new Date() > new Date(fileRecord.expiresAt)) {
      // Remove expired file
      if (fs.existsSync(fileRecord.decryptedPath)) {
        fs.unlinkSync(fileRecord.decryptedPath);
      }
      await DecryptedFile.findByIdAndDelete(id);
      return res.status(404).json({ error: 'Decrypted file has expired for security reasons' });
    }
    
    // Check if file exists on disk
    if (!fs.existsSync(fileRecord.decryptedPath)) {
      await DecryptedFile.findByIdAndDelete(id);
      return res.status(404).json({ error: 'File not found on disk' });
    }
    
    // Construct download filename with original extension
    const downloadFilename = fileRecord.originalExtension 
      ? `${fileRecord.originalName}.${fileRecord.originalExtension}`
      : fileRecord.originalName;
    
    // Set headers for download
    res.set({
      'Content-Disposition': `attachment; filename="${downloadFilename}"`,
      'Content-Type': 'application/octet-stream' 
    });
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(fileRecord.decryptedPath);
    fileStream.pipe(res);
    
    // REMOVED the auto-deletion code that was here before
    // Now files will remain available until their expiration time
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'File download failed' });
  }
}

module.exports = {
  decryptFileController,
  downloadDecryptedFile
};