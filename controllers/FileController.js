const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const File = require("../models/File"); // assuming File is exported using module.exports
const { encryptFile } = require("../Utils/FIleEncryption"); // adjust casing if needed
// your custom encryption function

 const encrypt = async (req, res) => {
  try {
    const { file } = req;
    const { password, socketId } = req.body;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Create a unique encrypted filename
    const encryptedFilename = `${Date.now()}-encrypted-${
      path.parse(file.originalname).name
    }.enc`;
    const encryptedFilePath = path.join(encryptedDir, encryptedFilename);

    // Encrypt the file with progress reporting
    const encryptionResult = await encryptFile(
      file.path,
      encryptedFilePath,
      password || crypto.randomBytes(32).toString("hex"),
      socketId
    );

    // Set expiration (24 hours)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Save file record in DB
    const fileRecord = new File({
      originalName: file.originalname,
      encryptedName: encryptedFilename,
      encryptionKey: encryptionResult.key,
      iv: encryptionResult.iv,
      size: file.size,
      format: "AESENC",
      encryptedPath: encryptedFilePath,
      expiresAt,
    });

    await fileRecord.save();

    // Delete original file
    fs.unlinkSync(file.path);

    res.status(200).json({
      fileId: fileRecord._id,
      originalName: file.originalname,
      encryptedName: encryptedFilename,
      expiresAt,
    });
  } catch (error) {
    console.error("Encryption error:", error);
    res.status(500).json({ error: "File encryption failed" });
  }
};
 const download = async (req, res) => {
  try {
    const { id } = req.params;

    const fileRecord = await File.findById(id);

    if (!fileRecord) {
      return res.status(404).json({ error: "File not found" });
    }

    // Check expiration
    if (new Date() > new Date(fileRecord.expiresAt)) {
      if (fs.existsSync(fileRecord.encryptedPath)) {
        fs.unlinkSync(fileRecord.encryptedPath);
      }
      await File.findByIdAndDelete(id);
      return res.status(404).json({ error: "File has expired" });
    }

    if (!fs.existsSync(fileRecord.encryptedPath)) {
      await File.findByIdAndDelete(id);
      return res.status(404).json({ error: "File not found on disk" });
    }

    // Set headers
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileRecord.encryptedName}"`
    );
    res.setHeader("Content-Type", "application/octet-stream");

    const fileStream = fs.createReadStream(fileRecord.encryptedPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "File download failed" });
  }
};
module.exports={encrypt,download}
