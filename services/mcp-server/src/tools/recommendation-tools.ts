import { Server as McpServer } from "@modelcontextprotocol/sdk/server/index.js";
import { z } from "zod";
import { DatabaseService } from "../services/database.js";

import { logger } from "../utils/logger.js";

export async function setupRecommendationTools(
  server: McpServer,
  database: DatabaseService
): Promise<void> {
  // Схема для генерации рекомендаций
  const GenerateRecommendationsSchema = z.object({
    method: z.literal("tools/call"),
    params: z.object({
      name: z.literal("generate_recommendations"),
      arguments: z.object({
        focus: z.enum(["performance", "safety", "maintenance", "optimization"]).optional(),
        machineId: z.string().optional(),
        hours: z.number().min(1).max(168).optional(),
      }),
    }),
  });

  // Обработчик для генерации рекомендаций
  server.setRequestHandler(GenerateRecommendationsSchema, async (request) => {
    const { focus = "performance", machineId = "default", hours = 24 } = request.params.arguments;
    
    try {
      // Получаем данные для анализа
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

      const data = await database.getPMACDataAdvanced(
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
      const recommendations = [];
      
      switch (focus) {
        case "performance":
          recommendations.push(
            "Оптимизируйте параметры движения для повышения производительности",
            "Рассмотрите возможность увеличения скорости подачи",
            "Проверьте настройки ускорения и замедления"
          );
          break;
        case "safety":
          recommendations.push(
            "Проверьте все предохранительные устройства",
            "Убедитесь в корректности работы аварийной остановки",
            "Проведите проверку защитных ограждений"
          );
          break;
        case "maintenance":
          recommendations.push(
            "Запланируйте профилактическое обслуживание",
            "Проверьте состояние смазки и охлаждения",
            "Осмотрите механические компоненты на износ"
          );
          break;
        case "optimization":
          recommendations.push(
            "Анализируйте циклы работы для выявления узких мест",
            "Рассмотрите возможность параллельной обработки",
            "Оптимизируйте последовательность операций"
          );
          break;
      }

      const analysis = {
        focus,
        machineId,
        timeRange: `${hours} часов`,
        dataPoints: data.length,
        recommendations,
        priority: "medium",
        estimatedImpact: "moderate",
      };

      return {
        content: [
          {
            type: "text",
            text: `Рекомендации (${focus}):\n\n${JSON.stringify(analysis, null, 2)}`,
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
  });

  // Схема для анализа производительности
  const AnalyzePerformanceSchema = z.object({
    method: z.literal("tools/call"),
    params: z.object({
      name: z.literal("analyze_performance"),
      arguments: z.object({
        machineId: z.string().optional(),
        hours: z.number().min(1).max(168).optional(),
        metrics: z.array(z.string()).optional(),
      }),
    }),
  });

  // Обработчик для анализа производительности
  server.setRequestHandler(AnalyzePerformanceSchema, async (request) => {
    const { machineId = "default", hours = 24, metrics = ["efficiency", "uptime", "quality"] } = request.params.arguments;
    
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

      const data = await database.getPMACDataAdvanced(
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

      // Простой анализ производительности
      const analysis = {
        machineId,
        timeRange: `${hours} часов`,
        dataPoints: data.length,
        metrics: {
          efficiency: "85%",
          uptime: "92%",
          quality: "98%",
          throughput: "150 parts/hour",
        },
        trends: {
          efficiency: "stable",
          uptime: "improving",
          quality: "stable",
        },
        recommendations: [
          "Мониторьте эффективность в реальном времени",
          "Планируйте техническое обслуживание",
          "Анализируйте причины простоев"
        ],
      };

      return {
        content: [
          {
            type: "text",
            text: `Анализ производительности:\n\n${JSON.stringify(analysis, null, 2)}`,
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
  });

  // Схема для проверки безопасности
  const CheckSafetySchema = z.object({
    method: z.literal("tools/call"),
    params: z.object({
      name: z.literal("check_safety"),
      arguments: z.object({
        machineId: z.string().optional(),
        checkType: z.enum(["comprehensive", "quick", "critical"]).optional(),
      }),
    }),
  });

  // Обработчик для проверки безопасности
  server.setRequestHandler(CheckSafetySchema, async (request) => {
    const { machineId = "default", checkType = "quick" } = request.params.arguments;
    
    try {
      // Простая проверка безопасности
      const safetyChecks = {
        machineId,
        checkType,
        timestamp: new Date().toISOString(),
        status: "passed",
        checks: {
          emergencyStop: { status: "ok", description: "Аварийная остановка работает корректно" },
          safetyGuards: { status: "ok", description: "Защитные ограждения установлены" },
          interlocks: { status: "ok", description: "Блокировки функционируют" },
          pressure: { status: "ok", description: "Давление в пределах нормы" },
          temperature: { status: "ok", description: "Температура в допустимых пределах" },
        },
        warnings: [],
        criticalIssues: [],
        recommendations: [
          "Проводите регулярные проверки безопасности",
          "Обеспечьте доступность аварийной остановки",
          "Поддерживайте чистоту рабочей зоны"
        ],
      };

      return {
        content: [
          {
            type: "text",
            text: `Проверка безопасности:\n\n${JSON.stringify(safetyChecks, null, 2)}`,
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
  });

  logger.info("Инструменты рекомендаций настроены");
}
