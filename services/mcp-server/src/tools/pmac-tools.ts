import { Server as McpServer } from "@modelcontextprotocol/sdk/server/index.js";
import { z } from "zod";
import { DatabaseService } from "../services/database.js";

import { PMACSimulator } from "../services/pmac-simulator.js";
import { logger } from "../utils/logger.js";
import { config } from "../config.js";
import { CallToolRequestSchema, CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

export async function setupPMACTools(
  server: McpServer,
  database: DatabaseService
): Promise<void> {
  const pmacSimulator = new PMACSimulator();

  // Схема для инструмента чтения переменной PMAC
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

  // Обработчик для чтения переменной PMAC
  server.setRequestHandler(ReadPMACVariableSchema, async (request) => {
    const { variableType, address, machineId = "default" } = request.params.arguments;
    
    try {
      let value: number;

      if (config.pmac.mode === "simulation") {
        value = await pmacSimulator.readVariable(variableType, address);
      } else {
        // В реальном режиме здесь будет подключение к PMAC контроллеру
        value = Math.random() * 100; // Заглушка
      }

      // Сохраняем данные в базу
      await database.savePMACData({
        machineId,
        variableType,
        variableAddress: address,
        value,
        quality: "good",
      });

      // Кэширование отключено (Redis удален)

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

  // Схема для инструмента записи переменной PMAC
  const WritePMACVariableSchema = z.object({
    method: z.literal("tools/call"),
    params: z.object({
      name: z.literal("write_pmac_variable"),
      arguments: z.object({
        variableType: z.enum(["P", "Q", "I", "M", "L"]),
        address: z.number().min(1).max(8192),
        value: z.number(),
        machineId: z.string().optional(),
        confirm: z.boolean().optional(),
      }),
    }),
  });

  // Обработчик для записи переменной PMAC
  server.setRequestHandler(WritePMACVariableSchema, async (request) => {
    const { variableType, address, value, machineId = "default", confirm = false } = request.params.arguments;
    
    try {
      // Проверяем, является ли переменная критической
      const isCritical = isCriticalVariable(variableType, address);
      
      if (isCritical && !confirm) {
        return {
          content: [
            {
              type: "text",
              text: `ВНИМАНИЕ: Переменная ${variableType}${address} является критической. Для записи требуется подтверждение (confirm: true).`,
            },
          ],
          isError: true,
        };
      }

      if (config.pmac.mode === "simulation") {
        await pmacSimulator.writeVariable(variableType, address, value);
      } else {
        // В реальном режиме здесь будет подключение к PMAC контроллеру
        logger.info(`Запись в PMAC: ${variableType}${address} = ${value}`);
      }

      // Сохраняем данные в базу
      await database.savePMACData({
        machineId,
        variableType,
        variableAddress: address,
        value,
        quality: "good",
      });

      return {
        content: [
          {
            type: "text",
            text: `Переменная ${variableType}${address} успешно записана значением ${value}`,
          },
        ],
      };
    } catch (error) {
      logger.error("Ошибка записи переменной PMAC:", error);
      return {
        content: [
          {
            type: "text",
            text: `Ошибка записи переменной ${variableType}${address}: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Схема для получения статуса PMAC
  const GetPMACStatusSchema = z.object({
    method: z.literal("tools/call"),
    params: z.object({
      name: z.literal("get_pmac_status"),
      arguments: z.object({
        machineId: z.string().optional(),
      }),
    }),
  });

  // Обработчик для получения статуса PMAC
  server.setRequestHandler(GetPMACStatusSchema, async (request) => {
    const { machineId = "default" } = request.params.arguments;
    
    try {
      let status: any;

      if (config.pmac.mode === "simulation") {
        status = await pmacSimulator.getStatus();
      } else {
        // В реальном режиме здесь будет подключение к PMAC контроллеру
        status = {
          connected: true,
          mode: "program",
          status: "ready",
          errors: [],
          warnings: [],
        };
      }

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

  // Схема для выполнения команды PMAC
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

  // Обработчик для выполнения команды PMAC
  server.setRequestHandler(ExecutePMACCommandSchema, async (request) => {
    const { command, machineId = "default", confirm = false } = request.params.arguments;
    
    try {
      // Проверяем, является ли команда критической
      const isCritical = isCriticalCommand(command);
      
      if (isCritical && !confirm) {
        return {
          content: [
            {
              type: "text",
              text: `ВНИМАНИЕ: Команда "${command}" является критической. Для выполнения требуется подтверждение (confirm: true).`,
            },
          ],
          isError: true,
        };
      }

      let result: any;

      if (config.pmac.mode === "simulation") {
        result = await pmacSimulator.executeCommand(command);
      } else {
        // В реальном режиме здесь будет подключение к PMAC контроллеру
        result = { success: true, response: "Command executed" };
      }

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

  // Схема для получения исторических данных PMAC
  const GetPMACHistorySchema = z.object({
    method: z.literal("tools/call"),
    params: z.object({
      name: z.literal("get_pmac_history"),
      arguments: z.object({
        variableType: z.enum(["P", "Q", "I", "M", "L"]).optional(),
        address: z.number().min(1).max(8192).optional(),
        machineId: z.string().optional(),
        hours: z.number().min(1).max(168).optional(),
        limit: z.number().min(1).max(10000).optional(),
      }),
    }),
  });

  // Обработчик для получения исторических данных PMAC
  server.setRequestHandler(GetPMACHistorySchema, async (request) => {
    const { variableType, address, machineId = "default", hours = 24, limit = 1000 } = request.params.arguments;
    
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

      const data = await database.getPMACDataAdvanced(
        machineId,
        variableType,
        address,
        startTime,
        endTime,
        limit
      );

      if (data.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "Исторические данные не найдены",
            },
          ],
        };
      }

      const summary = {
        totalRecords: data.length,
        timeRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString(),
        },
        variables: variableType ? `${variableType}${address || ""}` : "все",
        sampleData: data.slice(0, 5), // Первые 5 записей для примера
      };

      return {
        content: [
          {
            type: "text",
            text: `Исторические данные PMAC:\n${JSON.stringify(summary, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      logger.error("Ошибка получения исторических данных PMAC:", error);
      return {
        content: [
          {
            type: "text",
            text: `Ошибка получения исторических данных: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  logger.info("Инструменты PMAC настроены");
}

// Вспомогательные функции
function isCriticalVariable(variableType: string, address: number): boolean {
  // Определяем критические переменные
  const criticalVariables = [
    { type: "P", addresses: [1, 2, 3, 4, 5] }, // Программные переменные
    { type: "Q", addresses: [1, 2, 3, 4, 5] }, // Координатные переменные
    { type: "I", addresses: [1, 2, 3, 4, 5] }, // I/O переменные
    { type: "M", addresses: [1, 2, 3, 4, 5] }, // Переменные движения
    { type: "L", addresses: [1, 2, 3, 4, 5] }, // Локальные переменные
  ];

  return criticalVariables.some(
    (cv) => cv.type === variableType && cv.addresses.includes(address)
  );
}

function isCriticalCommand(command: string): boolean {
  // Определяем критические команды
  const criticalCommands = [
    "&", // Остановка движения
    "!", // Аварийная остановка
    "R", // Сброс
    "X", // Сброс ошибок
    "Z", // Обнуление координат
  ];

  return criticalCommands.some((cc) => command.toUpperCase().includes(cc));
}
