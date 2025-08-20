import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { VectraService } from '../services/vectra-service.js';
import { AIService } from '../services/openai-service.js';
import { DocumentProcessingManager } from '../processors/document-processor.js';
import { TextProcessor } from '../processors/text-processor.js';
import { PDFProcessor } from '../processors/pdf-processor.js';
import { HTMLProcessor } from '../processors/html-processor.js';
import type { 
  SearchQuery, 
  Document, 
  UploadResult,
  DocumentStats,
  ProcessingStats,
  HealthStatus
} from '../types/knowledge-types.js';

// Схемы валидации
const SearchQuerySchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).optional().default(10),
  threshold: z.number().min(0).max(1).optional().default(0.7),
  includeContent: z.boolean().optional().default(true),
  filters: z.object({
    documentTypes: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional(),
    language: z.string().optional(),
  }).optional(),
});

const AIQuerySchema = z.object({
  query: z.string().min(1),
  maxSources: z.number().int().min(1).max(10).optional().default(5),
  includeReasoning: z.boolean().optional().default(true),
});

export class KnowledgeController {
  private vectraService: VectraService;
  private aiService: AIService;
  private processingManager: DocumentProcessingManager;

  constructor(
    vectraService: VectraService,
    aiService: AIService
  ) {
    this.vectraService = vectraService;
    this.aiService = aiService;
    this.processingManager = new DocumentProcessingManager(vectraService, aiService);
    
    // Регистрируем процессоры документов
    this.setupProcessors();
  }

  private setupProcessors(): void {
    this.processingManager.registerProcessor('text/plain', new TextProcessor());
    this.processingManager.registerProcessor('text/markdown', new TextProcessor());
    this.processingManager.registerProcessor('application/pdf', new PDFProcessor());
    this.processingManager.registerProcessor('text/html', new HTMLProcessor());
    
    logger.info('Процессоры документов зарегистрированы');
  }

  // Поиск документов
  search = async (req: Request, res: Response): Promise<void> => {
    try {
      const searchData = SearchQuerySchema.parse(req.body);
      
      logger.info(`Поиск: "${searchData.query}"`);
      
      // Генерируем эмбеддинг для запроса
      const embeddingResponse = await this.aiService.generateEmbedding({
        text: searchData.query,
      });
      
      // Выполняем поиск в Vectra
      const searchResults = await this.vectraService.searchDocuments({
        query: searchData.query,
        text: searchData.query,
        embedding: embeddingResponse.embedding,
        limit: searchData.limit,
        threshold: searchData.threshold
      });
      
      const response = {
        results: searchResults,
        totalCount: searchResults.length,
        query: searchData.query,
        processingTime: 0, // TODO: измерить время
        suggestions: [], // TODO: генерировать предложения
      };
      
      res.json({
        success: true,
        data: response,
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Неверные параметры запроса',
          details: error.errors,
        });
        return;
      }
      
      logger.error('Ошибка поиска:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка выполнения поиска',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  // AI-ответ на вопрос
  askQuestion = async (req: Request, res: Response): Promise<void> => {
    try {
      const queryData = AIQuerySchema.parse(req.body);
      
      logger.info(`AI вопрос: "${queryData.query}"`);
      
      // Сначала делаем поиск
      const embeddingResponse = await this.aiService.generateEmbedding({
        text: queryData.query,
      });
      
      const searchResults = await this.vectraService.searchDocuments({
        query: queryData.query,
        text: queryData.query,
        embedding: embeddingResponse.embedding,
        limit: queryData.maxSources,
        threshold: 0.6
      });
      
      // Генерируем AI ответ
      const aiResponse = await this.aiService.generateAIResponse(
        queryData.query,
        searchResults
      );
      
      res.json({
        success: true,
        data: aiResponse,
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Неверные параметры запроса',
          details: error.errors,
        });
        return;
      }
      
      logger.error('Ошибка AI запроса:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка обработки AI запроса',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  // Загрузка документа
  uploadDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'Файл не предоставлен',
        });
        return;
      }
      
      const file = req.file;
      const { title, category, tags, author } = req.body;
      
      logger.info(`Загрузка документа: ${file.originalname}`);
      
      // Создаем документ
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Запускаем обработку
      const processingJob = await this.processingManager.processDocument(
        documentId,
        file.path,
        file.originalname,
        file.mimetype
      );
      
             const result: UploadResult = {
         documentId,
         fileSize: file.size,
         processingJobId: processingJob.id,
         status: 'processing',
         message: 'Документ загружен и поставлен в очередь на обработку',
       };

      // Сохраняем стартовую запись о документе в хранилище (Vectra/in-memory)
      try {
        // Нормализуем категорию
        let normalizedCategory = 'documentation';
        if (category) {
          const cat = String(category).toLowerCase().trim();
          if (['documentation', 'tutorial', 'troubleshooting'].includes(cat)) {
            normalizedCategory = cat;
          }
        }
        
        // Нормализуем теги
        let normalizedTags: string[] = [];
        if (tags) {
          if (typeof tags === 'string') {
            normalizedTags = tags.split(',').map((t: string) => t.trim()).filter(Boolean);
          } else if (Array.isArray(tags)) {
            normalizedTags = tags.map(t => String(t).trim()).filter(Boolean);
          }
        }
        
                 const title = (req.body.title as string) || file.originalname.replace(/\.[^/.]+$/, '');
         
         await this.vectraService.addDocument({
           id: documentId,
           title: this.fixEncoding(title),
           filename: file.originalname, // Сохраняем оригинальное имя файла с расширением
           fileSize: file.size,
           uploadDate: new Date().toISOString(),
           author: this.fixEncoding((req.body.author as string) || ''),
           category: normalizedCategory,
           tags: normalizedTags,
           status: 'processing',
           type: 'document',
           description: this.fixEncoding(req.body.description || '')
         });
      } catch (e) {
        logger.warn('Не удалось сохранить стартовую запись документа в хранилище:', e);
      }
      
      res.status(201).json({
        success: true,
        data: result,
      });
      
    } catch (error) {
      logger.error('Ошибка загрузки документа:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка загрузки документа',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  // Получение списка документов
  getDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { category, search, limit = 50, offset = 0 } = req.query;
      
      // Если Vectra недоступен, используем in-memory
      if (!this.vectraService.isAvailable) {
        const documents = Array.from(this.vectraService.inMemoryDocuments.values())
          .filter((doc: any) => {
            if (category && doc.category !== category) return false;
            if (search && !doc.title.toLowerCase().includes(String(search).toLowerCase())) return false;
            return true;
          })
          .slice(Number(offset), Number(offset) + Number(limit));
          
        res.json({
          success: true,
          data: {
            documents,
            totalCount: documents.length,
            hasMore: false
          }
        });
        return;
      }

      // Получаем документы из Vectra
      const allDocuments = await this.vectraService.getAllDocuments();
      
      // Применяем фильтры
      let documents = allDocuments;
      
      if (category) {
        documents = documents.filter(doc => String(doc.category || '') === String(category));
      }
      
             if (search) {
         const searchLower = String(search).toLowerCase();
         documents = documents.filter(doc => 
           String(doc.title).toLowerCase().includes(searchLower)
         );
       }
      
      // Применяем пагинацию
      const startIndex = Number(offset);
      const endIndex = startIndex + Number(limit);
      documents = documents.slice(startIndex, endIndex);
      
      res.json({
        success: true,
        data: {
          documents,
          totalCount: documents.length,
          hasMore: documents.length === Number(limit)
        }
      });
      
    } catch (error) {
      logger.error('Ошибка получения документов:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения списка документов',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  // Получение статуса обработки
  getProcessingStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.params;
      
      const job = this.processingManager.getJob(jobId);
      
      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Задача обработки не найдена',
        });
        return;
      }
      
      res.json({
        success: true,
        data: job,
      });
      
    } catch (error) {
      logger.error('Ошибка получения статуса обработки:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения статуса',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  // Обработка документа с помощью AI
  processDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { documentId } = req.params;
      
      logger.info(`Запуск AI обработки документа: ${documentId}`);
      
      // Проверяем, существует ли документ
      if (!this.vectraService.isAvailable) {
        // В режиме in-memory проверяем локальное хранилище
        const doc = this.vectraService.inMemoryDocuments.get(documentId);
        if (!doc) {
          res.status(404).json({
            success: false,
            error: 'Документ не найден',
          });
          return;
        }
      }
      
      // Запускаем повторную обработку с AI анализом
      const processingJob = await this.processingManager.reprocessDocument(
        documentId,
        { enableAIAnalysis: true, extractSummary: true, extractKeywords: true }
      );
      
      res.status(200).json({
        success: true,
        data: {
          documentId,
          processingJobId: processingJob.id,
          status: 'processing',
          message: 'AI обработка документа запущена',
        },
      });
      
    } catch (error) {
      logger.error('Ошибка AI обработки документа:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка запуска AI обработки',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  // Удаление документа
  deleteDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { documentId } = req.params;
      
      logger.info(`Удаление документа: ${documentId}`);
      
      await this.vectraService.deleteDocument(documentId);
      
      res.json({
        success: true,
        message: 'Документ удален успешно',
      });
      
    } catch (error) {
      logger.error('Ошибка удаления документа:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка удаления документа',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  // Статистика документов
  getDocumentStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const vectraStats = await this.vectraService.getStats();
      const processingStats = this.getProcessingStats();
      
      // Используем реальные данные из Vectra/in-memory
      const stats: DocumentStats = {
        totalDocuments: vectraStats.totalDocuments || 0,
        totalChunks: vectraStats.totalChunks || 0,
        documentsByType: {
          pdf: 0,
          doc: 0,
          docx: 0,
          txt: 0,
          html: 0,
          md: 0,
          manual: 0,
          specification: 0,
          guide: 0,
          troubleshooting: 0,
        },
        documentsByCategory: vectraStats.documentsByCategory || {
          documentation: 0,
          tutorial: 0,
          troubleshooting: 0
        },
        averageChunksPerDocument: vectraStats.totalDocuments > 0 ? 
          Math.round(vectraStats.totalChunks / vectraStats.totalDocuments) : 0,
        totalStorageSize: vectraStats.totalStorageSize || 0,
        lastUpdated: new Date(),
      };
      
      // Определяем типы документов по названию и категории
      const allDocuments = await this.vectraService.getAllDocuments();
      for (const doc of allDocuments) {
        if (doc.title?.toLowerCase().includes('manual')) {
          stats.documentsByType.manual++;
        } else if (doc.title?.toLowerCase().includes('spec')) {
          stats.documentsByType.specification++;
        } else if (doc.title?.toLowerCase().includes('guide')) {
          stats.documentsByType.guide++;
        } else if (doc.category === 'troubleshooting') {
          stats.documentsByType.troubleshooting++;
        } else {
          // По умолчанию считаем документацией
          stats.documentsByType.pdf++;
        }
      }
      
      // Обновляем категории из реальных данных
      stats.documentsByCategory = vectraStats.documentsByCategory || {
        documentation: 0,
        tutorial: 0,
        troubleshooting: 0
      };
      
      res.json({
        success: true,
        data: {
          documents: stats,
          processing: processingStats,
        },
      });
      
    } catch (error) {
      logger.error('Ошибка получения статистики:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения статистики',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  // Health check
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const vectraHealthy = this.vectraService.isAvailable;
      const aiHealthy = await this.aiService.healthCheck();
      
      // Если Vectra недоступен, используем in-memory
      if (!vectraHealthy) {
        logger.warn('Vectra недоступен, используем in-memory хранилище');
      }
      
      const health: HealthStatus = {
        status: vectraHealthy && aiHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        services: {
          vectra: vectraHealthy,
          openai: aiHealthy,
          fileSystem: true
        },
        uptime: process.uptime(),
        version: '1.0.0'
      };
      
      const isHealthy = vectraHealthy && aiHealthy;
      
      res.status(isHealthy ? 200 : 503).json({
        success: true,
        data: {
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          service: 'knowledge-base',
          version: '1.0.0',
          health,
        },
      });
      
    } catch (error) {
      logger.error('Ошибка health check:', error);
      res.status(503).json({
        success: false,
        error: 'Ошибка проверки состояния сервиса',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  private getProcessingStats(): ProcessingStats {
    const jobs = this.processingManager.getAllJobs();
    
    return {
      activeJobs: jobs.filter(job => job.status === 'processing').length,
      completedJobs: jobs.filter(job => job.status === 'completed').length,
      failedJobs: jobs.filter(job => job.status === 'failed').length,
      averageProcessingTime: 0, // TODO: рассчитать среднее время
      queueSize: jobs.filter(job => job.status === 'queued').length,
    };
  }

  private fixEncoding(text: string): string {
    if (!text || typeof text !== 'string') {
      return text;
    }
    
    try {
      // Проверяем, есть ли признаки неправильной кодировки
      const hasEncodingIssues = text.includes('Ð') || text.includes('Ñ') || 
                                text.includes('Đ') || text.includes('Ñ') ||
                                text.includes('Ð') || text.includes('Ñ');
      
      if (!hasEncodingIssues) {
        return text; // Кодировка уже правильная
      }
      
      // Ручная замена известных символов Windows-1251
      let fixed = text;
      
      // Заменяем символы Windows-1251 на UTF-8
      const charMap = [
        ['Ð', 'А'], ['Ñ', 'Б'], ['Ð', 'В'], ['Ñ', 'Г'], ['Ñ', 'Д'],
        ['Đ', 'Е'], ['Ñ', 'Ж'], ['Ñ', 'З'], ['Đ', 'И'], ['Ñ', 'Й'],
        ['Đ', 'К'], ['Ñ', 'Л'], ['Ñ', 'М'], ['Ñ', 'Н'], ['Đ', 'О'],
        ['Ñ', 'П'], ['Đ', 'Р'], ['Ñ', 'С'], ['Ñ', 'Т'], ['Đ', 'У'],
        ['Đ', 'Ф'], ['Ñ', 'Х'], ['Ñ', 'Ц'], ['Ñ', 'Ч'], ['Ñ', 'Ш'],
        ['Ñ', 'Щ'], ['Đ', 'Ъ'], ['Ñ', 'Ы'], ['Đ', 'Ь'], ['Đ', 'Э'],
        ['Đ', 'Ю'], ['Đ', 'Я'],
        ['Đ', 'а'], ['Ñ', 'б'], ['Ð', 'в'], ['Ñ', 'г'], ['Ñ', 'д'],
        ['Đ', 'е'], ['Ñ', 'ж'], ['Ñ', 'з'], ['Đ', 'и'], ['Ñ', 'й'],
        ['Đ', 'к'], ['Ñ', 'л'], ['Ñ', 'м'], ['Ñ', 'н'], ['Đ', 'о'],
        ['Ñ', 'п'], ['Đ', 'р'], ['Ñ', 'с'], ['Ñ', 'т'], ['Đ', 'у'],
        ['Đ', 'ф'], ['Ñ', 'х'], ['Ñ', 'ц'], ['Ñ', 'ч'], ['Ñ', 'ш'],
        ['Ñ', 'щ'], ['Đ', 'ъ'], ['Ñ', 'ы'], ['Đ', 'ь'], ['Đ', 'э'],
        ['Đ', 'ю'], ['Đ', 'я']
      ];
      
      for (const [win1251, utf8] of charMap) {
        fixed = fixed.replace(new RegExp(win1251, 'g'), utf8);
      }
      
      return fixed;
      
    } catch (error) {
      logger.warn('Ошибка исправления кодировки в контроллере:', error);
      return text; // Возвращаем исходный текст при ошибке
    }
  }
}
