const userModel = require("../models/User");

const jwt = require("jsonwebtoken");
const Crypto = require("crypto");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const { log } = require("winston");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (req, res) => {
  console.log("============")
  try {
    const { email } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });
    
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();
    
    const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hello ${user.name || user.email},</p>
          <p>We received a request to reset your password. Please click the button below to create a new password:</p>
          <div style="margin: 20px 0;">
            <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
          </div>
          <p>This link will expire in 15 minutes for your security.</p>
          <p>If you didn't request this password reset, you can safely ignore this email.</p>
          <p>Thank you,<br>The Support Team</p>
        </div>
      `,
    });
    
    res.status(200).json({ message: "Reset link sent" });
  } catch(err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
};
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userModel.findOne({
      _id: decoded.id,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Optional: Match token in DB if you want
    if (user.resetToken !== token) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res
      .status(400)
      .json({ message: "Invalid or expired token", error: err.message });
  }
};

module.exports = { sendEmail, resetPassword };
