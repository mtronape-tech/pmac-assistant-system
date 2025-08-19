import weaviate, { WeaviateClient } from 'weaviate-ts-client';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import type { 
  Document, 
  DocumentChunk, 
  SearchQuery, 
  SearchResult, 
  WeaviateObject 
} from '../types/knowledge-types.js';

export class WeaviateService {
  private client: WeaviateClient;
  private className: string;
  private isAvailable = false;
  private inMemoryDocuments = new Map<string, any>();
  private inMemoryChunks = new Map<string, any>();

  constructor() {
    this.className = config.weaviate.className;
    this.client = weaviate.client({
      scheme: config.weaviate.url.startsWith('https') ? 'https' : 'http',
      host: config.weaviate.url.replace(/^https?:\/\//, ''),
    });
  }

  async initialize(): Promise<void> {
    try {
      // Проверяем подключение с таймаутом
      const isReady = await Promise.race([
        this.client.misc.readyChecker().do(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout connecting to Weaviate')), 5000)
        )
      ]);
      
      if (!isReady) {
        throw new Error('Weaviate не готов к работе');
      }

      // Проверяем существование класса
      const classExists = await this.checkClassExists();
      if (!classExists) {
        await this.createClass();
      }

      logger.info('Weaviate сервис инициализирован успешно');
      this.isAvailable = true;
    } catch (error) {
      logger.warn('Weaviate недоступен, переходим в режим in-memory:', error);
      this.isAvailable = false;
      // Не выбрасываем ошибку, позволяем сервису работать без Weaviate
    }
  }

  private async checkClassExists(): Promise<boolean> {
    try {
      const schema = await this.client.schema.getter().do();
      return schema.classes?.some(cls => cls.class === this.className) || false;
    } catch (error) {
      logger.error('Ошибка проверки схемы Weaviate:', error);
      return false;
    }
  }

  private async createClass(): Promise<void> {
    try {
      const classDefinition = {
        class: this.className,
        description: 'PMAC документы и чанки для поиска',
        vectorizer: 'none', // Мы будем предоставлять векторы сами
        properties: [
          {
            name: 'documentId',
            dataType: ['text'],
            description: 'Идентификатор документа',
          },
          {
            name: 'chunkId',
            dataType: ['text'],
            description: 'Идентификатор чанка (если применимо)',
          },
          {
            name: 'title',
            dataType: ['text'],
            description: 'Заголовок документа или чанка',
          },
          {
            name: 'content',
            dataType: ['text'],
            description: 'Содержимое документа или чанка',
          },
          {
            name: 'type',
            dataType: ['text'],
            description: 'Тип документа',
          },
          {
            name: 'category',
            dataType: ['text'],
            description: 'Категория документа',
          },
          {
            name: 'tags',
            dataType: ['text[]'],
            description: 'Теги документа',
          },
          {
            name: 'author',
            dataType: ['text'],
            description: 'Автор документа',
          },
          {
            name: 'source',
            dataType: ['text'],
            description: 'Источник документа',
          },
          {
            name: 'filename',
            dataType: ['text'],
            description: 'Имя файла',
          },
          {
            name: 'language',
            dataType: ['text'],
            description: 'Язык документа',
          },
          {
            name: 'createdAt',
            dataType: ['date'],
            description: 'Дата создания',
          },
          {
            name: 'updatedAt',
            dataType: ['date'],
            description: 'Дата обновления',
          },
          {
            name: 'chunkOrder',
            dataType: ['int'],
            description: 'Порядок чанка в документе',
          },
          {
            name: 'tokensCount',
            dataType: ['int'],
            description: 'Количество токенов в чанке',
          },
          {
            name: 'quality',
            dataType: ['text'],
            description: 'Качество чанка',
          },
        ],
      };

      await this.client.schema.classCreator().withClass(classDefinition).do();
      logger.info(`Класс ${this.className} создан в Weaviate`);
    } catch (error) {
      logger.error('Ошибка создания класса в Weaviate:', error);
      throw error;
    }
  }

  async addDocument(document: Document): Promise<void> {
    if (!this.isAvailable) {
      // Режим in-memory
      this.inMemoryDocuments.set(document.id, document);
      logger.debug(`Документ ${document.id} добавлен в in-memory хранилище`);
      return;
    }

    try {
      const weaviateObject: WeaviateObject = {
        id: document.id,
        class: this.className,
        properties: {
          documentId: document.id,
          title: document.title,
          content: document.content,
          type: document.type,
          category: document.metadata.category || '',
          tags: document.metadata.tags,
          author: document.metadata.author || '',
          source: document.metadata.source,
          filename: document.metadata.filename,
          language: document.metadata.language,
          createdAt: document.createdAt.toISOString(),
          updatedAt: document.updatedAt.toISOString(),
          chunkOrder: 0,
          tokensCount: 0,
          quality: 'high',
        },
      };

      await this.client.data.creator()
        .withClassName(this.className)
        .withId(document.id)
        .withProperties(weaviateObject.properties)
        .do();

      logger.debug(`Документ ${document.id} добавлен в Weaviate`);
    } catch (error) {
      logger.error(`Ошибка добавления документа ${document.id} в Weaviate:`, error);
      throw error;
    }
  }

  async addDocumentChunk(chunk: DocumentChunk, embedding: number[]): Promise<void> {
    try {
      const chunkId = `${chunk.documentId}_chunk_${chunk.order}`;
      
      const weaviateObject: WeaviateObject = {
        id: chunkId,
        class: this.className,
        properties: {
          documentId: chunk.documentId,
          chunkId: chunk.id,
          title: `Chunk ${chunk.order}`,
          content: chunk.content,
          chunkOrder: chunk.order,
          tokensCount: chunk.metadata.tokensCount,
          quality: chunk.metadata.quality,
          createdAt: chunk.createdAt.toISOString(),
        },
        vector: embedding,
      };

      await this.client.data.creator()
        .withClassName(this.className)
        .withId(chunkId)
        .withProperties(weaviateObject.properties)
        .withVector(embedding)
        .do();

      logger.debug(`Чанк ${chunkId} добавлен в Weaviate`);
    } catch (error) {
      logger.error(`Ошибка добавления чанка ${chunk.id} в Weaviate:`, error);
      throw error;
    }
  }

  async searchSimilar(queryEmbedding: number[], query: SearchQuery): Promise<SearchResult[]> {
    if (!this.isAvailable) {
      // Режим in-memory - простой поиск по тексту
      const results: SearchResult[] = [];
      const queryText = query.query.toLowerCase();
      
      for (const [docId, doc] of this.inMemoryDocuments.entries()) {
        if (doc.content.toLowerCase().includes(queryText)) {
          const document: Document = {
            id: docId,
            title: doc.title || '',
            content: doc.content || '',
            type: doc.type,
            metadata: doc.metadata || {},
            createdAt: doc.createdAt || new Date(),
            updatedAt: doc.updatedAt || new Date(),
          };

          results.push({
            document,
            chunk: undefined,
            score: 0.8,
            highlights: this.extractHighlights(doc.content, query.query),
            context: this.extractContext(doc.content, query.query),
          });
        }
      }
      
      logger.debug(`Найдено ${results.length} результатов в in-memory хранилище`);
      return results.slice(0, query.limit || 10);
    }

    try {
      let weaviateQuery = this.client.graphql.get()
        .withClassName(this.className)
        .withFields('documentId chunkId title content type category tags author source filename chunkOrder tokensCount quality createdAt _additional { id score }')
        .withNearVector({
          vector: queryEmbedding,
          certainty: query.threshold || 0.7,
        })
        .withLimit(query.limit || 10);

      // Добавляем фильтры
      if (query.filters) {
        const whereFilter = this.buildWhereFilter(query.filters);
        if (whereFilter) {
          weaviateQuery = weaviateQuery.withWhere(whereFilter);
        }
      }

      const result = await weaviateQuery.do();
      
      if (!result.data?.Get?.[this.className]) {
        return [];
      }

      const searchResults: SearchResult[] = result.data.Get[this.className].map((item: any) => {
        // Создаем mock объекты для Document и DocumentChunk
        const document: Document = {
          id: item.documentId,
          title: item.title || '',
          content: item.content || '',
          type: item.type,
          metadata: {
            filename: item.filename || '',
            fileSize: 0,
            mimeType: '',
            source: item.source || '',
            author: item.author,
            category: item.category,
            tags: item.tags || [],
            language: item.language || 'ru',
            version: 1,
            checksum: '',
          },
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.createdAt),
        };

        const chunk: DocumentChunk | undefined = item.chunkId ? {
          id: item.chunkId,
          documentId: item.documentId,
          content: item.content,
          order: item.chunkOrder || 0,
          metadata: {
            startOffset: 0,
            endOffset: item.content?.length || 0,
            tokensCount: item.tokensCount || 0,
            quality: item.quality || 'medium',
            keywords: [],
          },
          createdAt: new Date(item.createdAt),
        } : undefined;

        return {
          document,
          chunk,
          score: item._additional.score || 0,
          highlights: this.extractHighlights(item.content, query.query),
          context: this.extractContext(item.content, query.query),
        };
      });

      logger.debug(`Найдено ${searchResults.length} результатов для запроса`);
      return searchResults;
    } catch (error) {
      logger.error('Ошибка поиска в Weaviate:', error);
      throw error;
    }
  }

  private buildWhereFilter(filters: any): any {
    const conditions: any[] = [];

    if (filters.documentTypes?.length > 0) {
      conditions.push({
        path: ['type'],
        operator: 'ContainsAny',
        valueText: filters.documentTypes,
      });
    }

    if (filters.categories?.length > 0) {
      conditions.push({
        path: ['category'],
        operator: 'ContainsAny',
        valueText: filters.categories,
      });
    }

    if (filters.tags?.length > 0) {
      conditions.push({
        path: ['tags'],
        operator: 'ContainsAny',
        valueText: filters.tags,
      });
    }

    if (filters.author) {
      conditions.push({
        path: ['author'],
        operator: 'Equal',
        valueText: filters.author,
      });
    }

    if (filters.language) {
      conditions.push({
        path: ['language'],
        operator: 'Equal',
        valueText: filters.language,
      });
    }

    if (conditions.length === 0) {
      return null;
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return {
      operator: 'And',
      operands: conditions,
    };
  }

  private extractHighlights(content: string, query: string): string[] {
    const highlights: string[] = [];
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    queryWords.forEach(word => {
      const index = contentLower.indexOf(word);
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + word.length + 50);
        highlights.push(content.substring(start, end));
      }
    });

    return highlights.slice(0, 3); // Максимум 3 выделения
  }

  private extractContext(content: string, query: string): string {
    const contextLength = 200;
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    // Находим первое совпадение
    let bestIndex = -1;
    for (const word of queryWords) {
      const index = contentLower.indexOf(word);
      if (index !== -1) {
        bestIndex = index;
        break;
      }
    }

    if (bestIndex === -1) {
      return content.substring(0, contextLength);
    }

    const start = Math.max(0, bestIndex - contextLength / 2);
    const end = Math.min(content.length, start + contextLength);
    
    return content.substring(start, end);
  }

  async deleteDocument(documentId: string): Promise<void> {
    if (!this.isAvailable) {
      // Режим in-memory
      const deleted = this.inMemoryDocuments.delete(documentId);
      if (deleted) {
        // Удаляем связанные чанки
        for (const [chunkId, chunk] of this.inMemoryChunks.entries()) {
          if (chunk.documentId === documentId) {
            this.inMemoryChunks.delete(chunkId);
          }
        }
        logger.debug(`Документ ${documentId} удален из in-memory хранилища`);
      }
      return;
    }

    try {
      // Удаляем документ и все его чанки
      await this.client.batch.objectsBatchDeleter()
        .withClassName(this.className)
        .withWhere({
          path: ['documentId'],
          operator: 'Equal',
          valueText: documentId,
        })
        .do();

      logger.debug(`Документ ${documentId} и его чанки удалены из Weaviate`);
    } catch (error) {
      logger.error(`Ошибка удаления документа ${documentId} из Weaviate:`, error);
      throw error;
    }
  }

  async getStats(): Promise<any> {
    if (!this.isAvailable) {
      return {
        totalDocuments: this.inMemoryDocuments.size,
        totalChunks: this.inMemoryChunks.size,
        storageType: 'in-memory',
        uptime: process.uptime(),
        weaviateUrl: 'not available',
        className: this.className,
        status: 'fallback mode',
      };
    }

    try {
      const result = await this.client.graphql.aggregate()
        .withClassName(this.className)
        .withFields('meta { count }')
        .do();

      return {
        totalObjects: result.data?.Aggregate?.[this.className]?.[0]?.meta?.count || 0,
        className: this.className,
        storageType: 'weaviate',
        status: 'active',
      };
    } catch (error) {
      logger.error('Ошибка получения статистики Weaviate:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isAvailable) {
      return false; // Weaviate недоступен
    }
    
    try {
      const isReady = await this.client.misc.readyChecker().do();
      return isReady;
    } catch (error) {
      logger.error('Ошибка проверки здоровья Weaviate:', error);
      this.isAvailable = false;
      return false;
    }
  }
}
