// services/authService.js - Authentication service

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Token = require('../models/Tokens');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/environment');
const logger = require('../Utils/logger');
const { log } = require('winston');

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<string>} User ID
 */
const createUser = async (userData) => {
  try {
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
    
    // Create the user
    const user = new User({
      email: userData.email.toLowerCase(),
      password: hashedPassword,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      verified: false,
      createdAt: new Date()
    });
    
    const savedUser = await user.save();
    return savedUser._id;
  } catch (error) {
     console.log(error.message);
     
    logger.error(`Error creating user: ${error.message}`);
    throw error;
  }
};

/**
 * Create a token for verification or password reset
 * @param {string} userId - User ID
 * @param {string} type - Token type ('verification' or 'reset')
 * @returns {Promise<string>} Generated token
 */
const createToken = async (userId, type) => {
  try {
    // Delete any existing tokens for this user and type
    await Token.deleteMany({ userId, type });
    
    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Save the token
    const tokenRecord = new Token({
      userId,
      token,
      type,
      createdAt: new Date()
    });
    
    await tokenRecord.save();
    return token;
  } catch (error) {
    logger.error(`Error creating token: ${error.message}`);
    throw new error("Email already exists");
  }
};

/**
 * Authenticate a user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Authentication result
 */
const authenticateUser = async (email, password) => {
  try {
    // Find the user
    const user = await User.findOne({ email: email });
    if (!user) {
      console.log("===========");
      
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }
    
    // // Check if the user is verified
    // if (!user.verified) {
    //   return {
    //     success: false,
    //     message: 'Please verify your email before logging in'
    //   };
    // }
    
    // Check the password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.log("==============");
      
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }
    
    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        username: user.username
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    return {
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName
      }
    };
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    throw error;
  }
};

/**
 * Verify a user's email
 * @param {string} token - Verification token
 * @returns {Promise<Object>} Verification result
 */
const verifyEmail = async (token) => {
  try {
    // Find the token
    const tokenRecord = await Token.findOne({ token, type: 'verification' });
    if (!tokenRecord) {
      return {
        success: false,
        message: 'Invalid or expired verification token'
      };
    }
    
    // Mark the user as verified
    const user = await User.findById(tokenRecord.userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }
    
    if (user.verified) {
      return {
        success: true,
        message: 'Email already verified'
      };
    }
    
    user.verified = true;
    await user.save();
    
    // Delete the token
    await Token.deleteOne({ _id: tokenRecord._id });
    
    return {
      success: true
    };
  } catch (error) {
    logger.error(`Email verification error: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createUser,
  createToken,
  authenticateUser,
  verifyEmail
};