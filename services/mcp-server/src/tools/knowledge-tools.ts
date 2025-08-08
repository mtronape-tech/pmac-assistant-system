import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DatabaseService } from "../services/database.js";
import { RedisService } from "../services/redis.js";
import { logger } from "../utils/logger.js";

export async function setupKnowledgeBaseTools(
  server: McpServer,
  database: DatabaseService,
  redis: RedisService
): Promise<void> {
  // Инструмент для поиска в документации
  server.registerTool(
    "search_documents",
    {
      title: "Поиск в документации",
      description: "Ищет информацию в базе знаний",
      inputSchema: {
        query: z.string().describe("Поисковый запрос"),
        limit: z.number().min(1).max(50).optional().describe("Максимальное количество результатов (по умолчанию: 10)"),
      },
    },
    async ({ query, limit = 10 }) => {
      try {
        const results = await database.searchDocuments(query, limit);
        
        if (results.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "По вашему запросу ничего не найдено.",
              },
            ],
          };
        }

        const summary = results.map((doc: any) => ({
          id: doc.id,
          title: doc.title,
          content: doc.content?.substring(0, 200) + "...",
          pageNumber: doc.page_number,
          section: doc.section,
        }));

        return {
          content: [
            {
              type: "text",
              text: `Найдено ${results.length} документов:\n\n${summary.map((doc, i) => `${i + 1}. ${doc.title}\n   ${doc.content}`).join("\n\n")}`,
            },
          ],
        };
      } catch (error) {
        logger.error("Ошибка поиска документов:", error);
        return {
          content: [
            {
              type: "text",
              text: `Ошибка поиска: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Инструмент для добавления документа
  server.registerTool(
    "add_document",
    {
      title: "Добавление документа",
      description: "Добавляет новый документ в базу знаний",
      inputSchema: {
        title: z.string().describe("Заголовок документа"),
        content: z.string().describe("Содержимое документа"),
        type: z.enum(["manual", "reference", "tutorial", "configuration"]).optional().describe("Тип документа"),
        category: z.string().optional().describe("Категория документа"),
        tags: z.array(z.string()).optional().describe("Теги документа"),
      },
    },
    async ({ title, content, type = "reference", category = "general", tags = [] }) => {
      try {
        const metadata = {
          type,
          category,
          tags,
          language: "ru",
          version: "1.0",
        };

        const documentId = await database.saveDocument({
          title,
          content,
          metadata,
        });

        // Кэшируем документ
        await redis.cacheDocument(documentId, {
          id: documentId,
          title,
          content,
          metadata,
        });

        return {
          content: [
            {
              type: "text",
              text: `Документ "${title}" успешно добавлен с ID: ${documentId}`,
            },
          ],
        };
      } catch (error) {
        logger.error("Ошибка добавления документа:", error);
        return {
          content: [
            {
              type: "text",
              text: `Ошибка добавления документа: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  logger.info("Инструменты базы знаний настроены");
}
