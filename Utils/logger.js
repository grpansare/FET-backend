const { createLogger, format, transports } = require('winston');
const { NODE_ENV } = require('../config/environment');

// Define log format
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

// Create the logger
const logger = createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'user-registration-api' },
  transports: [
    // Write to all logs with level 'info' and below to 'combined.log'
    new transports.File({ filename: 'logs/combined.log' }),
    // Write all logs with level 'error' and below to 'error.log'
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Console output when not in production
    ...(!NODE_ENV === 'production' 
      ? [new transports.Console({
          format: format.combine(
            format.colorize(),
            format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
          )
        })]
      : [])
  ],
  // Don't exit on handled exceptions
  exitOnError: false
});

// Create a stream object with a 'write' function that will be used by Morgan
logger.stream = {
  write: (message) => {
    // Remove the line break to avoid double line breaks
    logger.info(message.trim());
  }
};

module.exports = logger;