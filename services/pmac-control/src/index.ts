import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { PMACConnectionManager } from './services/pmac-connection-manager.js';
import { PMACController } from './controllers/pmac-controller.js';

// Создаем Express приложение
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Логирование запросов
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined,
  });
  next();
});

// Создаем менеджер подключений и контроллер
const connectionManager = new PMACConnectionManager();
const pmacController = new PMACController(connectionManager);

// Настройка событий менеджера подключений
connectionManager.on('connected', (id) => {
  logger.info(`Подключение ${id} установлено`);
});

connectionManager.on('disconnected', (id) => {
  logger.info(`Подключение ${id} закрыто`);
});

connectionManager.on('connectionError', (id, error) => {
  logger.error(`Ошибка подключения ${id}:`, error);
});

connectionManager.on('dataUpdated', (id, data) => {
  logger.debug(`Обновлены данные от ${id}`, { timestamp: data.timestamp });
});

connectionManager.on('stateChanged', (id, state) => {
  logger.info(`Состояние подключения ${id} изменено на: ${state}`);
});

connectionManager.on('systemError', (id, errorCode) => {
  logger.warn(`Системная ошибка ${errorCode} в подключении ${id}`);
});

// API маршруты

// Health check
app.get('/health', pmacController.healthCheck);

// PMAC Status
app.get('/pmac/status', pmacController.getStatus);
app.get('/pmac/data', pmacController.getDataPoint);
app.get('/pmac/drives', pmacController.getDrives);

// Variables
app.get('/pmac/variable', pmacController.readVariable);
app.post('/pmac/variable', pmacController.writeVariable);
app.post('/pmac/variables/read', pmacController.readMultipleVariables);
app.post('/pmac/variables/write', pmacController.writeMultipleVariables);

// Commands
app.post('/pmac/command', pmacController.executeCommand);

// Connection management
app.get('/connections', pmacController.getConnections);
app.post('/connections', pmacController.createConnection);
app.post('/connections/:id/connect', pmacController.connect);
app.post('/connections/:id/disconnect', pmacController.disconnect);
app.post('/connections/:id/switch', pmacController.switchConnection);

// API документация (простая)
app.get('/api', (req, res) => {
  res.json({
    service: 'PMAC Control Service',
    version: '1.0.0',
    description: 'Микросервис для управления PMAC контроллерами',
    endpoints: {
      health: 'GET /health',
      status: 'GET /pmac/status',
      data: 'GET /pmac/data',
      variables: {
        read: 'GET /pmac/variable?type=P&address=1',
        write: 'POST /pmac/variable',
        readMultiple: 'POST /pmac/variables/read',
        writeMultiple: 'POST /pmac/variables/write',
      },
      commands: {
        execute: 'POST /pmac/command',
      },
      connections: {
        list: 'GET /connections',
        create: 'POST /connections',
        connect: 'POST /connections/:id/connect',
        disconnect: 'POST /connections/:id/disconnect',
        switch: 'POST /connections/:id/switch',
      },
    },
    examples: {
      readVariable: {
        method: 'GET',
        url: '/pmac/variable?type=P&address=1',
      },
      writeVariable: {
        method: 'POST',
        url: '/pmac/variable',
        body: { type: 'P', address: 1, value: 100.5 },
      },
      executeCommand: {
        method: 'POST',
        url: '/pmac/command',
        body: { command: 'START' },
      },
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint не найден',
    code: 'NOT_FOUND',
    available_endpoints: [
      'GET /health',
      'GET /api',
      'GET /pmac/status',
      'GET /pmac/data',
      'GET /pmac/variable',
      'POST /pmac/variable',
      'POST /pmac/variables/read',
      'POST /pmac/variables/write',
      'POST /pmac/command',
      'GET /connections',
      'POST /connections',
      'POST /connections/:id/connect',
      'POST /connections/:id/disconnect',
      'POST /connections/:id/switch',
    ],
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Необработанная ошибка:', err);
  
  res.status(500).json({
    success: false,
    error: 'Внутренняя ошибка сервера',
    code: 'INTERNAL_ERROR',
    details: process.env.NODE_ENV === 'development' ? err.message : 'Обратитесь к администратору',
  });
});

// Инициализация и запуск сервера
async function startServer() {
  try {
    // Создаем подключение по умолчанию
    await connectionManager.createConnection('default', {
      type: config.pmac.mode === 'simulation' ? 'simulation' : config.pmac.connection.type,
      host: config.pmac.connection.host,
      port: config.pmac.connection.port,
      serialPort: config.pmac.connection.serialPort,
      baudRate: config.pmac.connection.baudRate,
      timeout: 5000,
      retries: 3,
    });

    // Автоматически подключаемся при старте
    if (config.pmac.mode === 'simulation') {
      await connectionManager.connect('default');
      logger.info('Автоматическое подключение к симулятору выполнено');
    }

    // Запускаем HTTP сервер
    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info(
        `🚀 PMAC Control Service запущен на http://${config.server.host}:${config.server.port}`
      );
      logger.info(`📋 API документация: http://${config.server.host}:${config.server.port}/api`);
      logger.info(`💊 Health check: http://${config.server.host}:${config.server.port}/health`);
      logger.info(`🔧 Режим PMAC: ${config.pmac.mode}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Получен сигнал ${signal}, останавливаем сервер...`);
      
      server.close(async () => {
        logger.info('HTTP сервер остановлен');
        
        try {
          await connectionManager.disconnectAll();
          connectionManager.destroy();
          logger.info('Все подключения закрыты');
        } catch (error) {
          logger.error('Ошибка при закрытии подключений:', error);
        }
        
        process.exit(0);
      });

      // Принудительная остановка через 10 секунд
      setTimeout(() => {
        logger.error('Принудительная остановка сервера');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

// Обработка необработанных ошибок
process.on('uncaughtException', (error) => {
  logger.error('Необработанное исключение:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Необработанное отклонение промиса:', reason);
  process.exit(1);
});

// Запускаем сервер
startServer().catch((error) => {
  logger.error('Критическая ошибка при запуске:', error);
  process.exit(1);
});
