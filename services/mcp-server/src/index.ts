import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";
import { setupPMACTools } from "./tools/pmac-tools.js";
import { setupKnowledgeBaseTools } from "./tools/knowledge-tools.js";
import { setupAnalyticsTools } from "./tools/analytics-tools.js";
import { setupRecommendationTools } from "./tools/recommendation-tools.js";
import { DatabaseService } from "./services/database.js";
import { RedisService } from "./services/redis.js";

async function main() {
  try {
    logger.info("Запуск MCP сервера PMAC Assistant System...");

    // Инициализация сервисов
    const database = new DatabaseService();
    const redis = new RedisService();

    await database.connect();
    await redis.connect();

    logger.info("База данных и Redis подключены");

    // Создание MCP сервера
    const server = new McpServer({
      name: "pmac-assistant-mcp",
      version: "1.0.0"
    });

    // Настройка инструментов
    await setupPMACTools(server, database, redis);
    await setupKnowledgeBaseTools(server, database, redis);
    await setupAnalyticsTools(server, database, redis);
    await setupRecommendationTools(server, database, redis);

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
    const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

    // Обработка POST запросов для клиент-серверной коммуникации
    app.post('/mcp', async (req, res) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        // Переиспользование существующего транспорта
        transport = transports[sessionId];
      } else if (!sessionId && req.body.method === 'initialize') {
        // Новый запрос инициализации
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
            transports[sessionId] = transport;
            logger.info(`Новая сессия создана: ${sessionId}`);
          },
          enableDnsRebindingProtection: true,
          allowedHosts: ['127.0.0.1', 'localhost'],
        });

        // Очистка транспорта при закрытии
        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId];
            logger.info(`Сессия закрыта: ${transport.sessionId}`);
          }
        };

        await server.connect(transport);
      } else {
        // Некорректный запрос
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

      // Обработка запроса
      await transport.handleRequest(req, res, req.body);
    });

    // Обработка GET запросов для сервер-клиентских уведомлений через SSE
    app.get('/mcp', async (req, res) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
      }
      
      const transport = transports[sessionId];
      await transport.handleRequest(req, res);
    });

    // Обработка DELETE запросов для завершения сессии
    app.delete('/mcp', async (req, res) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
      }
      
      const transport = transports[sessionId];
      await transport.handleRequest(req, res);
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
      await redis.disconnect();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('Получен сигнал SIGINT, завершение работы...');
      await database.disconnect();
      await redis.disconnect();
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
