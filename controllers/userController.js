// controllers/authController.js

const authService = require('../services/authService');
const emailService = require('../services/emailService');
const logger = require('../Utils/logger');

/**
 * Register a new user
 */
const register = async (req, res) => {
  try {
    const userId = await authService.createUser(req.body);
    const token = await authService.createToken(userId, 'verification');

    // Send verification email
    // await emailService.sendVerificationEmail(
    //   req.body.email,
    //   req.body.username,
    //   token
    // );


    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.'
    });
  } catch (error) {
    // console.log(error);
    const message = error.message == 'Email already exists'
    ? 'An account with this email already exists.'
    : 'Registration failed';


    logger.error(`Register error: ${error.message}`);
    res.status(500).json({ success: false, message: message});
  }
};

/**
 * Login a user
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(password);
    
    const result = await authService.authenticateUser(email, password);

    if (!result.success) {
      return res.status(401).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

/**
 * Verify email
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const result = await authService.verifyEmail(token);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    logger.error(`Email verification error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Email verification failed' });
  }
};

module.exports = {
  register,
  login,
  verifyEmail
};
