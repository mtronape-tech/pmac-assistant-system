import { LocalIndex } from 'vectra';
import path from 'path';
import { promises as fs } from 'fs';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { AIService } from './openai-service.js';
import type { 
  SearchQuery, 
  SearchResult 
} from '../types/knowledge-types.js';

export class VectraService {
  public index: LocalIndex;
  public isAvailable = false;
  public inMemoryDocuments = new Map<string, any>();
  public inMemoryChunks = new Map<string, any>();
  private documentsFilePath: string;
  private chunksFilePath: string;
  private openaiService?: AIService;

  constructor(openaiService?: AIService) {
    const indexPath = path.join(process.cwd(), 'data', 'vectra-index');
    this.index = new LocalIndex(indexPath);
    this.openaiService = openaiService;
    
    // Пути для файлового хранилища (fallback)
    this.documentsFilePath = path.join(process.cwd(), 'data', 'documents.json');
    this.chunksFilePath = path.join(process.cwd(), 'data', 'chunks.json');
  }

  async initialize(): Promise<void> {
    try {
      // Создаем индекс если он не существует
      if (!(await this.index.isIndexCreated())) {
        await this.index.createIndex();
        logger.info('Vectra index created');
      }

      logger.info('Vectra service initialized successfully');
      this.isAvailable = true;
    } catch (error) {
      logger.warn('Vectra unavailable, switching to in-memory mode:', error);
      this.isAvailable = false;
    }
    
    // Загружаем данные из файлов в любом случае
    await this.loadFromFiles();
  }

  private async ensureDataDirectory(): Promise<void> {
    const dataDir = path.dirname(this.documentsFilePath);
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
      logger.debug('Директория data уже существует или не может быть создана:', error);
    }
  }

  private async loadFromFiles(): Promise<void> {
    try {
      await this.ensureDataDirectory();
      
      // Загружаем документы
      try {
        const documentsData = await fs.readFile(this.documentsFilePath, 'utf-8');
        const documents = JSON.parse(documentsData);
        this.inMemoryDocuments = new Map(Object.entries(documents));
        logger.info(`Loaded ${this.inMemoryDocuments.size} documents from file`);
      } catch (error) {
        logger.debug('Файл документов не найден или пуст, начинаем с пустого хранилища');
      }

      // Загружаем чанки
      try {
        const chunksData = await fs.readFile(this.chunksFilePath, 'utf-8');
        const chunks = JSON.parse(chunksData);
        this.inMemoryChunks = new Map(Object.entries(chunks));
        logger.info(`Loaded ${this.inMemoryChunks.size} chunks from file`);
      } catch (error) {
        logger.debug('Файл чанков не найден или пуст, начинаем с пустого хранилища');
      }
    } catch (error) {
      logger.error('Ошибка загрузки данных из файлов:', error);
    }
  }

  private async saveToFiles(): Promise<void> {
    try {
      await this.ensureDataDirectory();
      
      // Сохраняем документы
      const documentsObj = Object.fromEntries(this.inMemoryDocuments);
      await fs.writeFile(this.documentsFilePath, JSON.stringify(documentsObj, null, 2));
      
      // Сохраняем чанки
      const chunksObj = Object.fromEntries(this.inMemoryChunks);
      await fs.writeFile(this.chunksFilePath, JSON.stringify(chunksObj, null, 2));
      
      logger.debug('Данные сохранены в файлы');
    } catch (error) {
      logger.error('Ошибка сохранения данных в файлы:', error);
    }
  }

  async addDocument(document: any): Promise<void> {
    if (this.isAvailable) {
      try {
        // Сохраняем документ в Vectra
        await this.index.insertItem({
          vector: new Array(1536).fill(0), // Пустой вектор для документа
          metadata: {
            type: 'document',
            documentId: document.id,
            title: document.title,
            filename: document.filename, // Сохраняем оригинальное имя файла
            fileSize: document.fileSize,
            uploadDate: document.uploadDate,
            author: document.author,
            category: document.category,
            tags: document.tags,
            status: document.status,
            description: document.description,
            // Добавляем информацию о качестве обработки
            totalChunks: document.totalChunks,
            processedChunks: document.processedChunks,
            embeddingErrors: document.embeddingErrors,
            processingQuality: document.processingQuality,
            chunksWithoutEmbeddings: document.chunksWithoutEmbeddings,
          }
        });
        logger.info(`Документ ${document.id} добавлен в Vectra`);
        // Зеркалим в in-memory и сохраняем на диск
        this.inMemoryDocuments.set(document.id, document);
        await this.saveToFiles();
      } catch (error) {
        logger.error('Ошибка добавления документа в Vectra:', error);
        // Fallback к in-memory
        this.inMemoryDocuments.set(document.id, document);
        await this.saveToFiles();
      }
    } else {
      // In-memory режим
      this.inMemoryDocuments.set(document.id, document);
      await this.saveToFiles();
    }
  }

  async addDocumentChunk(chunk: any): Promise<void> {
    if (this.isAvailable) {
      try {
        // Сохраняем чанк в Vectra
        await this.index.insertItem({
          vector: Array.isArray(chunk.embedding) && chunk.embedding.length > 0 ? chunk.embedding : new Array(1536).fill(0),
          metadata: {
            type: 'chunk',
            chunkId: chunk.id,
            documentId: chunk.documentId,
            content: chunk.content,
            pageNumber: chunk.pageNumber,
            chunkIndex: chunk.chunkIndex,
            tokens: chunk.tokens,
            embeddingError: chunk.embeddingError // Добавляем информацию об ошибке эмбеддинга
          }
        });
        logger.debug(`Чанк ${chunk.id} добавлен в Vectra${chunk.embeddingError ? ` (с ошибкой эмбеддинга: ${chunk.embeddingError})` : ''}`);
        // Зеркалим в in-memory и сохраняем на диск
        this.inMemoryChunks.set(chunk.id, chunk);
        await this.saveToFiles();
      } catch (error) {
        logger.error('Ошибка добавления чанка в Vectra:', error);
        // Fallback к in-memory
        this.inMemoryChunks.set(chunk.id, chunk);
        await this.saveToFiles();
      }
    } else {
      // In-memory режим
      this.inMemoryChunks.set(chunk.id, chunk);
      await this.saveToFiles();
    }
  }

  async updateDocumentStatus(documentId: string, status: string, qualityInfo?: {
    totalChunks?: number;
    processedChunks?: number;
    embeddingErrors?: number;
    processingQuality?: number;
    chunksWithoutEmbeddings?: number;
  }): Promise<void> {
    logger.info(`Обновление статуса документа ${documentId} на '${status}'${qualityInfo ? ` с качеством ${qualityInfo.processingQuality}%` : ''}`);
    
    if (this.isAvailable) {
      try {
        // Удаляем старую запись документа и вставляем новую с обновленным статусом
        const results = await this.index.queryItems(new Array(1536).fill(0), '', 1000);
        const itemsToDelete = results.filter(r => r.item.metadata.type === 'document' && r.item.metadata.documentId === documentId);
        logger.info(`Найдено ${itemsToDelete.length} записей для удаления для документа ${documentId}`);
        
        for (const item of itemsToDelete) {
          await this.index.deleteItem(item.item.id);
        }
        
        // Источник правды — in-memory, если пусто, берем из удаленной записи
        let existing: any = this.inMemoryDocuments.get(documentId);
        if (!existing && itemsToDelete.length > 0) {
          const m = itemsToDelete[0].item.metadata as any;
          existing = {
            id: String(m.documentId),
            title: String(m.title || ''),
            filename: m.filename ? String(m.filename) : undefined, // Добавляем filename
            fileSize: Number(m.fileSize || 0),
            uploadDate: String(m.uploadDate || new Date().toISOString()),
            author: m.author ? String(m.author) : undefined,
            category: m.category ? String(m.category) : undefined,
            tags: Array.isArray(m.tags) ? m.tags as string[] : [],
            status: String(m.status || 'completed'),
            type: 'document',
            description: String(m.description || ''),
          };
        }
        
        if (existing) {
          existing.status = status;
          
          // Добавляем информацию о качестве обработки
          if (qualityInfo) {
            existing.totalChunks = qualityInfo.totalChunks;
            existing.processedChunks = qualityInfo.processedChunks;
            existing.embeddingErrors = qualityInfo.embeddingErrors;
            existing.processingQuality = qualityInfo.processingQuality;
            // Добавляем информацию о чанках без эмбеддингов
            if (qualityInfo.chunksWithoutEmbeddings !== undefined) {
              existing.chunksWithoutEmbeddings = qualityInfo.chunksWithoutEmbeddings;
            }
          }
          
          logger.info(`Обновляем документ ${documentId} в Vectra с новым статусом: ${status}${qualityInfo ? `, качество: ${qualityInfo.processingQuality}%` : ''}`);
          
          await this.index.insertItem({
            vector: new Array(1536).fill(0),
            metadata: {
              type: 'document',
              documentId: existing.id,
              title: existing.title,
              fileSize: existing.fileSize,
              uploadDate: existing.uploadDate,
              author: existing.author,
              category: existing.category,
              tags: existing.tags,
              status: existing.status,
              description: existing.description,
                          // Добавляем информацию о качестве обработки
            totalChunks: existing.totalChunks,
            processedChunks: existing.processedChunks,
            embeddingErrors: existing.embeddingErrors,
            processingQuality: existing.processingQuality,
            chunksWithoutEmbeddings: existing.chunksWithoutEmbeddings,
            }
          });
          
          this.inMemoryDocuments.set(documentId, existing);
          await this.saveToFiles();
          logger.info(`Статус документа ${documentId} успешно обновлен на '${status}' в Vectra`);
        } else {
          logger.warn(`Документ ${documentId} не найден для обновления статуса`);
        }
      } catch (error) {
        logger.error('Ошибка обновления статуса документа в Vectra:', error);
        throw error;
      }
    } else {
      const doc = this.inMemoryDocuments.get(documentId);
      if (doc) {
        doc.status = status;
        
        // Добавляем информацию о качестве обработки
        if (qualityInfo) {
          doc.totalChunks = qualityInfo.totalChunks;
          doc.processedChunks = qualityInfo.processedChunks;
          doc.embeddingErrors = qualityInfo.embeddingErrors;
          doc.processingQuality = qualityInfo.processingQuality;
          // Добавляем информацию о чанках без эмбеддингов
          if (qualityInfo.chunksWithoutEmbeddings !== undefined) {
            doc.chunksWithoutEmbeddings = qualityInfo.chunksWithoutEmbeddings;
          }
        }
        
        this.inMemoryDocuments.set(documentId, doc);
        await this.saveToFiles();
        logger.info(`Статус документа ${documentId} обновлен на '${status}' в in-memory хранилище${qualityInfo ? ` с качеством ${qualityInfo.processingQuality}%` : ''}`);
      } else {
        logger.warn(`Документ ${documentId} не найден в in-memory хранилище для обновления статуса`);
      }
    }
  }

  async updateDocument(documentId: string, updatedDoc: any): Promise<void> {
    if (this.isAvailable) {
      try {
        // Удаляем старую запись документа
        const results = await this.index.queryItems(new Array(1536).fill(0), '', 1000);
        const itemsToDelete = results.filter(r => r.item.metadata.type === 'document' && r.item.metadata.documentId === documentId);
        for (const item of itemsToDelete) {
          await this.index.deleteItem(item.item.id);
        }
        
        // Вставляем обновленную запись
        await this.index.insertItem({
          vector: new Array(1536).fill(0),
          metadata: {
            type: 'document',
            documentId: updatedDoc.id,
            title: updatedDoc.title,
            filename: updatedDoc.filename,
            fileSize: updatedDoc.fileSize,
            uploadDate: updatedDoc.uploadDate,
            author: updatedDoc.author,
            category: updatedDoc.category,
            tags: updatedDoc.tags,
            status: updatedDoc.status,
            description: updatedDoc.description,
            // Добавляем информацию о качестве обработки
            totalChunks: updatedDoc.totalChunks,
            processedChunks: updatedDoc.processedChunks,
            embeddingErrors: updatedDoc.embeddingErrors,
            processingQuality: updatedDoc.processingQuality,
            chunksWithoutEmbeddings: updatedDoc.chunksWithoutEmbeddings,
          }
        });
        
        // Обновляем in-memory
        this.inMemoryDocuments.set(documentId, updatedDoc);
        await this.saveToFiles();
      } catch (error) {
        logger.error('Ошибка обновления документа в Vectra:', error);
      }
    } else {
      // Обновляем только in-memory
      this.inMemoryDocuments.set(documentId, updatedDoc);
      await this.saveToFiles();
    }
  }

  async searchDocuments(query: string, options: { limit?: number; threshold?: number } = {}): Promise<SearchResult[]> {
    try {
      logger.info(`🔍 Поиск документов: "${query}" с опциями:`, options);
      logger.info(`Порог поиска: ${options.threshold}, Лимит: ${options.limit}`);
      
      // Проверяем доступность сервисов
      logger.info(`Vectra доступен: ${this.isAvailable}, AI сервис доступен: ${!!this.openaiService}`);
      
      // Логируем количество доступных документов и чанков
      if (this.isAvailable && this.index) {
        logger.info(`Vectra индекс доступен`);
      }
      
      logger.info(`In-memory документов: ${this.inMemoryDocuments.size}, чанков: ${this.inMemoryChunks.size}`);
      
      const results: SearchResult[] = [];
      
      // Сначала пробуем поиск по эмбеддингам через Vectra
      try {
        if (this.openaiService && this.index) {
          // Генерируем эмбеддинг для запроса
          const queryEmbedding = await this.openaiService.generateEmbedding({ text: query });
          
          if (queryEmbedding && queryEmbedding.embedding && queryEmbedding.embedding.length > 0) {
            logger.info(`Выполняем семантический поиск через Vectra для "${query}"`);
            
            // Правильный вызов queryItems согласно документации Vectra
            // queryItems(vector, query, limit) - первый параметр это вектор, второй - запрос, третий - лимит
            const searchResults = await this.index.queryItems(
              queryEmbedding.embedding,
              query,
              options.limit || 50
            );
            
            logger.info(`Vectra вернул ${searchResults.length} результатов семантического поиска`);
            
            // Обрабатываем результаты поиска Vectra
            for (const result of searchResults) {
              try {
                // Проверяем score - если он ниже threshold, пропускаем
                if (options.threshold && result.score < options.threshold) {
                  logger.debug(`Результат с score ${result.score} ниже threshold ${options.threshold}, пропускаем`);
                  continue;
                }
                
                // Получаем documentId из метаданных
                const documentId = result.item.metadata.documentId as string;
                if (!documentId) {
                  logger.warn('Результат поиска не содержит documentId, пропускаем');
                  continue;
                }
                
                // Получаем документ
                const document = await this.getDocument(documentId);
                if (!document) {
                  logger.warn(`Документ ${documentId} не найден, пропускаем результат`);
                  continue;
                }

                // Создаем результат поиска
                const searchResult: SearchResult = {
                  document: {
                    id: document.id,
                    title: document.title,
                    fileSize: document.fileSize,
                    uploadDate: document.uploadDate,
                    tags: document.tags,
                    status: document.status,
                    type: document.type,
                    description: document.description,
                  },
                  chunk: {
                    id: result.item.metadata.chunkId as string,
                    documentId: documentId,
                    content: result.item.metadata.content as string,
                    pageNumber: result.item.metadata.pageNumber as number | undefined,
                    chunkIndex: result.item.metadata.chunkIndex as number | undefined,
                    tokens: result.item.metadata.tokens as number | undefined,
                    // Добавляем информацию о качестве обработки
                    totalChunks: result.item.metadata.totalChunks ? Number(result.item.metadata.totalChunks) : undefined,
                    processedChunks: result.item.metadata.processedChunks ? Number(result.item.metadata.processedChunks) : undefined,
                    embeddingErrors: result.item.metadata.embeddingErrors ? Number(result.item.metadata.embeddingErrors) : undefined,
                    processingQuality: result.item.metadata.processingQuality ? Number(result.item.metadata.processingQuality) : undefined,
                    chunksWithoutEmbeddings: result.item.metadata.chunksWithoutEmbeddings ? Number(result.item.metadata.chunksWithoutEmbeddings) : undefined,
                  },
                  score: result.score,
                  highlights: [],
                  context: '',
                };
                
                results.push(searchResult);
                logger.debug(`Добавлен результат: chunkIndex ${searchResult.chunk?.chunkIndex}, score ${result.score}`);
              } catch (error) {
                logger.warn(`Ошибка при обработке результата поиска: ${error}`);
                continue;
              }
            }
          } else {
            logger.warn('Не удалось сгенерировать эмбеддинг для запроса, пропускаем семантический поиск');
          }
        } else {
          logger.warn('AI сервис или Vectra индекс недоступен, пропускаем семантический поиск');
        }
      } catch (error) {
        logger.warn(`Ошибка при семантическом поиске через Vectra: ${error}`);
      }

      // Если семантический поиск дал достаточно результатов, возвращаем их
      if (results.length >= (options.limit || 50)) {
        logger.info(`Семантический поиск дал достаточно результатов (${results.length}), возвращаем их`);
        return results.slice(0, options.limit || 50);
      }

      // Если семантический поиск дал мало результатов, добавляем текстовый поиск
      logger.info(`Семантический поиск дал ${results.length} результатов, добавляем текстовый поиск для полноты`);
      
      // Выполняем текстовый поиск по всем чанкам
      logger.info(`Запускаем текстовый поиск по всем чанкам для запроса: "${query}"`);
      const textSearchResults = await this.searchInAllChunks(
        query, 
        undefined, // undefined означает поиск по всем документам
        Math.max(20, (options.limit || 50) - results.length), // Минимум 20 результатов для лучшего покрытия
        {
          reverseOrder: false, // Сначала ищем в начале документа
          prioritizeEnd: false,
          useChunkIndex: true
        }
      );
      
      logger.info(`Текстовый поиск вернул ${textSearchResults.length} результатов`);
      
      // Добавляем уникальные результаты текстового поиска
      for (const textResult of textSearchResults) {
        const isDuplicate = results.some(r => 
          r.document.id === textResult.document.id && 
          r.chunk?.id === textResult.chunk?.id
        );
        
        if (!isDuplicate) {
          results.push(textResult);
        }
      }

      // Сортируем результаты по score (если есть) и chunkIndex
      results.sort((a, b) => {
        // Если у обоих есть score, сортируем по score
        if (a.score !== undefined && b.score !== undefined) {
          if (Math.abs(a.score - b.score) < 0.1) {
            // При близких score сортируем по chunkIndex
            return (a.chunk?.chunkIndex || 0) - (b.chunk?.chunkIndex || 0);
          }
          return b.score - a.score;
        }
        // Если score нет, сортируем по chunkIndex
        return (a.chunk?.chunkIndex || 0) - (b.chunk?.chunkIndex || 0);
      });

      logger.info(`Итоговый результат поиска: ${results.length} результатов`);
      return results.slice(0, options.limit || 50);
    } catch (error) {
      logger.error(`Ошибка при поиске документов: ${error}`);
      // Fallback к in-memory поиску
      return this.searchInMemory({ query: query, limit: options.limit });
    }
  }

  private searchInMemory(query: SearchQuery): SearchResult[] {
    const results: SearchResult[] = [];
    const searchTerm = query.text?.toLowerCase() || '';
    
    // Простой текстовый поиск в in-memory данных
    for (const [chunkId, chunk] of this.inMemoryChunks) {
      if (chunk.content.toLowerCase().includes(searchTerm)) {
        const document = this.inMemoryDocuments.get(chunk.documentId);
                 results.push({
           document: document || {
             id: chunk.documentId,
             title: '',
             fileSize: 0,
             uploadDate: new Date().toISOString(),
             tags: [],
             status: 'completed',
             type: 'document',
             // Добавляем информацию о качестве обработки (если есть)
             totalChunks: document?.totalChunks,
             processedChunks: document?.processedChunks,
             embeddingErrors: document?.embeddingErrors,
             processingQuality: document?.processingQuality,
             chunksWithoutEmbeddings: document?.chunksWithoutEmbeddings,
           },
          chunk: {
            id: chunkId,
            documentId: chunk.documentId,
            content: chunk.content,
            pageNumber: chunk.pageNumber,
            chunkIndex: chunk.chunkIndex,
          },
          score: 0.8,
          highlights: [],
          context: '',
        });
      }
    }
    
    // Сортируем по score и ограничиваем количество
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, query.limit || 10);
  }

  private async searchInAllChunks(query: string, documentId: string | undefined, limit: number = 10, searchOptions: {
    reverseOrder?: boolean;
    prioritizeEnd?: boolean;
    useChunkIndex?: boolean;
  } = {}): Promise<SearchResult[]> {
    try {
      logger.info(`🔍 Текстовый поиск в чанках: "${query}", documentId: ${documentId || 'undefined'}, limit: ${limit}`);
      
      const results: SearchResult[] = [];
      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
      
      // Если documentId не передан, ищем по всем документам
      if (!documentId) {
        const allDocuments = await this.getAllDocuments();
        logger.info(`Найдено ${allDocuments.length} документов для поиска`);
        if (allDocuments.length === 0) {
          logger.warn('Нет документов для поиска');
          return [];
        }
        
        // Ищем по всем документам
        for (const document of allDocuments) {
          logger.info(`Ищем в документе: ${document.id} (${document.title})`);
          
          const documentResults = await this.searchInDocumentChunks(
            query,
            document,
            Math.ceil(limit / allDocuments.length),
            queryLower,
            queryWords,
            searchOptions
          );
          
          results.push(...documentResults);
          
          if (results.length >= limit) break;
        }
        
        logger.info(`Поиск по всем документам дал ${results.length} результатов`);
        return results.slice(0, limit);
      }

      // Если указан конкретный документ, ищем только в нем
      const document = await this.getDocument(documentId as string);
      if (!document) return [];

      const documentResults = await this.searchInDocumentChunks(
        query,
        document,
        limit,
        queryLower,
        queryWords,
        searchOptions
      );
      
      return documentResults;
    } catch (error) {
      logger.error(`Ошибка при поиске по всем чанкам: ${error}`);
      return [];
    }
  }

  private async searchInDocumentChunks(
    query: string,
    document: any,
    limit: number,
    queryLower: string,
    queryWords: string[],
    searchOptions: any
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    // Получаем все чанки документа
    const allChunks = await this.getAllDocumentChunks(document.id);
    logger.info(`Найдено ${allChunks.length} чанков в документе ${document.id}`);
    
    // Определяем порядок сортировки
    if (searchOptions.reverseOrder || searchOptions.prioritizeEnd) {
      // Сортируем чанки по chunkIndex в обратном порядке (начинаем с конца)
      allChunks.sort((a, b) => (b.chunkIndex || 0) - (a.chunkIndex || 0));
    } else {
      // Сортируем чанки по chunkIndex в обычном порядке
      allChunks.sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0));
    }
    
    // Ищем по тексту во всех чанках
    for (const chunk of allChunks) {
      const contentLower = chunk.content.toLowerCase();
      let score = 0;
      let matchType = 'none';
      
      // Проверяем точное совпадение фразы
      if (contentLower.includes(queryLower)) {
        score = 1.0;
        matchType = 'exact_phrase';
      }
      // Проверяем совпадение всех слов запроса
      else if (queryWords.length > 1 && queryWords.every(word => contentLower.includes(word))) {
        score = 0.8;
        matchType = 'all_words';
      }
      // Проверяем совпадение большинства слов
      else {
        const matchingWords = queryWords.filter(word => contentLower.includes(word));
        if (matchingWords.length > 0) {
          score = 0.6 * (matchingWords.length / queryWords.length);
          matchType = 'partial_words';
        }
      }
      
      // Дополнительные бонусы для релевантности
      if (score > 0) {
        // Бонус за близость к концу документа (если prioritizeEnd включен)
        if (searchOptions.prioritizeEnd && document.totalChunks) {
          const chunkPosition = (chunk.chunkIndex || 0) / (document.totalChunks || 1);
          const endBonus = chunkPosition * 0.3; // Увеличиваем бонус до 30%
          score += endBonus;
        }
        
        // Бонус за точное совпадение в начале чанка
        const matchPosition = contentLower.indexOf(queryLower);
        if (matchPosition >= 0 && matchPosition < 100) {
          score += 0.15; // Увеличиваем бонус
        }
        
        // Бонус за длину совпадения
        if (matchType === 'exact_phrase') {
          score += Math.min(queryLower.length / 100, 0.15); // Увеличиваем бонус
        }
        
        // Бонус за релевантность контекста (если чанк содержит технические термины)
        const technicalTerms = ['const', 'constexpr', 'enum', 'class', 'struct', 'template', 'function', 'variable', 'type'];
        const hasTechnicalTerms = technicalTerms.some(term => contentLower.includes(term));
        if (hasTechnicalTerms) {
          score += 0.1;
        }
      }
      
      if (score > 0) {
        results.push({
          document: {
            id: document.id,
            title: document.title,
            fileSize: document.fileSize,
            uploadDate: document.uploadDate,
            tags: document.tags,
            status: document.status,
            type: document.type,
            description: document.description,
            totalChunks: document.totalChunks,
            processedChunks: document.processedChunks,
            embeddingErrors: document.embeddingErrors,
            processingQuality: document.processingQuality,
            chunksWithoutEmbeddings: document.chunksWithoutEmbeddings,
          },
          chunk: {
            id: chunk.id,
            documentId: chunk.documentId,
            content: chunk.content,
            pageNumber: chunk.pageNumber,
            chunkIndex: chunk.chunkIndex,
            tokens: chunk.tokens,
            embeddingError: chunk.embeddingError,
            totalChunks: document.totalChunks,
            processedChunks: document.processedChunks,
            embeddingErrors: document.embeddingErrors,
            processingQuality: document.processingQuality,
            chunksWithoutEmbeddings: document.chunksWithoutEmbeddings,
          },
          score: Math.min(score, 1.0),
          highlights: [],
          context: '',
        });
        
        if (results.length >= limit * 2) break; // Собираем больше результатов для лучшей сортировки
      }
    }
    
    // Сортируем результаты по score и chunkIndex
    results.sort((a, b) => {
      if (Math.abs(a.score - b.score) < 0.1) {
        // Если scores близки, приоритизируем по chunkIndex
        if (searchOptions.prioritizeEnd) {
          return (b.chunk?.chunkIndex || 0) - (a.chunk?.chunkIndex || 0);
        } else {
          return (a.chunk?.chunkIndex || 0) - (b.chunk?.chunkIndex || 0);
        }
      }
      return b.score - a.score;
    });
    
    // Возвращаем только нужное количество результатов
    return results.slice(0, limit);
  }


  async searchWithOptions(query: string, options: {
    limit?: number;
    threshold?: number;
    filters?: any;
    searchOptions?: {
      reverseOrder?: boolean;
      prioritizeEnd?: boolean;
      useChunkIndex?: boolean;
      searchInSpecificDocument?: string;
    };
  } = {}): Promise<SearchResult[]> {
    try {
      logger.info(`�� Расширенный поиск: "${query}" с опциями:`, options.searchOptions);
      
      // Если указан конкретный документ, ищем только в нем
      if (options.searchOptions?.searchInSpecificDocument) {
        logger.info(`Ищем в конкретном документе: ${options.searchOptions.searchInSpecificDocument}`);
        return await this.searchInAllChunks(
          query,
          options.searchOptions.searchInSpecificDocument,
          options.limit || 10,
          options.searchOptions
        );
      }
      
      // Сначала пробуем обычный поиск
      const standardResults = await this.searchDocuments(query, {
        limit: options.limit,
        threshold: options.threshold
      });
      
      // Если нужно приоритизировать конец документа, добавляем поиск по всем чанкам
      if (options.searchOptions?.prioritizeEnd && standardResults.length > 0) {
        logger.info(`Приоритизируем конец документа, ищем дополнительные результаты`);
        
        const mainDocumentId = standardResults[0].document.id;
        const additionalResults = await this.searchInAllChunks(
          query,
          mainDocumentId,
          Math.floor((options.limit || 10) / 2),
          options.searchOptions
        );
        
        // Объединяем результаты, избегая дубликатов
        const allResults = [...standardResults];
        for (const additionalResult of additionalResults) {
          const isDuplicate = allResults.some(r => 
            r.document.id === additionalResult.document.id && 
            r.chunk?.id === additionalResult.chunk?.id
          );
          
          if (!isDuplicate) {
            allResults.push(additionalResult);
          }
        }
        
        // Сортируем по score и chunkIndex
        allResults.sort((a, b) => {
          if (Math.abs(a.score - b.score) < 0.1) {
            if (options.searchOptions?.prioritizeEnd) {
              return (b.chunk?.chunkIndex || 0) - (a.chunk?.chunkIndex || 0);
            } else {
              return (a.chunk?.chunkIndex || 0) - (b.chunk?.chunkIndex || 0);
            }
          }
          return b.score - a.score;
        });
        
        return allResults.slice(0, options.limit || 10);
      }
      
      return standardResults;
    } catch (error) {
      logger.error(`Ошибка при расширенном поиске: ${error}`);
      // Fallback к обычному поиску
      return this.searchDocuments(query, options);
    }
  }

  // Специальный метод для детального поиска по всем чанкам документа
  async searchInAllChunksDetailed(query: string, documentId: string): Promise<{
    found: boolean;
    chunks: any[];
    totalChunks: number;
    searchResults: any[];
    debugInfo: any;
  }> {
    try {
      logger.info(`🔍 Детальный поиск фразы "${query}" в документе ${documentId}`);
      
      const document = await this.getDocument(documentId);
      if (!document) {
        logger.warn(`Документ ${documentId} не найден`);
        return { found: false, chunks: [], totalChunks: 0, searchResults: [], debugInfo: {} };
      }

      // Получаем все чанки документа
      const allChunks = await this.getAllDocumentChunks(documentId);
      logger.info(`📊 Найдено ${allChunks.length} чанков в документе ${documentId}`);
      
      // Сортируем чанки по chunkIndex
      allChunks.sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0));
      
      // Ищем по тексту во всех чанках
      const queryLower = query.toLowerCase();
      const searchResults: any[] = [];
      
      logger.info(`🔎 Ищем фразу "${query}" (в нижнем регистре: "${queryLower}")`);
      
      for (let i = 0; i < allChunks.length; i++) {
        const chunk = allChunks[i];
        const contentLower = chunk.content.toLowerCase();
        
        if (contentLower.includes(queryLower)) {
          logger.info(`✅ НАЙДЕНО в чанке ${i} (chunkIndex: ${chunk.chunkIndex})`);
          logger.info(`📝 Содержимое чанка: ${chunk.content.substring(0, 200)}...`);
          
          searchResults.push({
            chunkIndex: chunk.chunkIndex,
            chunkId: chunk.id,
            content: chunk.content,
            matchPosition: contentLower.indexOf(queryLower),
            fullMatch: chunk.content.includes(query)
          });
        }
        
        // Логируем каждый 50-й чанк для отслеживания прогресса
        if (i % 50 === 0) {
          logger.info(`📖 Обработан чанк ${i}/${allChunks.length} (chunkIndex: ${chunk.chunkIndex})`);
        }
      }
      
      const found = searchResults.length > 0;
      logger.info(`🎯 Результат поиска: ${found ? 'НАЙДЕНО' : 'НЕ НАЙДЕНО'}`);
      logger.info(`📊 Найдено совпадений: ${searchResults.length}`);
      
      // Дополнительная отладочная информация
      const debugInfo = {
        query: query,
        queryLower: queryLower,
        documentId: documentId,
        totalChunks: allChunks.length,
        chunkIndexes: allChunks.map(c => c.chunkIndex).slice(0, 10), // Первые 10 индексов
        lastChunkIndex: allChunks[allChunks.length - 1]?.chunkIndex,
        searchResults: searchResults
      };
      
      return {
        found,
        chunks: allChunks,
        totalChunks: allChunks.length,
        searchResults,
        debugInfo
      };
      
    } catch (error) {
      logger.error(`❌ Ошибка при детальном поиске: ${error}`);
      return { found: false, chunks: [], totalChunks: 0, searchResults: [], debugInfo: { error: String(error) } };
    }
  }

  private async getAllDocumentChunks(documentId: string): Promise<any[]> {
    try {
      // Получаем все чанки документа из in-memory хранилища
      const chunks: any[] = [];
      
      for (const [chunkId, chunk] of this.inMemoryChunks.entries()) {
        if (chunk.documentId === documentId) {
          chunks.push(chunk);
        }
      }
      
      // Сортируем по chunkIndex для правильного порядка
      chunks.sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0));
      
      return chunks;
    } catch (error) {
      logger.error(`Ошибка при получении всех чанков документа: ${error}`);
      return [];
    }
  }

  private async searchChunksWithoutEmbeddings(query: string, options: { limit?: number; threshold?: number }): Promise<SearchResult[]> {
    try {
      const results: SearchResult[] = [];
      const queryLower = query.toLowerCase();
      
      // Ищем чанки без эмбеддингов, которые содержат запрос
      for (const [chunkId, chunk] of this.inMemoryChunks) {
        if (chunk.embeddingError && chunk.content.toLowerCase().includes(queryLower)) {
          // Получаем документ
          const document = await this.getDocument(chunk.documentId);
          if (!document) continue;

          // Вычисляем простую оценку релевантности на основе вхождения слов
          const words = queryLower.split(' ').filter(w => w.length > 2);
          const contentLower = chunk.content.toLowerCase();
          let score = 0;
          
          words.forEach(word => {
            if (contentLower.includes(word)) {
              score += 0.3;
              // Бонус за точное совпадение
              if (contentLower.includes(word)) {
                score += 0.2;
              }
            }
          });

          // Нормализуем оценку
          score = Math.min(score, 1.0);

          const searchResult: SearchResult = {
            document: {
              id: document.id,
              title: document.title,
              fileSize: document.fileSize,
              uploadDate: document.uploadDate,
              tags: document.tags,
              status: document.status,
              type: document.type,
              description: document.description,
              totalChunks: document.totalChunks,
              processedChunks: document.processedChunks,
              embeddingErrors: document.embeddingErrors,
              processingQuality: document.processingQuality,
              chunksWithoutEmbeddings: document.chunksWithoutEmbeddings,
            },
            chunk: {
              id: chunk.id,
              documentId: chunk.documentId,
              content: chunk.content,
              pageNumber: chunk.pageNumber,
              chunkIndex: chunk.chunkIndex,
              tokens: chunk.tokens,
              embeddingError: chunk.embeddingError,
              totalChunks: document.totalChunks,
              processedChunks: document.processedChunks,
              embeddingErrors: document.embeddingErrors,
              processingQuality: document.processingQuality,
              chunksWithoutEmbeddings: document.chunksWithoutEmbeddings,
            },
            score: score,
            highlights: [],
            context: ''
          };

          results.push(searchResult);
        }
      }

      // Сортируем по релевантности
      return results.sort((a, b) => b.score - a.score);
    } catch (error) {
      logger.error('Ошибка поиска чанков без эмбеддингов:', error);
      return [];
    }
  }

  private removeDuplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      if (!result.chunk) return false;
      const key = `${result.document.id}_${result.chunk.id}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async getDocument(documentId: string): Promise<any | null> {
    if (this.isAvailable) {
      try {
        // Поиск документа в Vectra
        const results = await this.index.queryItems(new Array(1536).fill(0), '', 1000);
        const document = results.find(r => r.item.metadata.documentId === documentId);
        
        if (document) {
          return {
            id: String(document.item.metadata.documentId),
            title: String(document.item.metadata.title || ''),
            filename: document.item.metadata.filename ? String(document.item.metadata.filename) : undefined,
            fileSize: Number(document.item.metadata.fileSize || 0),
            uploadDate: String(document.item.metadata.uploadDate || new Date().toISOString()),
            author: document.item.metadata.author ? String(document.item.metadata.author) : undefined,
            category: document.item.metadata.category ? String(document.item.metadata.category) : undefined,
            tags: Array.isArray(document.item.metadata.tags) ? document.item.metadata.tags as string[] : [],
            status: String(document.item.metadata.status || 'completed'),
            type: 'document',
            description: String(document.item.metadata.description || ''),
            // Добавляем информацию о качестве обработки
            totalChunks: document.item.metadata.totalChunks ? Number(document.item.metadata.totalChunks) : undefined,
            processedChunks: document.item.metadata.processedChunks ? Number(document.item.metadata.processedChunks) : undefined,
            embeddingErrors: document.item.metadata.embeddingErrors ? Number(document.item.metadata.embeddingErrors) : undefined,
            processingQuality: document.item.metadata.processingQuality ? Number(document.item.metadata.processingQuality) : undefined,
            chunksWithoutEmbeddings: document.item.metadata.chunksWithoutEmbeddings ? Number(document.item.metadata.chunksWithoutEmbeddings) : undefined,
          };
        }
      } catch (error) {
        logger.error('Ошибка получения документа из Vectra:', error);
      }
    }
    
    // Fallback к in-memory
    return this.inMemoryDocuments.get(documentId) || null;
  }

  async getAllDocuments(): Promise<any[]> {
    // Если уже есть in-memory документы, используем их (устойчивее к расхождениям)
    if (this.inMemoryDocuments.size > 0) {
      return Array.from(this.inMemoryDocuments.values());
    }
    if (this.isAvailable) {
      try {
        // Получаем все документы из Vectra
        const results = await this.index.queryItems(new Array(1536).fill(0), '', 1000);
        const documents = results
          .filter(r => r.item.metadata.type === 'document')
          .map(r => ({
            id: String(r.item.metadata.documentId),
            title: String(r.item.metadata.title || ''),
            filename: r.item.metadata.filename ? String(r.item.metadata.filename) : undefined,
            fileSize: Number(r.item.metadata.fileSize || 0),
            uploadDate: String(r.item.metadata.uploadDate || new Date().toISOString()),
            author: r.item.metadata.author ? String(r.item.metadata.author) : undefined,
            category: r.item.metadata.category ? String(r.item.metadata.category) : undefined,
            tags: Array.isArray(r.item.metadata.tags) ? r.item.metadata.tags as string[] : [],
            status: String(r.item.metadata.status || 'completed') as any,
            type: 'document' as const,
            description: String(r.item.metadata.description || ''),
            // Добавляем информацию о качестве обработки
            totalChunks: r.item.metadata.totalChunks ? Number(r.item.metadata.totalChunks) : undefined,
            processedChunks: r.item.metadata.processedChunks ? Number(r.item.metadata.processedChunks) : undefined,
            embeddingErrors: r.item.metadata.embeddingErrors ? Number(r.item.metadata.embeddingErrors) : undefined,
            processingQuality: r.item.metadata.processingQuality ? Number(r.item.metadata.processingQuality) : undefined,
            chunksWithoutEmbeddings: r.item.metadata.chunksWithoutEmbeddings ? Number(r.item.metadata.chunksWithoutEmbeddings) : undefined,
          }));
        
        return documents;
      } catch (error) {
        logger.error('Ошибка получения документов из Vectra:', error);
      }
    }
    
    // Fallback к in-memory
    return Array.from(this.inMemoryDocuments.values());
  }

  async deleteDocument(documentId: string): Promise<void> {
    if (this.isAvailable) {
      try {
        // Удаляем документ и его чанки из Vectra
        const results = await this.index.queryItems(new Array(1536).fill(0), '', 1000);
        const itemsToDelete = results.filter(r => 
          r.item.metadata.documentId === documentId
        );
        
        for (const item of itemsToDelete) {
          await this.index.deleteItem(item.item.id);
        }
        
        logger.info(`Документ ${documentId} удален из Vectra`);
        // Чистим in-memory и файлы
        this.inMemoryDocuments.delete(documentId);
        for (const [chunkId, chunk] of this.inMemoryChunks) {
          if (chunk.documentId === documentId) {
            this.inMemoryChunks.delete(chunkId);
          }
        }
        await this.saveToFiles();
      } catch (error) {
        logger.error('Ошибка удаления документа из Vectra:', error);
        // Fallback к in-memory
        this.inMemoryDocuments.delete(documentId);
        // Удаляем связанные чанки
        for (const [chunkId, chunk] of this.inMemoryChunks) {
          if (chunk.documentId === documentId) {
            this.inMemoryChunks.delete(chunkId);
          }
        }
        await this.saveToFiles();
      }
    } else {
      // In-memory режим
      this.inMemoryDocuments.delete(documentId);
      // Удаляем связанные чанки
      for (const [chunkId, chunk] of this.inMemoryChunks) {
        if (chunk.documentId === documentId) {
          this.inMemoryChunks.delete(chunkId);
        }
      }
      await this.saveToFiles();
    }
  }

  async getStats(): Promise<any> {
    try {
      let totalDocuments = 0;
      let totalChunks = 0;
      let totalStorageSize = 0;
      let totalEmbeddingErrors = 0;
      let totalChunksWithoutEmbeddings = 0;
      let averageProcessingQuality = 0;
      const documentsByCategory: { [key: string]: number } = {
        documentation: 0,
        tutorial: 0,
        troubleshooting: 0
      };
      
      // Статистика по статусам обработки
      const documentsByStatus: { [key: string]: number } = {
        completed: 0,
        partially_completed: 0,
        failed: 0,
        processing: 0,
        uploaded: 0
      };

      // Получаем все документы (только из in-memory, чтобы избежать дублирования)
      const allDocuments = Array.from(this.inMemoryDocuments.values());
      
      totalDocuments = allDocuments.length;
      
      // Подсчитываем категории, размер и качество обработки
      for (const doc of allDocuments) {
        const category = String(doc.category || 'documentation');
        if (documentsByCategory.hasOwnProperty(category)) {
          documentsByCategory[category]++;
        } else {
          documentsByCategory.documentation++;
        }
        
        // Подсчитываем статусы
        const status = String(doc.status || 'completed');
        if (documentsByStatus.hasOwnProperty(status)) {
          documentsByStatus[status]++;
        } else {
          documentsByStatus.completed++;
        }
        
        totalStorageSize += Number(doc.fileSize || 0);
        
        // Подсчитываем ошибки эмбеддингов и качество обработки
        if (doc.embeddingErrors) {
          totalEmbeddingErrors += Number(doc.embeddingErrors);
        }
        
        if (doc.chunksWithoutEmbeddings) {
          totalChunksWithoutEmbeddings += Number(doc.chunksWithoutEmbeddings);
        }
        
        if (doc.processingQuality) {
          averageProcessingQuality += Number(doc.processingQuality);
        }
      }
      
      // Рассчитываем среднее качество обработки
      const documentsWithQuality = allDocuments.filter(doc => doc.processingQuality !== undefined);
      if (documentsWithQuality.length > 0) {
        averageProcessingQuality = Math.round(averageProcessingQuality / documentsWithQuality.length);
      }

      // Подсчитываем чанки
      totalChunks = this.inMemoryChunks.size;

      return {
        totalDocuments,
        totalChunks,
        totalStorageSize,
        documentsByCategory,
        documentsByStatus,
        totalEmbeddingErrors,
        totalChunksWithoutEmbeddings,
        averageProcessingQuality,
        documentsWithQuality: documentsWithQuality.length,
        // Дополнительная статистика по качеству
        qualityBreakdown: {
          excellent: documentsWithQuality.filter(doc => (doc.processingQuality || 0) >= 95).length,
          good: documentsWithQuality.filter(doc => (doc.processingQuality || 0) >= 80 && (doc.processingQuality || 0) < 95).length,
          fair: documentsWithQuality.filter(doc => (doc.processingQuality || 0) >= 60 && (doc.processingQuality || 0) < 80).length,
          poor: documentsWithQuality.filter(doc => (doc.processingQuality || 0) < 60).length,
        }
      };
    } catch (error) {
      logger.error('Ошибка получения статистики:', error);
      return {
        totalDocuments: 0,
        totalChunks: 0,
        totalStorageSize: 0,
        documentsByCategory: {
          documentation: 0,
          tutorial: 0,
          troubleshooting: 0
        },
        documentsByStatus: {
          completed: 0,
          partially_completed: 0,
          failed: 0,
          processing: 0,
          uploaded: 0
        },
        totalEmbeddingErrors: 0,
        totalChunksWithoutEmbeddings: 0,
        averageProcessingQuality: 0,
        documentsWithQuality: 0,
        qualityBreakdown: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0,
        }
      };
    }
  }
}