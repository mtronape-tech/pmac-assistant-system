import { Server as McpServer } from "@modelcontextprotocol/sdk/server/index.js";
import { z } from "zod";
import { DatabaseService } from "../services/database.js";

import { logger } from "../utils/logger.js";

export async function setupKnowledgeBaseTools(
  server: McpServer,
  database: DatabaseService
): Promise<void> {
  // Схема для поиска документов
  const SearchDocumentsSchema = z.object({
    method: z.literal("tools/call"),
    params: z.object({
      name: z.literal("search_documents"),
      arguments: z.object({
        query: z.string(),
        limit: z.number().min(1).max(50).optional(),
      }),
    }),
  });

  // Обработчик для поиска документов
  server.setRequestHandler(SearchDocumentsSchema, async (request) => {
    const { query, limit = 10 } = request.params.arguments;
    
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
  });

  // Схема для добавления документа
  const AddDocumentSchema = z.object({
    method: z.literal("tools/call"),
    params: z.object({
      name: z.literal("add_document"),
      arguments: z.object({
        title: z.string(),
        content: z.string(),
        type: z.enum(["manual", "reference", "tutorial", "configuration"]).optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    }),
  });

  // Обработчик для добавления документа
  server.setRequestHandler(AddDocumentSchema, async (request) => {
    const { title, content, type = "reference", category = "general", tags = [] } = request.params.arguments;
    
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

      // Кэширование отключено (Redis удален)

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
  });

  logger.info("Инструменты базы знаний настроены");
}
