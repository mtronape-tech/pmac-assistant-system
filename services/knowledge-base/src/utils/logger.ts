import winston from 'winston';
import { existsSync, mkdirSync } from 'fs';

// Директория логов по умолчанию
const LOG_DIR = 'services/knowledge-base/logs';

// Создаем директорию для логов если её нет
if (!existsSync(LOG_DIR)) {
	mkdirSync(LOG_DIR, { recursive: true });
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
	level: 'info',
	format: logFormat,
	defaultMeta: { service: 'knowledge-base' },
	transports: [
		// Лог ошибок в отдельный файл
		new winston.transports.File({
			filename: `${LOG_DIR}/error.log`,
			level: 'error',
		}),
		// Все логи в общий файл
		new winston.transports.File({
			filename: `${LOG_DIR}/combined.log`,
		}),
		// Вывод в консоль
		new winston.transports.Console({
			format: consoleFormat,
		}),
	],
});

// Обработка неперехваченных исключений
logger.exceptions.handle(
	new winston.transports.File({ filename: `${LOG_DIR}/exceptions.log` })
);

// Обработка неперехваченных промисов
process.on('unhandledRejection', (ex) => {
	throw ex as any;
});

export default logger;
