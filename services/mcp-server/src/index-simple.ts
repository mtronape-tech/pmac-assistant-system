import { Server as McpServer } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";
import { z } from "zod";

// Упрощенный логгер
const logger = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error),
  warn: (message: string) => console.warn(`[WARN] ${message}`),
  debug: (message: string) => console.log(`[DEBUG] ${message}`)
};

// Упрощенный симулятор PMAC
class SimplePMACSimulator {
  private variables: Map<string, number> = new Map();

  constructor() {
    // Инициализируем некоторые переменные
    this.variables.set('P1', 100);
    this.variables.set('P2', 200);
    this.variables.set('Q1', 150);
    this.variables.set('I1', 50);
  }

  async readVariable(variableType: string, address: number): Promise<number> {
    const key = `${variableType}${address}`;
    const value = this.variables.get(key) || Math.random() * 1000;
    this.variables.set(key, value);
    return value;
  }

  async writeVariable(variableType: string, address: number, value: number): Promise<void> {
    const key = `${variableType}${address}`;
    this.variables.set(key, value);
    logger.info(`Записано ${key} = ${value}`);
  }

  async getStatus(): Promise<any> {
    return {
      connected: true,
      mode: "program",
      status: "ready",
      errors: [],
      warnings: [],
      variables: Object.fromEntries(this.variables)
    };
  }

  async executeCommand(command: string): Promise<any> {
    logger.info(`Выполнена команда: ${command}`);
    return { success: true, response: `Command "${command}" executed successfully` };
  }
}

async function main() {
  try {
    logger.info("Запуск упрощенного MCP сервера PMAC Assistant System...");

    // Создание MCP сервера
    const server = new McpServer({
      name: "pmac-assistant-mcp-simple",
      version: "1.0.0"
    });

    // Создаем симулятор PMAC
    const pmacSimulator = new SimplePMACSimulator();

    // Настройка инструментов PMAC
    const ReadPMACVariableSchema = z.object({
      method: z.literal("tools/call"),
      params: z.object({
        name: z.literal("read_pmac_variable"),
        arguments: z.object({
          variableType: z.enum(["P", "Q", "I", "M", "L"]),
          address: z.number().min(1).max(8192),
          machineId: z.string().optional(),
        }),
      }),
    });

    server.setRequestHandler(ReadPMACVariableSchema, async (request) => {
      const { variableType, address, machineId = "default" } = request.params.arguments;
      
      try {
        const value = await pmacSimulator.readVariable(variableType, address);
        
        return {
          content: [
            {
              type: "text",
              text: `Переменная ${variableType}${address} = ${value}`,
            },
          ],
        };
      } catch (error) {
        logger.error("Ошибка чтения переменной PMAC:", error);
        return {
          content: [
            {
              type: "text",
              text: `Ошибка чтения переменной ${variableType}${address}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });

    // Настройка инструмента получения статуса
    const GetPMACStatusSchema = z.object({
      method: z.literal("tools/call"),
      params: z.object({
        name: z.literal("get_pmac_status"),
        arguments: z.object({
          machineId: z.string().optional(),
        }),
      }),
    });

    server.setRequestHandler(GetPMACStatusSchema, async (request) => {
      const { machineId = "default" } = request.params.arguments;
      
      try {
        const status = await pmacSimulator.getStatus();
        
        return {
          content: [
            {
              type: "text",
              text: `Статус PMAC (${machineId}):\n${JSON.stringify(status, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        logger.error("Ошибка получения статуса PMAC:", error);
        return {
          content: [
            {
              type: "text",
              text: `Ошибка получения статуса PMAC: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });

    // Настройка инструмента выполнения команды
    const ExecutePMACCommandSchema = z.object({
      method: z.literal("tools/call"),
      params: z.object({
        name: z.literal("execute_pmac_command"),
        arguments: z.object({
          command: z.string(),
          machineId: z.string().optional(),
          confirm: z.boolean().optional(),
        }),
      }),
    });

    server.setRequestHandler(ExecutePMACCommandSchema, async (request) => {
      const { command, machineId = "default", confirm = false } = request.params.arguments;
      
      try {
        const result = await pmacSimulator.executeCommand(command);
        
        return {
          content: [
            {
              type: "text",
              text: `Команда "${command}" выполнена:\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        logger.error("Ошибка выполнения команды PMAC:", error);
        return {
          content: [
            {
              type: "text",
              text: `Ошибка выполнения команды "${command}": ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });

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

      // Сохраняем транспорт
      transports[transport.sessionId] = transport;
      logger.info(`Новая сессия создана: ${transport.sessionId}`);

      // Подключаем сервер к транспорту (это автоматически запускает транспорт)
      await server.connect(transport);
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
        service: 'pmac-mcp-server-simple',
        version: '1.0.0'
      });
    });

    // Запуск сервера
    const PORT = 3000;
    app.listen(PORT, () => {
      logger.info(`Упрощенный MCP сервер запущен на порту ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`MCP endpoint: http://localhost:${PORT}/mcp`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('Получен сигнал SIGTERM, завершение работы...');
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('Получен сигнал SIGINT, завершение работы...');
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
