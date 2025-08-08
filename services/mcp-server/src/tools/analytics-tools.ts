import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DatabaseService } from "../services/database.js";
import { RedisService } from "../services/redis.js";
import { logger } from "../utils/logger.js";

export async function setupAnalyticsTools(
  server: McpServer,
  database: DatabaseService,
  redis: RedisService
): Promise<void> {
  // Инструмент для анализа трендов
  server.registerTool(
    "analyze_trends",
    {
      title: "Анализ трендов",
      description: "Анализирует тренды в данных PMAC",
      inputSchema: {
        variableType: z.enum(["P", "Q", "I", "M", "L"]).describe("Тип переменной для анализа"),
        address: z.number().min(1).max(8192).describe("Адрес переменной"),
        hours: z.number().min(1).max(168).optional().describe("Количество часов для анализа (по умолчанию: 24)"),
        machineId: z.string().optional().describe("ID машины (по умолчанию: default)"),
      },
    },
    async ({ variableType, address, hours = 24, machineId = "default" }) => {
      try {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

        const data = await database.getPMACData(
          machineId,
          variableType,
          address,
          startTime,
          endTime,
          1000
        );

        if (data.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "Недостаточно данных для анализа трендов.",
              },
            ],
          };
        }

        // Простой анализ трендов
        const values = data.map((row: any) => row.value);
        const firstValue = values[0];
        const lastValue = values[values.length - 1];
        const change = lastValue - firstValue;
        const changePercent = (change / firstValue) * 100;
        
        const avg = values.reduce((sum: number, val: number) => sum + val, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        let trend = "стабильный";
        if (changePercent > 5) trend = "растущий";
        else if (changePercent < -5) trend = "падающий";

        const analysis = {
          variable: `${variableType}${address}`,
          timeRange: `${hours} часов`,
          dataPoints: data.length,
          trend,
          change: change.toFixed(2),
          changePercent: changePercent.toFixed(2) + "%",
          statistics: {
            average: avg.toFixed(2),
            minimum: min.toFixed(2),
            maximum: max.toFixed(2),
            range: (max - min).toFixed(2),
          },
        };

        return {
          content: [
            {
              type: "text",
              text: `Анализ трендов для ${variableType}${address}:\n\n${JSON.stringify(analysis, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        logger.error("Ошибка анализа трендов:", error);
        return {
          content: [
            {
              type: "text",
              text: `Ошибка анализа трендов: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Инструмент для обнаружения аномалий
  server.registerTool(
    "detect_anomalies",
    {
      title: "Обнаружение аномалий",
      description: "Обнаруживает аномалии в данных PMAC",
      inputSchema: {
        variableType: z.enum(["P", "Q", "I", "M", "L"]).describe("Тип переменной для анализа"),
        address: z.number().min(1).max(8192).describe("Адрес переменной"),
        hours: z.number().min(1).max(168).optional().describe("Количество часов для анализа (по умолчанию: 24)"),
        machineId: z.string().optional().describe("ID машины (по умолчанию: default)"),
        threshold: z.number().min(1).max(10).optional().describe("Порог для обнаружения аномалий (стандартные отклонения, по умолчанию: 3)"),
      },
    },
    async ({ variableType, address, hours = 24, machineId = "default", threshold = 3 }) => {
      try {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

        const data = await database.getPMACData(
          machineId,
          variableType,
          address,
          startTime,
          endTime,
          1000
        );

        if (data.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "Недостаточно данных для обнаружения аномалий.",
              },
            ],
          };
        }

        // Простое обнаружение аномалий на основе стандартного отклонения
        const values = data.map((row: any) => row.value);
        const avg = values.reduce((sum: number, val: number) => sum + val, 0) / values.length;
        
        const variance = values.reduce((sum: number, val: number) => sum + Math.pow(val - avg, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        const anomalies = data.filter((row: any, index: number) => {
          const zScore = Math.abs((row.value - avg) / stdDev);
          return zScore > threshold;
        });

        const report = {
          variable: `${variableType}${address}`,
          timeRange: `${hours} часов`,
          totalDataPoints: data.length,
          anomaliesFound: anomalies.length,
          threshold: `${threshold} стандартных отклонений`,
          statistics: {
            average: avg.toFixed(2),
            standardDeviation: stdDev.toFixed(2),
            upperBound: (avg + threshold * stdDev).toFixed(2),
            lowerBound: (avg - threshold * stdDev).toFixed(2),
          },
          anomalies: anomalies.slice(0, 10).map((anomaly: any) => ({
            timestamp: anomaly.time,
            value: anomaly.value,
            zScore: Math.abs((anomaly.value - avg) / stdDev).toFixed(2),
          })),
        };

        return {
          content: [
            {
              type: "text",
              text: `Отчет об аномалиях для ${variableType}${address}:\n\n${JSON.stringify(report, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        logger.error("Ошибка обнаружения аномалий:", error);
        return {
          content: [
            {
              type: "text",
              text: `Ошибка обнаружения аномалий: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Инструмент для экспорта данных
  server.registerTool(
    "export_data",
    {
      title: "Экспорт данных",
      description: "Экспортирует данные PMAC в различных форматах",
      inputSchema: {
        variableType: z.enum(["P", "Q", "I", "M", "L"]).optional().describe("Тип переменной (опционально)"),
        address: z.number().min(1).max(8192).optional().describe("Адрес переменной (опционально)"),
        hours: z.number().min(1).max(168).optional().describe("Количество часов назад (по умолчанию: 24)"),
        machineId: z.string().optional().describe("ID машины (по умолчанию: default)"),
        format: z.enum(["json", "csv", "summary"]).optional().describe("Формат экспорта (по умолчанию: summary)"),
      },
    },
    async ({ variableType, address, hours = 24, machineId = "default", format = "summary" }) => {
      try {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

        const data = await database.getPMACData(
          machineId,
          variableType,
          address,
          startTime,
          endTime,
          10000
        );

        if (data.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "Данные для экспорта не найдены.",
              },
            ],
          };
        }

        let exportData: any;

        switch (format) {
          case "json":
            exportData = {
              metadata: {
                machineId,
                variableType,
                address,
                timeRange: { start: startTime.toISOString(), end: endTime.toISOString() },
                totalRecords: data.length,
              },
              data,
            };
            break;

          case "csv":
            const csvHeader = "timestamp,machine_id,variable_type,variable_address,value,quality\n";
            const csvRows = data.map((row: any) => 
              `${row.time},${row.machine_id},${row.variable_type},${row.variable_address},${row.value},${row.quality}`
            ).join("\n");
            exportData = csvHeader + csvRows;
            break;

          case "summary":
          default:
            const values = data.map((row: any) => row.value);
            const avg = values.reduce((sum: number, val: number) => sum + val, 0) / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);
            
            exportData = {
              summary: {
                machineId,
                variableType,
                address,
                timeRange: { start: startTime.toISOString(), end: endTime.toISOString() },
                totalRecords: data.length,
                statistics: {
                  average: avg.toFixed(2),
                  minimum: min.toFixed(2),
                  maximum: max.toFixed(2),
                  range: (max - min).toFixed(2),
                },
              },
              sampleData: data.slice(0, 5),
            };
            break;
        }

        return {
          content: [
            {
              type: "text",
              text: `Экспорт данных (${format}):\n\n${typeof exportData === "string" ? exportData : JSON.stringify(exportData, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        logger.error("Ошибка экспорта данных:", error);
        return {
          content: [
            {
              type: "text",
              text: `Ошибка экспорта данных: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  logger.info("Инструменты аналитики настроены");
}
