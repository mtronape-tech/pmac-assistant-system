import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DatabaseService } from "../services/database.js";
import { RedisService } from "../services/redis.js";
import { logger } from "../utils/logger.js";

export async function setupRecommendationTools(
  server: McpServer,
  database: DatabaseService,
  redis: RedisService
): Promise<void> {
  // Инструмент для генерации рекомендаций
  server.registerTool(
    "generate_recommendations",
    {
      title: "Генерация рекомендаций",
      description: "Генерирует рекомендации на основе текущего состояния PMAC",
      inputSchema: {
        machineId: z.string().optional().describe("ID машины (по умолчанию: default)"),
        focus: z.enum(["performance", "safety", "maintenance", "optimization"]).optional().describe("Фокус рекомендаций"),
        hours: z.number().min(1).max(168).optional().describe("Количество часов для анализа (по умолчанию: 24)"),
      },
    },
    async ({ machineId = "default", focus = "performance", hours = 24 }) => {
      try {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

        // Получаем данные для анализа
        const data = await database.getPMACData(
          machineId,
          undefined,
          undefined,
          startTime,
          endTime,
          1000
        );

        if (data.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "Недостаточно данных для генерации рекомендаций.",
              },
            ],
          };
        }

        // Простая логика генерации рекомендаций
        const recommendations = generateSimpleRecommendations(data, focus);

        const report = {
          machineId,
          focus,
          timeRange: `${hours} часов`,
          dataPoints: data.length,
          recommendations,
          generatedAt: new Date().toISOString(),
        };

        return {
          content: [
            {
              type: "text",
              text: `Рекомендации для ${machineId} (фокус: ${focus}):\n\n${JSON.stringify(report, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        logger.error("Ошибка генерации рекомендаций:", error);
        return {
          content: [
            {
              type: "text",
              text: `Ошибка генерации рекомендаций: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Инструмент для анализа производительности
  server.registerTool(
    "analyze_performance",
    {
      title: "Анализ производительности",
      description: "Анализирует производительность PMAC и предлагает улучшения",
      inputSchema: {
        machineId: z.string().optional().describe("ID машины (по умолчанию: default)"),
        hours: z.number().min(1).max(168).optional().describe("Количество часов для анализа (по умолчанию: 24)"),
      },
    },
    async ({ machineId = "default", hours = 24 }) => {
      try {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

        const data = await database.getPMACData(
          machineId,
          undefined,
          undefined,
          startTime,
          endTime,
          1000
        );

        if (data.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "Недостаточно данных для анализа производительности.",
              },
            ],
          };
        }

        // Анализ производительности
        const performanceAnalysis = analyzePerformance(data);

        return {
          content: [
            {
              type: "text",
              text: `Анализ производительности для ${machineId}:\n\n${JSON.stringify(performanceAnalysis, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        logger.error("Ошибка анализа производительности:", error);
        return {
          content: [
            {
              type: "text",
              text: `Ошибка анализа производительности: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Инструмент для проверки безопасности
  server.registerTool(
    "check_safety",
    {
      title: "Проверка безопасности",
      description: "Проверяет безопасность операций PMAC",
      inputSchema: {
        machineId: z.string().optional().describe("ID машины (по умолчанию: default)"),
        hours: z.number().min(1).max(168).optional().describe("Количество часов для анализа (по умолчанию: 24)"),
      },
    },
    async ({ machineId = "default", hours = 24 }) => {
      try {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

        const data = await database.getPMACData(
          machineId,
          undefined,
          undefined,
          startTime,
          endTime,
          1000
        );

        if (data.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "Недостаточно данных для проверки безопасности.",
              },
            ],
          };
        }

        // Проверка безопасности
        const safetyReport = checkSafety(data);

        return {
          content: [
            {
              type: "text",
              text: `Отчет о безопасности для ${machineId}:\n\n${JSON.stringify(safetyReport, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        logger.error("Ошибка проверки безопасности:", error);
        return {
          content: [
            {
              type: "text",
              text: `Ошибка проверки безопасности: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  logger.info("Инструменты рекомендаций настроены");
}

// Вспомогательные функции
function generateSimpleRecommendations(data: any[], focus: string): any[] {
  const recommendations = [];

  // Анализируем данные по типам переменных
  const variableStats: Record<string, any> = {};
  
  data.forEach((row: any) => {
    const type = row.variable_type;
    if (!variableStats[type]) {
      variableStats[type] = { values: [], count: 0 };
    }
    variableStats[type].values.push(row.value);
    variableStats[type].count++;
  });

  // Генерируем рекомендации на основе фокуса
  switch (focus) {
    case "performance":
      Object.entries(variableStats).forEach(([type, stats]) => {
        const avg = stats.values.reduce((sum: number, val: number) => sum + val, 0) / stats.values.length;
        const variance = stats.values.reduce((sum: number, val: number) => sum + Math.pow(val - avg, 2), 0) / stats.values.length;
        const stdDev = Math.sqrt(variance);
        
        if (stdDev > avg * 0.5) {
          recommendations.push({
            type: "performance",
            priority: "medium",
            title: `Высокая вариативность переменных ${type}`,
            description: `Переменные типа ${type} показывают высокую вариативность (σ=${stdDev.toFixed(2)}). Рекомендуется проверить настройки.`,
            confidence: 0.7,
          });
        }
      });
      break;

    case "safety":
      // Проверяем на критические значения
      data.forEach((row: any) => {
        if (Math.abs(row.value) > 5000) {
          recommendations.push({
            type: "safety",
            priority: "high",
            title: `Критическое значение переменной ${row.variable_type}${row.variable_address}`,
            description: `Переменная ${row.variable_type}${row.variable_address} имеет критическое значение ${row.value}.`,
            confidence: 0.9,
          });
        }
      });
      break;

    case "maintenance":
      // Рекомендации по обслуживанию
      const totalRecords = data.length;
      if (totalRecords > 500) {
        recommendations.push({
          type: "maintenance",
          priority: "low",
          title: "Рекомендуется анализ данных",
          description: `Собрано ${totalRecords} записей данных. Рекомендуется провести детальный анализ.`,
          confidence: 0.6,
        });
      }
      break;

    case "optimization":
      // Рекомендации по оптимизации
      Object.entries(variableStats).forEach(([type, stats]) => {
        const avg = stats.values.reduce((sum: number, val: number) => sum + val, 0) / stats.values.length;
        if (avg > 1000) {
          recommendations.push({
            type: "optimization",
            priority: "medium",
            title: `Оптимизация переменных ${type}`,
            description: `Среднее значение переменных ${type} высокое (${avg.toFixed(2)}). Возможна оптимизация.`,
            confidence: 0.6,
          });
        }
      });
      break;
  }

  return recommendations.slice(0, 5); // Возвращаем максимум 5 рекомендаций
}

function analyzePerformance(data: any[]): any {
  const variableStats: Record<string, any> = {};
  
  data.forEach((row: any) => {
    const type = row.variable_type;
    if (!variableStats[type]) {
      variableStats[type] = { values: [], count: 0 };
    }
    variableStats[type].values.push(row.value);
    variableStats[type].count++;
  });

  const analysis: Record<string, any> = {};
  
  Object.entries(variableStats).forEach(([type, stats]) => {
    const values = stats.values;
    const avg = values.reduce((sum: number, val: number) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const variance = values.reduce((sum: number, val: number) => sum + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    analysis[type] = {
      count: stats.count,
      average: avg.toFixed(2),
      minimum: min.toFixed(2),
      maximum: max.toFixed(2),
      standardDeviation: stdDev.toFixed(2),
      coefficientOfVariation: (stdDev / avg * 100).toFixed(2) + "%",
      performance: stdDev < avg * 0.3 ? "стабильная" : "нестабильная",
    };
  });

  return {
    summary: {
      totalDataPoints: data.length,
      variablesAnalyzed: Object.keys(analysis).length,
      timeRange: "последние 24 часа",
    },
    analysis,
  };
}

function checkSafety(data: any[]): any {
  const safetyIssues: any[] = [];
  const criticalThreshold = 5000;
  const warningThreshold = 3000;

  data.forEach((row: any) => {
    const absValue = Math.abs(row.value);
    
    if (absValue > criticalThreshold) {
      safetyIssues.push({
        level: "critical",
        variable: `${row.variable_type}${row.variable_address}`,
        value: row.value,
        timestamp: row.time,
        description: `Критическое значение: ${row.value}`,
      });
    } else if (absValue > warningThreshold) {
      safetyIssues.push({
        level: "warning",
        variable: `${row.variable_type}${row.variable_address}`,
        value: row.value,
        timestamp: row.time,
        description: `Предупреждение: значение ${row.value} близко к критическому`,
      });
    }
  });

  return {
    summary: {
      totalDataPoints: data.length,
      criticalIssues: safetyIssues.filter(issue => issue.level === "critical").length,
      warnings: safetyIssues.filter(issue => issue.level === "warning").length,
      safetyStatus: safetyIssues.filter(issue => issue.level === "critical").length > 0 ? "опасно" : "безопасно",
    },
    issues: safetyIssues.slice(0, 10), // Показываем только первые 10 проблем
  };
}
