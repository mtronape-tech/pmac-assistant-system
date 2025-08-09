import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { WeaviateService } from '../services/weaviate-service.js';
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
  SystemHealth
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
  private weaviateService: WeaviateService;
  private aiService: AIService;
  private processingManager: DocumentProcessingManager;

  constructor(
    weaviateService: WeaviateService,
    aiService: AIService
  ) {
    this.weaviateService = weaviateService;
    this.aiService = aiService;
    this.processingManager = new DocumentProcessingManager();
    
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
      
      // Выполняем поиск в Weaviate
      const searchResults = await this.weaviateService.searchSimilar(
        embeddingResponse.embedding,
        searchData as SearchQuery
      );
      
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
      
      const searchResults = await this.weaviateService.searchSimilar(
        embeddingResponse.embedding,
        {
          query: queryData.query,
          limit: queryData.maxSources,
          threshold: 0.6,
        }
      );
      
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
        filename: file.originalname,
        fileSize: file.size,
        processingJobId: processingJob.id,
        status: 'processing',
        message: 'Документ загружен и поставлен в очередь на обработку',
      };
      
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

  // Удаление документа
  deleteDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { documentId } = req.params;
      
      logger.info(`Удаление документа: ${documentId}`);
      
      await this.weaviateService.deleteDocument(documentId);
      
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
      const weaviateStats = await this.weaviateService.getStats();
      const processingStats = this.getProcessingStats();
      
      const stats: DocumentStats = {
        totalDocuments: weaviateStats.totalObjects || 0,
        totalChunks: 0, // TODO: подсчитать чанки
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
        }, // TODO: подсчитать по типам
        documentsByCategory: {
          pmac_manual: 0,
          programming_guide: 0,
          hardware_spec: 0,
          troubleshooting: 0,
          best_practices: 0,
          case_studies: 0,
          api_documentation: 0,
          configuration_guide: 0,
          safety_manual: 0,
          maintenance_guide: 0,
        }, // TODO: подсчитать по категориям
        averageChunksPerDocument: 0,
        totalStorageSize: 0,
        lastUpdated: new Date(),
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
      const weaviateHealthy = await this.weaviateService.healthCheck();
      const aiHealthy = await this.aiService.healthCheck();
      
      const health: SystemHealth = {
        weaviateConnected: weaviateHealthy,
        openaiConnected: aiHealthy,
        diskSpace: {
          available: 0, // TODO: получить реальные данные
          used: 0,
          total: 0,
        },
        memoryUsage: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
        },
        uptime: process.uptime(),
      };
      
      const isHealthy = weaviateHealthy && aiHealthy;
      
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
}
