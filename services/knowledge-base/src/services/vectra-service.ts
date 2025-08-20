import { LocalIndex } from 'vectra';
import path from 'path';
import { promises as fs } from 'fs';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
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

  constructor() {
    const indexPath = path.join(process.cwd(), 'data', 'vectra-index');
    this.index = new LocalIndex(indexPath);
    
    // Пути для файлового хранилища (fallback)
    this.documentsFilePath = path.join(process.cwd(), 'data', 'documents.json');
    this.chunksFilePath = path.join(process.cwd(), 'data', 'chunks.json');
  }

  async initialize(): Promise<void> {
    try {
      // Создаем индекс если он не существует
      if (!(await this.index.isIndexCreated())) {
        await this.index.createIndex();
        logger.info('Vectra индекс создан');
      }

      logger.info('Vectra сервис инициализирован успешно');
      this.isAvailable = true;
    } catch (error) {
      logger.warn('Vectra недоступен, переходим в режим in-memory:', error);
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
        logger.info(`Загружено ${this.inMemoryDocuments.size} документов из файла`);
      } catch (error) {
        logger.debug('Файл документов не найден или пуст, начинаем с пустого хранилища');
      }

      // Загружаем чанки
      try {
        const chunksData = await fs.readFile(this.chunksFilePath, 'utf-8');
        const chunks = JSON.parse(chunksData);
        this.inMemoryChunks = new Map(Object.entries(chunks));
        logger.info(`Загружено ${this.inMemoryChunks.size} чанков из файла`);
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
            description: document.description
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
            tokens: chunk.tokens
          }
        });
        logger.debug(`Чанк ${chunk.id} добавлен в Vectra`);
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

  async updateDocumentStatus(documentId: string, status: string): Promise<void> {
    if (this.isAvailable) {
      try {
        // Удаляем старую запись документа и вставляем новую с обновленным статусом
        const results = await this.index.queryItems(new Array(1536).fill(0), '', 1000);
        const itemsToDelete = results.filter(r => r.item.metadata.type === 'document' && r.item.metadata.documentId === documentId);
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
             }
           });
          this.inMemoryDocuments.set(documentId, existing);
          await this.saveToFiles();
        }
      } catch (error) {
        logger.error('Ошибка обновления статуса документа в Vectra:', error);
      }
    } else {
      const doc = this.inMemoryDocuments.get(documentId);
      if (doc) {
        doc.status = status;
        this.inMemoryDocuments.set(documentId, doc);
        await this.saveToFiles();
      }
    }
  }

  async searchDocuments(query: SearchQuery): Promise<SearchResult[]> {
    if (this.isAvailable && query.embedding) {
      try {
        // Поиск в Vectra
        const results = await this.index.queryItems(query.embedding, '', query.limit || 10);
        
                 return results.map(result => ({
           document: {
             id: String(result.item.metadata.documentId),
             title: String(result.item.metadata.title || ''),
             fileSize: Number(result.item.metadata.fileSize || 0),
             uploadDate: String(result.item.metadata.uploadDate || new Date().toISOString()),
             author: result.item.metadata.author ? String(result.item.metadata.author) : undefined,
             category: result.item.metadata.category ? String(result.item.metadata.category) : undefined,
             tags: Array.isArray(result.item.metadata.tags) ? result.item.metadata.tags as string[] : [],
             status: String(result.item.metadata.status || 'completed') as any,
             type: 'document',
             description: String(result.item.metadata.description || ''),
           },
          chunk: result.item.metadata.type === 'chunk' ? {
            id: String(result.item.metadata.chunkId || ''),
            documentId: String(result.item.metadata.documentId),
            content: String(result.item.metadata.content || ''),
            pageNumber: result.item.metadata.pageNumber as number | undefined,
            chunkIndex: result.item.metadata.chunkIndex as number | undefined,
            tokens: result.item.metadata.tokens as number | undefined,
          } : undefined,
          score: result.score,
          highlights: [],
          context: '',
        }));
      } catch (error) {
        logger.error('Ошибка поиска в Vectra:', error);
        // Fallback к in-memory поиску
        return this.searchInMemory(query);
      }
    } else {
      // In-memory поиск
      return this.searchInMemory(query);
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
            description: String(document.item.metadata.description || '')
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
      const documentsByCategory: { [key: string]: number } = {
        documentation: 0,
        tutorial: 0,
        troubleshooting: 0
      };

      // Получаем все документы (только из in-memory, чтобы избежать дублирования)
      const allDocuments = Array.from(this.inMemoryDocuments.values());
      
      totalDocuments = allDocuments.length;
      
      // Подсчитываем категории и размер
      for (const doc of allDocuments) {
        const category = String(doc.category || 'documentation');
        if (documentsByCategory.hasOwnProperty(category)) {
          documentsByCategory[category]++;
        } else {
          documentsByCategory.documentation++;
        }
        
        totalStorageSize += Number(doc.fileSize || 0);
      }

      // Подсчитываем чанки
      totalChunks = this.inMemoryChunks.size;

      return {
        totalDocuments,
        totalChunks,
        totalStorageSize,
        documentsByCategory
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
        }
      };
    }
  }
}