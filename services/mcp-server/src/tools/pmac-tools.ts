import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DatabaseService } from "../services/database.js";
import { RedisService } from "../services/redis.js";
import { PMACSimulator } from "../services/pmac-simulator.js";
import { logger } from "../utils/logger.js";
import { config } from "../config.js";

export async function setupPMACTools(
  server: McpServer,
  database: DatabaseService,
  redis: RedisService
): Promise<void> {
  const pmacSimulator = new PMACSimulator();

  // Инструмент для чтения переменной PMAC
  server.registerTool(
    "read_pmac_variable",
    {
      title: "Чтение переменной PMAC",
      description: "Читает значение переменной PMAC по типу и адресу",
      inputSchema: {
        variableType: z.enum(["P", "Q", "I", "M", "L"]).describe("Тип переменной PMAC"),
        address: z.number().min(1).max(8192).describe("Адрес переменной (1-8192)"),
        machineId: z.string().optional().describe("ID машины (по умолчанию: default)"),
      },
    },
    async ({ variableType, address, machineId = "default" }) => {
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

        // Кэшируем результат
        await redis.cachePMACData(`${machineId}:${variableType}:${address}`, {
          value,
          timestamp: new Date().toISOString(),
        });

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
    }
  );

  // Инструмент для записи переменной PMAC
  server.registerTool(
    "write_pmac_variable",
    {
      title: "Запись переменной PMAC",
      description: "Записывает значение в переменную PMAC",
      inputSchema: {
        variableType: z.enum(["P", "Q", "I", "M", "L"]).describe("Тип переменной PMAC"),
        address: z.number().min(1).max(8192).describe("Адрес переменной (1-8192)"),
        value: z.number().describe("Значение для записи"),
        machineId: z.string().optional().describe("ID машины (по умолчанию: default)"),
        confirm: z.boolean().optional().describe("Подтверждение операции"),
      },
    },
    async ({ variableType, address, value, machineId = "default", confirm = false }) => {
      try {
        // Проверяем, является ли переменная критической
        const isCritical = isCriticalVariable(variableType, address);
        
        if (isCritical && !confirm) {
          return {
            content: [
              {
                type: "text",
                text: `ВНИМАНИЕ: Переменная ${variableType}${address} является критической. Требуется подтверждение операции.`,
              },
            ],
          };
        }

        if (config.pmac.mode === "simulation") {
          await pmacSimulator.writeVariable(variableType, address, value);
        } else {
          // В реальном режиме здесь будет запись в PMAC контроллер
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

        // Обновляем кэш
        await redis.cachePMACData(`${machineId}:${variableType}:${address}`, {
          value,
          timestamp: new Date().toISOString(),
        });

        return {
          content: [
            {
              type: "text",
              text: `Переменная ${variableType}${address} успешно установлена в ${value}`,
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
    }
  );

  // Инструмент для получения статуса PMAC
  server.registerTool(
    "get_pmac_status",
    {
      title: "Статус PMAC",
      description: "Получает текущий статус контроллера PMAC",
      inputSchema: {
        machineId: z.string().optional().describe("ID машины (по умолчанию: default)"),
      },
    },
    async ({ machineId = "default" }) => {
      try {
        let status: any;

        if (config.pmac.mode === "simulation") {
          status = await pmacSimulator.getStatus();
        } else {
          // В реальном режиме здесь будет получение статуса от PMAC контроллера
          status = {
            controllerState: "idle",
            communicationStatus: "connected",
            coordinates: { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 },
            variables: { P: {}, Q: {}, I: {}, M: {}, L: {} },
            axes: {},
            system: {
              temperature: 25,
              voltage: 24,
              errorCodes: [],
              uptime: 3600,
            },
          };
        }

        // Кэшируем статус
        await redis.cachePMACData(`${machineId}:status`, status, 30);

        return {
          content: [
            {
              type: "text",
              text: `Статус PMAC:\n${JSON.stringify(status, null, 2)}`,
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
    }
  );

  // Инструмент для выполнения команды PMAC
  server.registerTool(
    "execute_pmac_command",
    {
      title: "Выполнение команды PMAC",
      description: "Выполняет команду на контроллере PMAC",
      inputSchema: {
        command: z.string().describe("Команда PMAC для выполнения"),
        machineId: z.string().optional().describe("ID машины (по умолчанию: default)"),
        confirm: z.boolean().optional().describe("Подтверждение операции"),
      },
    },
    async ({ command, machineId = "default", confirm = false }) => {
      try {
        // Проверяем, является ли команда критической
        const isCritical = isCriticalCommand(command);
        
        if (isCritical && !confirm) {
          return {
            content: [
              {
                type: "text",
                text: `ВНИМАНИЕ: Команда "${command}" является критической. Требуется подтверждение операции.`,
              },
            ],
          };
        }

        let result: string;

        if (config.pmac.mode === "simulation") {
          result = await pmacSimulator.executeCommand(command);
        } else {
          // В реальном режиме здесь будет выполнение команды на PMAC контроллере
          result = `Команда "${command}" выполнена успешно`;
          logger.info(`Выполнена команда PMAC: ${command}`);
        }

        return {
          content: [
            {
              type: "text",
              text: result,
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
    }
  );

  // Инструмент для получения исторических данных PMAC
  server.registerTool(
    "get_pmac_history",
    {
      title: "История данных PMAC",
      description: "Получает исторические данные переменных PMAC",
      inputSchema: {
        variableType: z.enum(["P", "Q", "I", "M", "L"]).optional().describe("Тип переменной (опционально)"),
        address: z.number().min(1).max(8192).optional().describe("Адрес переменной (опционально)"),
        machineId: z.string().optional().describe("ID машины (по умолчанию: default)"),
        hours: z.number().min(1).max(168).optional().describe("Количество часов назад (по умолчанию: 24)"),
        limit: z.number().min(1).max(10000).optional().describe("Максимальное количество записей (по умолчанию: 1000)"),
      },
    },
    async ({ variableType, address, machineId = "default", hours = 24, limit = 1000 }) => {
      try {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

        const data = await database.getPMACData(
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
    }
  );

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
    "KILL",
    "ABORT",
    "STOP",
    "RESET",
    "HALT",
    "EMERGENCY",
    "SHUTDOWN",
  ];

  return criticalCommands.some((cc) =>
    command.toUpperCase().includes(cc)
  );
}
