// Типы для Knowledge Base Service

export interface Document {
  id: string;
  title: string;
  content: string;
  type: DocumentType;
  metadata: DocumentMetadata;
  chunks?: DocumentChunk[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  order: number;
  embedding?: number[];
  metadata: ChunkMetadata;
  createdAt: Date;
}

export interface DocumentMetadata {
  filename: string;
  fileSize: number;
  mimeType: string;
  source: string;
  author?: string;
  category?: DocumentCategory;
  tags: string[];
  language: string;
  version: number;
  checksum: string;
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
  | 'cancelled';

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
  filename: string;
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

export interface WeaviateObject {
  id: string;
  class: string;
  properties: Record<string, any>;
  vector?: number[];
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
}

export interface ProcessingStats {
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  queueSize: number;
}

export interface SystemHealth {
  weaviateConnected: boolean;
  openaiConnected: boolean;
  diskSpace: {
    available: number;
    used: number;
    total: number;
  };
  memoryUsage: {
    used: number;
    total: number;
  };
  uptime: number;
}
