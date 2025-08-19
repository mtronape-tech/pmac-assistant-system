import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export interface KnowledgeBaseConfig {
  server: {
    port: number;
    host: string;
  };
  weaviate: {
    url: string;
    apiKey?: string;
    className: string;
    timeout: number;
  };
  ai: {
    provider: 'openai' | 'openrouter';
    openai: {
      apiKey: string;
      model: string;
      embeddingModel: string;
      maxTokens: number;
    };
    openrouter: {
      apiKey: string;
      model: string;
      embeddingModel: string;
      maxTokens: number;
      baseUrl: string;
    };
  };
  uploads: {
    maxFileSize: number; // в байтах
    allowedTypes: string[];
    uploadDir: string;
  };
  processing: {
    chunkSize: number;
    chunkOverlap: number;
    maxConcurrentJobs: number;
  };
  logging: {
    level: string;
    directory: string;
  };
}

export const config: KnowledgeBaseConfig = {
  server: {
    port: parseInt(process.env.KNOWLEDGE_BASE_PORT || '3005'),
    host: process.env.KNOWLEDGE_BASE_HOST || '0.0.0.0',
  },
  weaviate: {
    url: process.env.WEAVIATE_URL || 'http://localhost:8080',
    apiKey: process.env.WEAVIATE_API_KEY,
    className: process.env.WEAVIATE_CLASS_NAME || 'PMACDocument',
    timeout: parseInt(process.env.WEAVIATE_TIMEOUT || '30000'),
  },
  ai: {
    provider: (process.env.AI_PROVIDER as 'openai' | 'openrouter') || 'openrouter',
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4',
      embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000'),
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY || '',
      model: process.env.AI_MODEL || 'openai/gpt-oss-20b:free',
      embeddingModel: process.env.EMBEDDING_MODEL || 'openai/text-embedding-3-small',
      maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4000'),
      baseUrl: 'https://openrouter.ai/api/v1',
    },
  },
  uploads: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB по умолчанию
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,txt,html,md').split(','),
    uploadDir: process.env.UPLOAD_DIR || './uploads',
  },
  processing: {
    chunkSize: parseInt(process.env.CHUNK_SIZE || '1000'),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '200'),
    maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '3'),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    directory: process.env.LOG_DIR || './logs',
  },
};
