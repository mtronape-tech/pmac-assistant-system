import express from 'express';
import cors from 'cors';
import { logger } from './utils/logger.js';

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
  });
  next();
});

// Мок-данные для демонстрации
const mockDocuments = [
  {
    id: 'doc1',
    title: 'PMAC Контроллер - Руководство по Настройке',
    content: 'Turbo PMAC - высокопроизводительный контроллер движения...',
    type: 'manual',
    category: 'pmac_manual',
    score: 0.95
  },
  {
    id: 'doc2', 
    title: 'Подключение Осей к PMAC',
    content: 'Для подключения оси к PMAC контроллеру выполните следующие шаги...',
    type: 'guide',
    category: 'configuration_guide',
    score: 0.87
  }
];

// API маршруты

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'knowledge-base-test',
      version: '1.0.0',
      health: {
        weaviateConnected: false, // Мок - Weaviate не подключен
        openaiConnected: false,   // Мок - AI не подключен
        diskSpace: {
          available: 1000000000,
          used: 500000000,
          total: 1500000000,
        },
        memoryUsage: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
        },
        uptime: process.uptime(),
      },
    },
  });
});

// API документация
app.get('/api', (req, res) => {
  res.json({
    service: 'Knowledge Base Service (Test Mode)',
    version: '1.0.0-test',
    description: 'Тестовая версия микросервиса базы знаний PMAC Assistant System',
    mode: 'test',
    note: 'Работает без Weaviate и AI провайдеров для демонстрации API',
    endpoints: {
      health: 'GET /health',
      search: 'POST /search',
      ask: 'POST /ask',
      upload: 'POST /documents/upload',
      delete: 'DELETE /documents/{documentId}',
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
        },
      },
      ask: {
        method: 'POST',
        url: '/ask',
        body: {
          query: 'Как подключить ось к контроллеру PMAC?',
          maxSources: 5,
        },
      },
    },
    configuration: {
      supportedFileTypes: ['pdf', 'doc', 'docx', 'txt', 'html', 'md'],
      maxFileSize: '10MB',
      aiProvider: 'test-mode',
      embeddingModel: 'test-embedding',
      aiModel: 'test-model',
    },
  });
});

// Поиск документов (мок)
app.post('/search', (req, res) => {
  try {
    const { query, limit = 10, threshold = 0.7 } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Неверные параметры запроса',
        details: 'Поле query обязательно и должно быть строкой',
      });
    }

    logger.info(`Мок поиск: "${query}"`);
    
    // Простой мок поиска
    const results = mockDocuments
      .filter(doc => doc.score >= threshold)
      .slice(0, limit)
      .map(doc => ({
        document: {
          id: doc.id,
          title: doc.title,
          content: doc.content,
          type: doc.type,
          metadata: {
            filename: `${doc.id}.txt`,
            category: doc.category,
            tags: ['pmac', 'контроллер'],
            language: 'ru',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        score: doc.score,
        highlights: [`...${query}...`],
        context: doc.content.substring(0, 200) + '...',
      }));

    const response = {
      results,
      totalCount: results.length,
      query,
      processingTime: Math.random() * 100, // Мок времени обработки
      suggestions: ['настройка PMAC', 'подключение осей', 'программирование движений'],
    };

    res.json({
      success: true,
      data: response,
    });

  } catch (error) {
    logger.error('Ошибка мок поиска:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка выполнения поиска',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка',
    });
  }
});

// AI-ответ на вопрос (мок)
app.post('/ask', (req, res) => {
  try {
    const { query, maxSources = 5 } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Неверные параметры запроса',
        details: 'Поле query обязательно и должно быть строкой',
      });
    }

    logger.info(`Мок AI вопрос: "${query}"`);
    
    // Мок поиска источников
    const sources = mockDocuments.slice(0, maxSources).map(doc => ({
      document: {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        type: doc.type,
        metadata: {
          filename: `${doc.id}.txt`,
          category: doc.category,
        },
      },
      score: doc.score,
      highlights: [`...${query}...`],
      context: doc.content.substring(0, 200),
    }));

    // Мок AI ответа
    const aiResponse = {
      answer: `Это тестовый ответ на вопрос "${query}". 
      
На основе найденных документов можно сказать, что для подключения оси к PMAC контроллеру необходимо:

1. Выполнить физическое подключение энкодера и выходов управления двигателем
2. Настроить переменные I-типа для оси (I101-I105)
3. Установить параметры ПИД-регулятора
4. Выполнить калибровку и процедуру "homing"

Это мок-ответ от тестового AI сервиса. В реальной системе здесь будет ответ от OpenRouter или OpenAI.`,
      sources,
      confidence: 0.85,
      reasoning: `Ответ основан на анализе ${sources.length} релевантных документов со средним показателем релевантности 90%. Информация подтверждается несколькими источниками, что повышает надежность ответа.`,
      followUpQuestions: [
        'Как настроить ПИД-регулятор для оси?',
        'Какие переменные I-типа наиболее важны?',
        'Как выполнить процедуру homing?'
      ],
    };

    res.json({
      success: true,
      data: aiResponse,
    });

  } catch (error) {
    logger.error('Ошибка мок AI запроса:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка обработки AI запроса',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка',
    });
  }
});

// Статистика (мок)
app.get('/stats', (req, res) => {
  try {
    const stats = {
      documents: {
        totalDocuments: mockDocuments.length,
        totalChunks: mockDocuments.length * 3,
        documentsByType: {
          pdf: 0, doc: 0, docx: 0, txt: 1, html: 0, md: 0,
          manual: 1, specification: 0, guide: 1, troubleshooting: 0,
        },
        documentsByCategory: {
          pmac_manual: 1, programming_guide: 0, hardware_spec: 0,
          troubleshooting: 0, best_practices: 0, case_studies: 0,
          api_documentation: 0, configuration_guide: 1,
          safety_manual: 0, maintenance_guide: 0,
        },
        averageChunksPerDocument: 3,
        totalStorageSize: 50000,
        lastUpdated: new Date().toISOString(),
      },
      processing: {
        activeJobs: 0,
        completedJobs: 5,
        failedJobs: 0,
        averageProcessingTime: 2500,
        queueSize: 0,
      },
    };

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    logger.error('Ошибка получения мок статистики:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения статистики',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка',
    });
  }
});

// Загрузка документа (мок)
app.post('/documents/upload', (req, res) => {
  res.json({
    success: false,
    error: 'Загрузка файлов не реализована в тестовом режиме',
    message: 'В тестовом режиме используются мок-данные. Для полной функциональности запустите сервис с настроенными Weaviate и AI провайдерами.',
  });
});

// Удаление документа (мок)
app.delete('/documents/:documentId', (req, res) => {
  const { documentId } = req.params;
  res.json({
    success: false,
    error: 'Удаление документов не реализовано в тестовом режиме',
    message: `Документ ${documentId} не может быть удален в тестовом режиме.`,
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
      'GET /stats',
    ],
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Необработанная ошибка:', err);
  res.status(500).json({
    success: false,
    error: 'Внутренняя ошибка сервера',
    details: process.env.NODE_ENV === 'development' ? err.message : 'Обратитесь к администратору',
  });
});

// Запуск сервера
const PORT = process.env.KNOWLEDGE_BASE_PORT || 3002;
const HOST = process.env.KNOWLEDGE_BASE_HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  logger.info(`🚀 Knowledge Base Service (Test Mode) запущен на http://${HOST}:${PORT}`);
  logger.info(`📋 API документация: http://${HOST}:${PORT}/api`);
  logger.info(`💊 Health check: http://${HOST}:${PORT}/health`);
  logger.info(`🔍 Поиск: POST http://${HOST}:${PORT}/search`);
  logger.info(`🤖 AI вопросы: POST http://${HOST}:${PORT}/ask`);
  logger.info(`📊 Статистика: GET http://${HOST}:${PORT}/stats`);
  logger.info(`⚠️  ТЕСТОВЫЙ РЕЖИМ: Используются мок-данные вместо реальных AI и векторной базы`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info(`Получен сигнал ${signal}, останавливаем тестовый сервер...`);
  server.close(() => {
    logger.info('Тестовый сервер остановлен');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Обработка ошибок
process.on('uncaughtException', (error) => {
  logger.error('Необработанное исключение:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Необработанное отклонение промиса:', reason);
  process.exit(1);
});
