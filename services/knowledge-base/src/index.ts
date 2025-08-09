import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { WeaviateService } from './services/weaviate-service.js';
import { AIService } from './services/openai-service.js';
import { KnowledgeController } from './controllers/knowledge-controller.js';

// Создаем Express приложение
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Логирование запросов
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length'),
  });
  next();
});

// Настройка загрузки файлов
if (!existsSync(config.uploads.uploadDir)) {
  mkdirSync(config.uploads.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploads.uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.uploads.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = config.uploads.allowedTypes.map(ext => `.${ext}`);
    const fileExtension = file.originalname.toLowerCase().split('.').pop();
    
    if (fileExtension && config.uploads.allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`Тип файла .${fileExtension} не поддерживается. Разрешены: ${allowedExtensions.join(', ')}`));
    }
  },
});

async function startServer() {
  try {
    logger.info('🚀 Запуск Knowledge Base Service...');

    // Инициализируем сервисы
    logger.info('Инициализация Weaviate...');
    const weaviateService = new WeaviateService();
    await weaviateService.initialize();

    logger.info('Инициализация AI сервиса...');
    const aiService = new AIService();
    
    // Проверяем подключения
    const weaviateHealthy = await weaviateService.healthCheck();
    const aiHealthy = await aiService.healthCheck();
    
    if (!weaviateHealthy) {
      logger.warn('⚠️  Weaviate недоступен, некоторые функции могут не работать');
    }
    
    if (!aiHealthy) {
      logger.warn('⚠️  AI сервис недоступен, AI функции могут не работать');
    }

    // Создаем контроллер
    const knowledgeController = new KnowledgeController(weaviateService, aiService);

    // API маршруты

    // Health check
    app.get('/health', knowledgeController.healthCheck);

    // Поиск и AI
    app.post('/search', knowledgeController.search);
    app.post('/ask', knowledgeController.askQuestion);

    // Управление документами
    app.post('/documents/upload', upload.single('file'), knowledgeController.uploadDocument);
    app.delete('/documents/:documentId', knowledgeController.deleteDocument);

    // Статус обработки
    app.get('/processing/:jobId', knowledgeController.getProcessingStatus);

    // Статистика
    app.get('/stats', knowledgeController.getDocumentStats);

    // API документация
    app.get('/api', (req, res) => {
      res.json({
        service: 'Knowledge Base Service',
        version: '1.0.0',
        description: 'Микросервис для управления базой знаний PMAC Assistant System',
        endpoints: {
          health: 'GET /health',
          search: 'POST /search',
          ask: 'POST /ask',
          upload: 'POST /documents/upload',
          delete: 'DELETE /documents/{documentId}',
          processing: 'GET /processing/{jobId}',
          stats: 'GET /stats',
        },
        examples: {
          search: {
            method: 'POST',
            url: '/search',
            body: {
              query: 'как настроить PMAC контроллер',
              limit: 10,
              threshold: 0.7,
              filters: {
                documentTypes: ['pdf', 'html'],
                categories: ['manual', 'guide'],
              },
            },
          },
          ask: {
            method: 'POST',
            url: '/ask',
            body: {
              query: 'Как подключить ось к контроллеру PMAC?',
              maxSources: 5,
              includeReasoning: true,
            },
          },
          upload: {
            method: 'POST',
            url: '/documents/upload',
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            body: 'FormData с файлом в поле "file"',
          },
        },
        configuration: {
          supportedFileTypes: config.uploads.allowedTypes,
          maxFileSize: `${Math.floor(config.uploads.maxFileSize / 1024 / 1024)}MB`,
          aiProvider: config.ai.provider,
          embeddingModel: config.ai.provider === 'openrouter' ? config.ai.openrouter.embeddingModel : config.ai.openai.embeddingModel,
          aiModel: config.ai.provider === 'openrouter' ? config.ai.openrouter.model : config.ai.openai.model,
        },
      });
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint не найден',
        available_endpoints: [
          'GET /health',
          'GET /api',
          'POST /search',
          'POST /ask',
          'POST /documents/upload',
          'DELETE /documents/{documentId}',
          'GET /processing/{jobId}',
          'GET /stats',
        ],
      });
    });

    // Error handler
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Необработанная ошибка:', err);
      
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'Файл слишком большой',
            maxSize: `${Math.floor(config.uploads.maxFileSize / 1024 / 1024)}MB`,
          });
        }
        
        return res.status(400).json({
          success: false,
          error: 'Ошибка загрузки файла',
          details: err.message,
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера',
        details: process.env.NODE_ENV === 'development' ? err.message : 'Обратитесь к администратору',
      });
    });

    // Запускаем HTTP сервер
    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info(
        `🚀 Knowledge Base Service запущен на http://${config.server.host}:${config.server.port}`
      );
      logger.info(`📋 API документация: http://${config.server.host}:${config.server.port}/api`);
      logger.info(`💊 Health check: http://${config.server.host}:${config.server.port}/health`);
      logger.info(`🔍 Поиск: POST http://${config.server.host}:${config.server.port}/search`);
      logger.info(`🤖 AI вопросы: POST http://${config.server.host}:${config.server.port}/ask`);
      logger.info(`📄 Загрузка: POST http://${config.server.host}:${config.server.port}/documents/upload`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Получен сигнал ${signal}, останавливаем сервер...`);
      
      server.close(async () => {
        logger.info('HTTP сервер остановлен');
        
        try {
          // Здесь можно добавить очистку ресурсов
          logger.info('Ресурсы очищены');
        } catch (error) {
          logger.error('Ошибка при очистке ресурсов:', error);
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
