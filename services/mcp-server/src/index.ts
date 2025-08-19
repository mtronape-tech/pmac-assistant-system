import { Server as McpServer } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";
import { setupPMACTools } from "./tools/pmac-tools.js";
import { setupPMACToolsSimple } from "./tools/pmac-tools-simple.js";
import { setupKnowledgeBaseTools } from "./tools/knowledge-tools.js";
import { setupAnalyticsTools } from "./tools/analytics-tools.js";
import { setupRecommendationTools } from "./tools/recommendation-tools.js";
import { DatabaseService } from "./services/database.js";

async function main() {
  try {
    logger.info("Запуск MCP сервера PMAC Assistant System...");

    // Инициализация сервисов
    const database = new DatabaseService();

    await database.connect();

    logger.info("База данных подключена");

    // Создание MCP сервера
    const server = new McpServer({
      name: "pmac-assistant-mcp",
      version: "1.0.0"
    });

    // Настройка инструментов
    // Используем новую версию PMAC Tools с PMAC Control Service
    if (config.pmacControl.enabled) {
      await setupPMACToolsSimple(server, database);
      logger.info("Используется PMAC Control Service для инструментов PMAC");
    } else {
      await setupPMACTools(server, database);
      logger.info("Используется встроенный симулятор PMAC");
    }
    await setupKnowledgeBaseTools(server, database);
    await setupAnalyticsTools(server, database);
    await setupRecommendationTools(server, database);

    logger.info("Инструменты MCP настроены");

    // Создание Express приложения
    const app = express();
    app.use(express.json());
    app.use(cors({
      origin: '*',
      exposedHeaders: ['Mcp-Session-Id'],
      allowedHeaders: ['Content-Type', 'mcp-session-id'],
    }));

    // Map для хранения транспортов по session ID
    const transports: { [sessionId: string]: SSEServerTransport } = {};

    // Обработка GET запросов для установки SSE соединения
    app.get('/mcp', async (req, res) => {
      const endpoint = '/mcp';
      const transport = new SSEServerTransport(endpoint, res);
      
      // Настройка обработчиков событий
      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId];
          logger.info(`Сессия закрыта: ${transport.sessionId}`);
        }
      };

      transport.onerror = (error) => {
        logger.error('Ошибка транспорта:', error);
      };

      transport.onmessage = async (message) => {
        try {
          // Обработка сообщения сервером
          // В версии 0.4.0 сервер автоматически обрабатывает сообщения
          // через подключенный транспорт
        } catch (error) {
          logger.error('Ошибка обработки сообщения:', error);
        }
      };

      // Сохраняем транспорт
      transports[transport.sessionId] = transport;
      logger.info(`Новая сессия создана: ${transport.sessionId}`);

      // Подключаем сервер к транспорту
      await server.connect(transport);
      
      // Запускаем SSE поток
      await transport.start();
    });

    // Обработка POST запросов для клиент-серверной коммуникации
    app.post('/mcp', async (req, res) => {
      const sessionId = req.query.sessionId as string;
      
      if (!sessionId || !transports[sessionId]) {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        });
        return;
      }

      const transport = transports[sessionId];
      await transport.handlePostMessage(req, res);
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'pmac-mcp-server',
        version: '1.0.0'
      });
    });

    // Запуск сервера
    const PORT = config.port;
    app.listen(PORT, () => {
      logger.info(`MCP сервер запущен на порту ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('Получен сигнал SIGTERM, завершение работы...');
      await database.disconnect();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('Получен сигнал SIGINT, завершение работы...');
      await database.disconnect();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Ошибка запуска MCP сервера:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Критическая ошибка:', error);
  process.exit(1);
});
