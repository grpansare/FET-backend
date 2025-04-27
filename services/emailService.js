// services/emailService.js - Email service

const nodemailer = require("nodemailer");
const {
  EMAIL_USER,
  EMAIL_PASS,
  CLIENT_URL,
  // IS_DEVELOPMENT
} = require("../config/environment");
const logger = require("../Utils/logger");

// Create email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

/**
 * Send a verification email to the user
 * @param {string} email - User's email address
 * @param {string} username - User's username
 * @param {string} token - Verification token
 * @returns {Promise<void>}
 */
const sendVerificationEmail = async (email, username, token) => {
  console.log("email service");

  const verificationUrl = `${CLIENT_URL}/verify-email/${token}`;

  const mailOptions = {
    from: `"Account Verification" <${EMAIL_USER}>`,
    to: email,
    subject: "Verify Your Account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3366cc;">Welcome, ${username}!</h1>
        <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
        <p>
          <a href="${verificationUrl}" 
             style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
            Verify Email
          </a>
        </p>
        <p>Or copy and paste this URL into your browser:</p>
        <p style="color: #666;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not register for an account, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">This is an automated message, please do not reply.</p>
      </div>
    `,
  };

  try {
    // if (IS_DEVELOPMENT) {
    //   // In development, log the email instead of sending it
    //   logger.info('=========== VERIFICATION EMAIL ===========');
    //   logger.info(`To: ${email}`);
    //   logger.info(`Subject: ${mailOptions.subject}`);
    //   logger.info(`Verification URL: ${verificationUrl}`);
    //   logger.info('=========================================');
    //   return;
    // }

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log("email sent");

    logger.info(`Verification email sent to ${email}`);
  } catch (error) {
    console.log(error);

    logger.error(`Error sending verification email: ${error.message}`);
    throw error;
  }
};

/**
 * Send a password reset email to the user
 * @param {string} email - User's email address
 * @param {string} username - User's username
 * @param {string} token - Password reset token
 * @returns {Promise<void>}
 */
const sendPasswordResetEmail = async (email, username, token) => {
  const resetUrl = `${APP_URL}/reset-password/${token}`;

  const mailOptions = {
    from: `"Password Reset" <${EMAIL_USER}>`,
    to: email,
    subject: "Reset Your Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3366cc;">Hello, ${username}!</h1>
        <p>You requested a password reset. Please click the link below to reset your password:</p>
        <p>
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px;">
            Reset Password
          </a>
        </p>
        <p>Or copy and paste this URL into your browser:</p>
        <p style="color: #666;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">This is an automated message, please do not reply.</p>
      </div>
    `,
  };

  try {
    if (IS_DEVELOPMENT) {
      // In development, log the email instead of sending it
      logger.info("=========== PASSWORD RESET EMAIL ===========");
      logger.info(`To: ${email}`);
      logger.info(`Subject: ${mailOptions.subject}`);
      logger.info(`Reset URL: ${resetUrl}`);
      logger.info("============================================");
      return;
    }

    // Send the email
    await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${email}`);
  } catch (error) {
    logger.error(`Error sending password reset email: ${error.message}`);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
