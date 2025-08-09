import express from "express";
import cors from "cors";

// Упрощенный логгер
const logger = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error),
  warn: (message: string) => console.warn(`[WARN] ${message}`),
  debug: (message: string) => console.log(`[DEBUG] ${message}`)
};

// Простой HTTP клиент для PMAC Control Service
class SimplePMACClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:3001';
  }

  async readVariable(type: string, address: number): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/pmac/variable?type=${type}&address=${address}`);
      return await response.json();
    } catch (error) {
      logger.error('Ошибка запроса к PMAC Control Service:', error);
      throw new Error('PMAC Control Service недоступен');
    }
  }

  async writeVariable(type: string, address: number, value: number): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/pmac/variable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, address, value })
      });
      return await response.json();
    } catch (error) {
      logger.error('Ошибка запроса к PMAC Control Service:', error);
      throw new Error('PMAC Control Service недоступен');
    }
  }

  async executeCommand(command: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/pmac/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      return await response.json();
    } catch (error) {
      logger.error('Ошибка запроса к PMAC Control Service:', error);
      throw new Error('PMAC Control Service недоступен');
    }
  }

  async getStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/pmac/status`);
      return await response.json();
    } catch (error) {
      logger.error('Ошибка запроса к PMAC Control Service:', error);
      throw new Error('PMAC Control Service недоступен');
    }
  }
}

const pmacClient = new SimplePMACClient();

async function handleMCPRequest(toolName: string, args: any): Promise<any> {
  try {
    switch (toolName) {
      case 'read_pmac_variable': {
        const { variableType, address } = args;
        logger.info(`Чтение переменной: ${variableType}${address}`);
        
        const response = await pmacClient.readVariable(variableType, address);
        
        if (!response.success) {
          throw new Error(response.error || 'Ошибка чтения переменной');
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                variable: `${variableType}${address}`,
                value: response.data.value,
                timestamp: response.data.timestamp,
              }),
            },
          ],
        };
      }

      case 'write_pmac_variable': {
        const { variableType, address, value } = args;
        logger.info(`Запись переменной: ${variableType}${address} = ${value}`);
        
        const response = await pmacClient.writeVariable(variableType, address, value);
        
        if (!response.success) {
          throw new Error(response.error || 'Ошибка записи переменной');
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                variable: `${variableType}${address}`,
                value: response.data.value,
                timestamp: response.data.timestamp,
              }),
            },
          ],
        };
      }

      case 'execute_pmac_command': {
        const { command } = args;
        logger.info(`Выполнение команды: ${command}`);
        
        const response = await pmacClient.executeCommand(command);
        
        if (!response.success) {
          throw new Error(response.error || 'Ошибка выполнения команды');
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                command: response.data.command,
                result: response.data.result,
                timestamp: response.data.timestamp,
              }),
            },
          ],
        };
      }

      case 'get_pmac_status': {
        const { includeAxes } = args;
        logger.info("Получение статуса PMAC");
        
        const response = await pmacClient.getStatus();
        
        if (!response.success) {
          throw new Error(response.error || 'Ошибка получения статуса');
        }

        const status = response.data;
        
        // Фильтруем данные
        const filteredStatus = {
          controllerState: status.controllerState,
          communicationStatus: status.communicationStatus,
          coordinates: status.coordinates,
          system: status.system,
          ...(includeAxes && { axes: status.axes }),
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                status: filteredStatus,
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        };
      }

      default:
        throw new Error(`Неизвестный инструмент: ${toolName}`);
    }
  } catch (error) {
    logger.error(`Ошибка при выполнении ${toolName}:`, error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Неизвестная ошибка",
          }),
        },
      ],
    };
  }
}

async function startTestServer() {
  try {
    logger.info("Запуск тестового MCP сервера с интеграцией PMAC Control Service...");

    // Проверяем доступность PMAC Control Service
    try {
      await pmacClient.getStatus();
      logger.info('PMAC Control Service доступен для интеграции');
    } catch (error) {
      logger.warn('PMAC Control Service недоступен, инструменты могут не работать');
    }

    const app = express();
    app.use(cors());
    app.use(express.json());

    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "pmac-mcp-server-test",
        version: "1.0.0"
      });
    });

    // Простейший MCP endpoint
    app.post("/mcp", async (req, res) => {
      try {
        const { method, params } = req.body;
        
        if (method !== 'tools/call') {
          return res.status(400).json({
            error: 'Поддерживается только method: tools/call'
          });
        }

        const { name, arguments: args } = params;
        
        logger.info(`MCP запрос: ${name}`, args);
        
        const result = await handleMCPRequest(name, args);
        
        res.json(result);
      } catch (error) {
        logger.error('Ошибка обработки MCP запроса:', error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
        });
      }
    });

    const PORT = 3000;
    app.listen(PORT, () => {
      logger.info(`Тестовый MCP сервер с интеграцией запущен на порту ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`MCP endpoint: http://localhost:${PORT}/mcp`);
    });

  } catch (error) {
    logger.error("Ошибка запуска сервера:", error);
    process.exit(1);
  }
}

startTestServer();
