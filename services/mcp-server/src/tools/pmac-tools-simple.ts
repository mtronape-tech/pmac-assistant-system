import { Server as McpServer } from "@modelcontextprotocol/sdk/server/index.js";
import { z } from "zod";
import { DatabaseService } from "../services/database.js";

import { logger } from "../utils/logger.js";
import { config } from "../config.js";

// Простой HTTP клиент для PMAC Control Service
class SimplePMACClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `http://${config.pmacControl.host}:${config.pmacControl.port}`;
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

export async function setupPMACToolsSimple(
  server: McpServer,
  database: DatabaseService
): Promise<void> {
  
  const pmacClient = new SimplePMACClient();

  // Проверяем доступность сервиса
  try {
    await pmacClient.getStatus();
    logger.info('PMAC Control Service доступен');
  } catch (error) {
    logger.warn('PMAC Control Service недоступен, инструменты могут не работать');
  }

  // Инструмент чтения переменной
  server.setRequestHandler(z.object({
    method: z.literal("tools/call"),
    params: z.object({
      name: z.literal("read_pmac_variable"),
      arguments: z.object({
        variableType: z.enum(["P", "Q", "I", "M", "L"]),
        address: z.number().min(1).max(8191),
      }),
    }),
  }), async (request) => {
    if (request.params.name !== "read_pmac_variable") {
      return {
        content: [{ type: "text", text: "Неверное имя инструмента" }],
      };
    }

    try {
      const { variableType, address } = request.params.arguments;
      
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
    } catch (error) {
      logger.error("Ошибка при чтении переменной:", error);
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
  });

  // Инструмент записи переменной
  server.setRequestHandler(z.object({
    method: z.literal("tools/call"),
    params: z.object({
      name: z.literal("write_pmac_variable"),
      arguments: z.object({
        variableType: z.enum(["P", "Q", "I", "M", "L"]),
        address: z.number().min(1).max(8191),
        value: z.number(),
      }),
    }),
  }), async (request) => {
    if (request.params.name !== "write_pmac_variable") {
      return {
        content: [{ type: "text", text: "Неверное имя инструмента" }],
      };
    }

    try {
      const { variableType, address, value } = request.params.arguments;
      
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
    } catch (error) {
      logger.error("Ошибка при записи переменной:", error);
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
  });

  // Инструмент выполнения команды
  server.setRequestHandler(z.object({
    method: z.literal("tools/call"),
    params: z.object({
      name: z.literal("execute_pmac_command"),
      arguments: z.object({
        command: z.string().min(1).max(255),
      }),
    }),
  }), async (request) => {
    if (request.params.name !== "execute_pmac_command") {
      return {
        content: [{ type: "text", text: "Неверное имя инструмента" }],
      };
    }

    try {
      const { command } = request.params.arguments;
      
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
    } catch (error) {
      logger.error("Ошибка при выполнении команды:", error);
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
  });

  // Инструмент получения статуса
  server.setRequestHandler(z.object({
    method: z.literal("tools/call"),
    params: z.object({
      name: z.literal("get_pmac_status"),
      arguments: z.object({
        includeAxes: z.boolean().optional().default(true),
      }),
    }),
  }), async (request) => {
    if (request.params.name !== "get_pmac_status") {
      return {
        content: [{ type: "text", text: "Неверное имя инструмента" }],
      };
    }

    try {
      const { includeAxes } = request.params.arguments;
      
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
    } catch (error) {
      logger.error("Ошибка при получении статуса:", error);
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
  });

  logger.info("PMAC Tools Simple (с PMAC Control Service) настроены успешно");
}
