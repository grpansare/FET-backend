// middleware/auth.js - Authentication middleware

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/environment');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("2====");
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log(decoded);
    
    
    // Find user by ID
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.log("1====");
      
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Attach user to request
    req.user = {
      id: user._id,
      email: user.email,
      username: user.username
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    logger.error(`Authentication error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during authentication'
    });
  }
};

module.exports = {
  authenticate
};