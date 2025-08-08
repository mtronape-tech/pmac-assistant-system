import winston from "winston";
import { config } from "../config.js";

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: "pmac-mcp-server" },
  transports: [
    // Консольный вывод
    new winston.transports.Console({
      format: consoleFormat,
    }),
    
    // Файл для ошибок
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Файл для всех логов
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Создаем папку для логов если её нет
import { mkdir } from "fs/promises";
import { existsSync } from "fs";

if (!existsSync("logs")) {
  await mkdir("logs", { recursive: true });
}

// Обработка необработанных ошибок
process.on("uncaughtException", (error) => {
  logger.error("Необработанная ошибка:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Необработанное отклонение промиса:", { reason, promise });
  process.exit(1);
});
