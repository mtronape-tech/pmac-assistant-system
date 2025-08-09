import winston from 'winston';
import { config } from '../config/index.js';
import { existsSync, mkdirSync } from 'fs';

// Создаем директорию для логов если её нет
if (!existsSync(config.logging.directory)) {
  mkdirSync(config.logging.directory, { recursive: true });
}

// Формат для логов
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Формат для консоли
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = ` ${JSON.stringify(meta)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Создаем logger
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'knowledge-base' },
  transports: [
    // Лог ошибок в отдельный файл
    new winston.transports.File({
      filename: `${config.logging.directory}/error.log`,
      level: 'error',
    }),
    // Все логи в общий файл
    new winston.transports.File({
      filename: `${config.logging.directory}/combined.log`,
    }),
    // Вывод в консоль
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

// Обработка неперехваченных исключений
logger.exceptions.handle(
  new winston.transports.File({ filename: `${config.logging.directory}/exceptions.log` })
);

// Обработка неперехваченных промисов
process.on('unhandledRejection', (ex) => {
  throw ex;
});

export default logger;
