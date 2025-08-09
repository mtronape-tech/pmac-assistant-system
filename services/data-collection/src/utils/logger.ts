import winston from 'winston';
import { appConfig } from '../config/index.js';

const { combine, timestamp, errors, json, simple, colorize, printf } = winston.format;

// Custom format for simple output
const simpleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

export const logger = winston.createLogger({
  level: appConfig.logging.level,
  format: combine(
    errors({ stack: true }),
    timestamp(),
    appConfig.logging.format === 'json' 
      ? json()
      : combine(
          colorize(),
          simpleFormat
        )
  ),
  defaultMeta: { service: 'data-collection' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'logs/data-collection-error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/data-collection-combined.log' 
    }),
  ],
});

// Handle uncaught exceptions and rejections
logger.exceptions.handle(
  new winston.transports.File({ filename: 'logs/data-collection-exceptions.log' })
);

logger.rejections.handle(
  new winston.transports.File({ filename: 'logs/data-collection-rejections.log' })
);
