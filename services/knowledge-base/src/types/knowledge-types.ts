// Типы для Knowledge Base Service

export interface Document {
  id: string;
  title: string;
  filename?: string; // Оригинальное имя файла с расширением
  fileSize: number;
  uploadDate: string;
  author?: string;
  category?: string;
  tags: string[];
  status: 'uploaded' | 'processing' | 'completed' | 'failed' | 'partially_completed';
  type: DocumentType | 'document';
  description?: string;
  // Новые поля для отслеживания качества обработки
  totalChunks?: number;
  processedChunks?: number;
  embeddingErrors?: number;
  processingQuality?: number; // Процент успешно обработанных чанков (0-100)
  chunksWithoutEmbeddings?: number; // Количество чанков без эмбеддингов
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  pageNumber?: number;
  chunkIndex?: number;
  tokens?: number;
  embedding?: number[];
  embeddingError?: string; // Ошибка при генерации эмбеддинга
  metadata?: ChunkMetadata;
  createdAt?: Date;
  // Поля для информации о качестве обработки (для совместимости)
  totalChunks?: number;
  processedChunks?: number;
  embeddingErrors?: number;
  processingQuality?: number;
  chunksWithoutEmbeddings?: number;
}

export interface DocumentMetadata {
  filename?: string;
  fileSize?: number;
  mimeType?: string;
  source?: string;
  author?: string;
  category?: DocumentCategory;
  tags?: string[];
  language?: string;
  version?: number;
  checksum?: string;
}

export interface ChunkMetadata {
  startOffset: number;
  endOffset: number;
  tokensCount: number;
  quality: 'high' | 'medium' | 'low';
  keywords: string[];
}

export type DocumentType = 
  | 'pdf' 
  | 'doc' 
  | 'docx' 
  | 'txt' 
  | 'html' 
  | 'md' 
  | 'manual' 
  | 'specification'
  | 'guide'
  | 'troubleshooting';

export type DocumentCategory = 
  | 'pmac_manual'
  | 'programming_guide'
  | 'hardware_spec'
  | 'troubleshooting'
  | 'best_practices'
  | 'case_studies'
  | 'api_documentation'
  | 'configuration_guide'
  | 'safety_manual'
  | 'maintenance_guide';

export interface ProcessingJob {
  id: string;
  documentId: string;
  status: JobStatus;
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  steps: ProcessingStep[];
}

export type JobStatus = 
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'partially_completed';

export interface ProcessingStep {
  name: string;
  status: JobStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  metadata?: any;
}

export interface SearchQuery {
  query: string;
  text?: string;
  embedding?: number[];
  filters?: SearchFilters;
  limit?: number;
  threshold?: number;
  includeContent?: boolean;
}

export interface SearchFilters {
  documentTypes?: DocumentType[];
  categories?: DocumentCategory[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  author?: string;
  language?: string;
}

export interface SearchResult {
  document: Document;
  chunk?: DocumentChunk;
  score: number;
  highlights: string[];
  context: string;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  query: string;
  processingTime: number;
  suggestions?: string[];
}

export interface AIResponse {
  answer: string;
  sources: SearchResult[];
  confidence: number;
  reasoning: string;
  followUpQuestions?: string[];
}

export interface UploadResult {
  documentId: string;
  fileSize: number;
  processingJobId: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  message?: string;
}

export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  tokensUsed: number;
  model: string;
}

export interface TextChunk {
  content: string;
  startOffset: number;
  endOffset: number;
  metadata?: Record<string, any>;
}

export interface DocumentStats {
  totalDocuments: number;
  totalChunks: number;
  documentsByType: Record<DocumentType, number>;
  documentsByCategory: Record<DocumentCategory, number>;
  averageChunksPerDocument: number;
  totalStorageSize: number;
  lastUpdated: Date;
  // Новая информация о качестве обработки
  documentsByStatus: {
    completed: number;
    partially_completed: number;
    failed: number;
    processing: number;
    uploaded: number;
  };
  totalEmbeddingErrors: number;
  totalChunksWithoutEmbeddings: number; // Общее количество чанков без эмбеддингов
  averageProcessingQuality: number;
  documentsWithQuality: number;
  qualityBreakdown: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

export interface ProcessingStats {
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  queueSize: number;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  services: {
    vectra: boolean;
    openai: boolean;
    fileSystem: boolean;
  };
  uptime: number;
  version: string;
}
