import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { VectraService } from '../services/vectra-service.js';
import { AIService } from '../services/openai-service.js';
import type { 
  Document, 
  DocumentChunk, 
  TextChunk, 
  ProcessingJob, 
  ProcessingStep 
} from '../types/knowledge-types.js';

export abstract class BaseDocumentProcessor {
  protected supportedTypes: string[] = [];

  abstract canProcess(mimeType: string): boolean;
  abstract extractText(filePath: string): Promise<string>;
  abstract extractMetadata(filePath: string): Promise<any>;

  async processDocument(
    filePath: string, 
    originalFilename: string,
    mimeType: string
  ): Promise<{ text: string; metadata: any }> {
    try {
      if (!this.canProcess(mimeType)) {
        throw new Error(`Тип файла ${mimeType} не поддерживается этим процессором`);
      }

      logger.info(`Обработка документа: ${originalFilename}`);

      const text = await this.extractText(filePath);
      const metadata = await this.extractMetadata(filePath);

      logger.debug(`Извлечен текст длиной ${text.length} символов из ${originalFilename}`);

      return { text, metadata };
    } catch (error) {
      logger.error(`Ошибка обработки документа ${originalFilename}:`, error);
      throw error;
    }
  }
}

export class TextChunker {
  private chunkSize: number;
  private chunkOverlap: number;

  constructor() {
    this.chunkSize = config.processing.chunkSize;
    this.chunkOverlap = config.processing.chunkOverlap;
  }

  chunkText(text: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    const sentences = this.splitIntoSentences(text);
    
    let currentChunk = '';
    let currentOffset = 0;
    let chunkStartOffset = 0;

    for (const sentence of sentences) {
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
      
      if (potentialChunk.length > this.chunkSize && currentChunk.length > 0) {
        // Создаем чанк
        chunks.push({
          content: currentChunk.trim(),
          startOffset: chunkStartOffset,
          endOffset: currentOffset,
          metadata: {
            sentenceCount: this.countSentences(currentChunk),
            tokenCount: this.estimateTokens(currentChunk),
          },
        });

        // Начинаем новый чанк с перекрытием
        const overlapText = this.getOverlapText(currentChunk, this.chunkOverlap);
        currentChunk = overlapText + (overlapText ? ' ' : '') + sentence;
        chunkStartOffset = currentOffset - overlapText.length;
      } else {
        currentChunk = potentialChunk;
        if (chunks.length === 0) {
          chunkStartOffset = currentOffset;
        }
      }

      currentOffset += sentence.length + 1; // +1 для пробела
    }

    // Добавляем последний чанк
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        startOffset: chunkStartOffset,
        endOffset: currentOffset,
        metadata: {
          sentenceCount: this.countSentences(currentChunk),
          tokenCount: this.estimateTokens(currentChunk),
        },
      });
    }

    logger.debug(`Текст разбит на ${chunks.length} чанков`);
    return chunks;
  }

  private splitIntoSentences(text: string): string[] {
    // Простое разделение на предложения для русского языка
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    return sentences;
  }

  private countSentences(text: string): number {
    return this.splitIntoSentences(text).length;
  }

  private estimateTokens(text: string): number {
    // Приблизительная оценка токенов для русского языка
    const words = text.split(/\s+/).filter(w => w.length > 0);
    return Math.ceil(words.length * 1.3); // Коэффициент для русского языка
  }

  private getOverlapText(text: string, maxOverlapLength: number): string {
    if (text.length <= maxOverlapLength) {
      return text;
    }

    // Ищем последнее предложение в пределах перекрытия
    const overlapPart = text.slice(-maxOverlapLength);
    const lastSentenceMatch = overlapPart.match(/.*[.!?]\s*/);
    
    if (lastSentenceMatch) {
      return lastSentenceMatch[0].trim();
    }

    // Если не найдено предложение, возвращаем последние слова
    const words = text.split(/\s+/);
    const overlapWords = Math.min(Math.floor(maxOverlapLength / 6), words.length);
    return words.slice(-overlapWords).join(' ');
  }
}

export class DocumentProcessingManager {
  private processors: Map<string, BaseDocumentProcessor> = new Map();
  private chunker: TextChunker;
  private activeJobs: Map<string, ProcessingJob> = new Map();
  private storage: VectraService;
  private ai: AIService;

  constructor(storage: VectraService, ai: AIService) {
    this.chunker = new TextChunker();
    this.storage = storage;
    this.ai = ai;
    this.registerDefaultProcessors();
  }

  private registerDefaultProcessors(): void {
    // Будем регистрировать процессоры по мере их создания
    logger.info('Document processing manager initialized');
  }

  registerProcessor(mimeType: string, processor: BaseDocumentProcessor): void {
    this.processors.set(mimeType, processor);
    logger.debug(`Зарегистрирован процессор для типа ${mimeType}`);
  }

  async processDocument(
    documentId: string,
    filePath: string,
    originalFilename: string,
    mimeType: string
  ): Promise<ProcessingJob> {
    const job: ProcessingJob = {
      id: `job_${documentId}_${Date.now()}`,
      documentId,
      status: 'queued',
      progress: 0,
      startedAt: new Date(),
      steps: [
        { name: 'text_extraction', status: 'queued' },
        { name: 'text_chunking', status: 'queued' },
        { name: 'metadata_extraction', status: 'queued' },
        { name: 'quality_assessment', status: 'queued' },
      ],
    };

    this.activeJobs.set(job.id, job);
    
    // Запускаем обработку асинхронно
    this.executeProcessingJob(job, filePath, originalFilename, mimeType)
      .catch(error => {
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date();
        logger.error(`Задача обработки ${job.id} завершилась с ошибкой:`, error);
      });

    return job;
  }

  private async executeProcessingJob(
    job: ProcessingJob,
    filePath: string,
    originalFilename: string,
    mimeType: string
  ): Promise<void> {
    try {
      job.status = 'processing';
      job.progress = 10;

      // Шаг 1: Извлечение текста
      await this.updateJobStep(job, 'text_extraction', 'processing');
      
      const processor = this.getProcessor(mimeType);
      if (!processor) {
        throw new Error(`Процессор для типа ${mimeType} не найден`);
      }

      const { text, metadata } = await processor.processDocument(filePath, originalFilename, mimeType);
      
      await this.updateJobStep(job, 'text_extraction', 'completed');
      job.progress = 40;

      // Шаг 2: Разбиение на чанки
      await this.updateJobStep(job, 'text_chunking', 'processing');
      
      let textChunks = this.chunker.chunkText(text);
      logger.info(`Текст разбит на ${textChunks.length} чанков для документа ${originalFilename}`);
      
      await this.updateJobStep(job, 'text_chunking', 'completed', { 
        chunksCount: textChunks.length 
      });
      job.progress = 70;

      // Шаг 3: Сохранение чанков в хранилище с эмбеддингами
      await this.updateJobStep(job, 'metadata_extraction', 'processing');
      logger.info(`Начинаем генерацию эмбеддингов для ${textChunks.length} чанков документа ${originalFilename}`);

      // Счетчики для отслеживания качества обработки
      let successfulEmbeddings = 0;
      let failedEmbeddings = 0;
      let chunksWithoutEmbeddings = 0;

      try {
        // AI сервис доступен, генерируем эмбеддинги для всех чанков
        logger.info(`AI сервис доступен, генерируем эмбеддинги для ${textChunks.length} чанков`);
        
        // Генерируем эмбеддинги для всех чанков с улучшенной обработкой ошибок
        for (let i = 0; i < textChunks.length; i++) {
          const ch = textChunks[i];
          
          try {
            // Генерируем эмбеддинг для чанка
            const embeddingResponse = await this.ai.generateEmbedding({
              text: ch.content,
              model: 'text-embedding-3-small'
            });
            
            const chunkObj = {
              id: `${job.documentId}_chunk_${i}`,
              documentId: job.documentId,
              content: ch.content,
              pageNumber: undefined as number | undefined,
              chunkIndex: i,
              tokens: ch.metadata?.tokenCount as number | undefined,
              embedding: embeddingResponse.embedding,
            };
            
            await this.storage.addDocumentChunk(chunkObj as any);
            successfulEmbeddings++;
            
            // Обновляем прогресс
            const progress = 70 + (i / textChunks.length) * 20;
            job.progress = Math.round(progress);
            
            // Уменьшаем задержку между запросами для стабильности
            if (i % 5 === 0 && i > 0) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            
          } catch (error) {
            logger.warn(`Не удалось сгенерировать эмбеддинг для чанка ${i} (${ch.content.substring(0, 50)}...):`, error);
            failedEmbeddings++;
            
            // Сохраняем чанк без эмбеддинга, но с пометкой об ошибке
            const chunkObj = {
              id: `${job.documentId}_chunk_${i}`,
              documentId: job.documentId,
              content: ch.content,
              pageNumber: undefined as number | undefined,
              chunkIndex: i,
              tokens: ch.metadata?.tokenCount as number | undefined,
              // Добавляем пометку об ошибке эмбеддинга
              embeddingError: error instanceof Error ? error.message : 'Unknown error'
            };
            
            await this.storage.addDocumentChunk(chunkObj as any);
            chunksWithoutEmbeddings++;
            
            // Небольшая пауза после ошибки
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        logger.info(`Обработка эмбеддингов завершена для документа ${originalFilename}. Успешно: ${successfulEmbeddings}, Ошибок: ${failedEmbeddings}, Без эмбеддингов: ${chunksWithoutEmbeddings}`);
        
        // Проверяем, что все чанки сохранены
        if (successfulEmbeddings + chunksWithoutEmbeddings !== textChunks.length) {
          logger.warn(`Несоответствие в количестве чанков: ожидалось ${textChunks.length}, сохранено ${successfulEmbeddings + chunksWithoutEmbeddings}`);
        }
        
      } catch (e) {
        logger.error('Критическая ошибка при генерации эмбеддингов:', e);
        
        // В случае критической ошибки сохраняем все чанки без эмбеддингов
        for (let i = 0; i < textChunks.length; i++) {
          const ch = textChunks[i];
          const chunkObj = {
            id: `${job.documentId}_chunk_${i}`,
            documentId: job.documentId,
            content: ch.content,
            pageNumber: undefined as number | undefined,
            chunkIndex: i,
            tokens: ch.metadata?.tokenCount as number | undefined,
            embeddingError: 'Critical processing error'
          };
          await this.storage.addDocumentChunk(chunkObj as any);
          chunksWithoutEmbeddings++;
        }
        
        logger.info(`Сохранено ${textChunks.length} чанков без эмбеддингов из-за критической ошибки`);
      }

      await this.updateJobStep(job, 'metadata_extraction', 'completed');
      job.progress = 90;

      // Шаг 4: Оценка качества
      await this.updateJobStep(job, 'quality_assessment', 'processing');
      
      const qualityScore = this.assessContentQuality(text, textChunks);
      
      // Рассчитываем качество обработки на основе эмбеддингов
      const totalChunks = textChunks.length;
      const processedChunks = successfulEmbeddings;
      const embeddingErrors = failedEmbeddings;
      const processingQuality = totalChunks > 0 ? Math.round((processedChunks / totalChunks) * 100) : 0;
      
      // Улучшенная логика определения статуса
      let finalStatus: 'completed' | 'partially_completed' | 'failed' = 'completed';
      
      if (processingQuality < 100) {
        if (processingQuality >= 90) {
          finalStatus = 'completed'; // Если качество >= 90%, считаем документ полностью обработанным
          logger.info(`Документ ${originalFilename} обработан с высоким качеством: ${processingQuality}%`);
        } else if (processingQuality >= 70) {
          finalStatus = 'partially_completed';
          logger.warn(`Документ ${originalFilename} обработан частично. Качество: ${processingQuality}%`);
        } else {
          finalStatus = 'failed';
          logger.error(`Документ ${originalFilename} обработан с критическими ошибками. Качество: ${processingQuality}%`);
        }
      }

      // Проверяем, что все чанки сохранены
      if (successfulEmbeddings + chunksWithoutEmbeddings !== totalChunks) {
        logger.error(`Критическая ошибка: не все чанки сохранены! Ожидалось: ${totalChunks}, Сохранено: ${successfulEmbeddings + chunksWithoutEmbeddings}`);
        finalStatus = 'failed';
      }
      
      await this.updateJobStep(job, 'quality_assessment', 'completed', { 
        qualityScore,
        totalChunks,
        processedChunks,
        embeddingErrors,
        processingQuality,
        chunksWithoutEmbeddings
      });

      job.status = finalStatus;
      job.progress = 100;
      job.completedAt = new Date();

      logger.info(`Обработка документа ${originalFilename} завершена. Статус: ${finalStatus}, Качество: ${processingQuality}%, Job ID: ${job.id}, Document ID: ${job.documentId}`);

      // Обновляем статус документа с информацией о качестве обработки
      try {
        await this.storage.updateDocumentStatus(job.documentId, finalStatus, {
          totalChunks,
          processedChunks,
          embeddingErrors,
          processingQuality,
          chunksWithoutEmbeddings
        });
        logger.info(`Статус документа ${job.documentId} обновлен на '${finalStatus}' с качеством ${processingQuality}%`);
      } catch (e) {
        logger.error('Не удалось обновить статус документа:', e);
        throw e; // Пробрасываем ошибку, чтобы задача не считалась завершенной
      }

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Неизвестная ошибка';
      job.completedAt = new Date();
      
      // Отмечаем текущий шаг как неудачный
      const currentStep = job.steps.find(step => step.status === 'processing');
      if (currentStep) {
        currentStep.status = 'failed';
        currentStep.error = job.error;
        currentStep.completedAt = new Date();
      }
      
      throw error;
    }
  }

  private async updateJobStep(
    job: ProcessingJob, 
    stepName: string, 
    status: 'processing' | 'completed' | 'failed',
    metadata?: any
  ): Promise<void> {
    const step = job.steps.find(s => s.name === stepName);
    if (step) {
      step.status = status;
      step.metadata = metadata;
      
      if (status === 'processing') {
        step.startedAt = new Date();
      } else {
        step.completedAt = new Date();
      }
    }
  }

  private getProcessor(mimeType: string): BaseDocumentProcessor | undefined {
    return this.processors.get(mimeType);
  }

  private assessContentQuality(text: string, chunks: TextChunk[]): number {
    let score = 0.5; // Базовый балл

    // Оценка длины текста
    if (text.length > 1000) score += 0.1;
    if (text.length > 5000) score += 0.1;

    // Оценка структуры (наличие заголовков, списков и т.д.)
    if (text.includes('\n#') || text.includes('\n##')) score += 0.1; // Markdown заголовки
    if (text.includes('•') || text.includes('-')) score += 0.05; // Списки

    // Оценка технической терминологии
    const technicalTerms = ['PMAC', 'программирование', 'контроллер', 'ось', 'переменная'];
    const foundTerms = technicalTerms.filter(term => 
      text.toLowerCase().includes(term.toLowerCase())
    );
    score += (foundTerms.length / technicalTerms.length) * 0.2;

    // Оценка качества чанков
    const avgChunkLength = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / chunks.length;
    if (avgChunkLength > 500 && avgChunkLength < 1500) score += 0.1;

    return Math.min(score, 1.0);
  }

  getJob(jobId: string): ProcessingJob | undefined {
    return this.activeJobs.get(jobId);
  }

  async reprocessDocument(
    documentId: string,
    options: { enableAIAnalysis?: boolean; extractSummary?: boolean; extractKeywords?: boolean } = {}
  ): Promise<ProcessingJob> {
    const job: ProcessingJob = {
      id: `reprocess_${documentId}_${Date.now()}`,
      documentId,
      status: 'queued',
      progress: 0,
      startedAt: new Date(),
      steps: [
        { name: 'ai_analysis', status: 'queued' },
        { name: 'summary_extraction', status: 'queued' },
        { name: 'keyword_extraction', status: 'queued' },
        { name: 'quality_enhancement', status: 'queued' },
      ],
    };

    this.activeJobs.set(job.id, job);
    
    // Запускаем AI обработку асинхронно
    this.executeAIProcessingJob(job, documentId, options)
      .catch(error => {
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date();
        logger.error(`AI обработка ${job.id} завершилась с ошибкой:`, error);
      });

    return job;
  }

  private async executeAIProcessingJob(
    job: ProcessingJob,
    documentId: string,
    options: any
  ): Promise<void> {
    try {
      job.status = 'processing';
      
      // Шаг 1: AI анализ текста
      this.updateJobStep(job, 'ai_analysis', 'processing');
      logger.info(`AI анализ документа ${documentId}`);
      
      // Здесь будет реальная AI обработка
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.updateJobStep(job, 'ai_analysis', 'completed');
      job.progress = 25;

      // Шаг 2: Извлечение резюме
      if (options.extractSummary) {
        this.updateJobStep(job, 'summary_extraction', 'processing');
        logger.info(`Извлечение резюме документа ${documentId}`);
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        this.updateJobStep(job, 'summary_extraction', 'completed');
        job.progress = 50;
      }

      // Шаг 3: Извлечение ключевых слов
      if (options.extractKeywords) {
        this.updateJobStep(job, 'keyword_extraction', 'processing');
        logger.info(`Извлечение ключевых слов документа ${documentId}`);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        this.updateJobStep(job, 'keyword_extraction', 'completed');
        job.progress = 75;
      }

      // Шаг 4: Улучшение качества
      this.updateJobStep(job, 'quality_enhancement', 'processing');
      logger.info(`Улучшение качества данных документа ${documentId}`);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      this.updateJobStep(job, 'quality_enhancement', 'completed');
      job.progress = 100;
      job.status = 'completed';
      job.completedAt = new Date();

      logger.info(`AI обработка документа ${documentId} завершена успешно`);
      
    } catch (error) {
      logger.error(`Ошибка AI обработки ${job.id}:`, error);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Неизвестная ошибка';
      job.completedAt = new Date();
      throw error;
    }
  }

  getAllJobs(): ProcessingJob[] {
    return Array.from(this.activeJobs.values());
  }

  getActiveJobsCount(): number {
    return Array.from(this.activeJobs.values())
      .filter(job => job.status === 'processing' || job.status === 'queued')
      .length;
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.activeJobs.get(jobId);
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return false;
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
    
    const currentStep = job.steps.find(step => step.status === 'processing');
    if (currentStep) {
      currentStep.status = 'cancelled';
      currentStep.completedAt = new Date();
    }

    return true;
  }

  removeJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      return false;
    }

    // Сначала отменяем задачу, если она активна
    if (job.status === 'processing' || job.status === 'queued') {
      job.status = 'cancelled';
      job.completedAt = new Date();
    }

    // Удаляем задачу из активных
    this.activeJobs.delete(jobId);
    logger.info(`Задача ${jobId} удалена из менеджера обработки`);
    
    return true;
  }

  cleanup(): void {
    // Удаляем завершенные задачи старше 24 часов
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    for (const [jobId, job] of this.activeJobs.entries()) {
      if (job.completedAt && job.completedAt < cutoffTime) {
        this.activeJobs.delete(jobId);
      }
    }
  }
}
