// config/environment.js - Environment configuration

require('dotenv').config();

module.exports = {
  // Server configuration

  PORT: process.env.PORT || 3000,
  
  // Database configuration
  MONGODB_URI: process.env.MONGODB_URI ,
  
  // JWT configuration
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  
  // Email configuration
 
  EMAIL_USER: process.env.EMAIL_USER || 'noreply@example.com',
  EMAIL_PASS: process.env.EMAIL_PASS || 'your_email_password',
  
  // Application configuration
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  
  // Flag to determine if we're in development mode
  // IS_DEVELOPMENT: (process.env.NODE_ENV || 'development') === 'development'
};