import winston from 'winston';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Configure transports
const transports: winston.transport[] = [];

// Always log to console in development
if (isDevelopment) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug',
    })
  );
}

// File transports for all environments
transports.push(
  // Error logs
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  // Security logs
  new winston.transports.File({
    filename: path.join(logsDir, 'security.log'),
    level: 'warn',
    format: logFormat,
    maxsize: 5242880,
    maxFiles: 5,
  }),
  // Combined logs
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: logFormat,
    maxsize: 5242880,
    maxFiles: 5,
  })
);

// Console in production (for container logs)
if (isProduction) {
  transports.push(
    new winston.transports.Console({
      format: logFormat,
      level: 'info',
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: logFormat,
  defaultMeta: {
    service: 'deals-api',
    environment: process.env.NODE_ENV,
  },
  transports,
  // Don't exit on uncaught errors
  exitOnError: false,
});

// Helper functions for specific log types
export const logSecurityEvent = (event: string, details: Record<string, any>) => {
  logger.warn('Security Event', { event, ...details });
};

export const logAuthSuccess = (userId: string, ip: string, email?: string) => {
  logger.info('Authentication Success', { userId, ip, email, type: 'login' });
};

export const logAuthFailure = (email: string, ip: string, reason?: string) => {
  logger.warn('Authentication Failure', { email, ip, reason, type: 'login_failed' });
};

export const logApiRequest = (method: string, path: string, statusCode: number, duration: number, userId?: string) => {
  logger.info('API Request', { method, path, statusCode, duration, userId });
};

export const logDatabaseQuery = (query: string, duration: number) => {
  if (isDevelopment) {
    logger.debug('Database Query', { query, duration });
  }
};

export const logCacheHit = (key: string, ttl?: number) => {
  logger.debug('Cache Hit', { key, ttl });
};

export const logCacheMiss = (key: string) => {
  logger.debug('Cache Miss', { key });
};

export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    ...context,
  });
};

// Stream for Morgan HTTP logger
export const morganStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;
