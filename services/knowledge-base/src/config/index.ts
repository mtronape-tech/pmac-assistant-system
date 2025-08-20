import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export interface Config {
  server: {
    port: number;
    host: string;
    cors: {
      origin: string[];
      credentials: boolean;
    };
  };
  vectra: {
    dataPath: string;
    indexName: string;
  };
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  upload: {
    maxFileSize: number;
    allowedTypes: string[];
    uploadPath: string;
  };
  processing: {
    maxConcurrentJobs: number;
    jobTimeout: number;
  };
}

export const config: Config = {
  server: {
    port: parseInt(process.env.KNOWLEDGE_BASE_PORT || '3005'),
    host: process.env.KNOWLEDGE_BASE_HOST || '0.0.0.0',
    cors: {
      origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
      credentials: true,
    },
  },
  vectra: {
    dataPath: process.env.VECTRA_DATA_PATH || './data',
    indexName: process.env.VECTRA_INDEX_NAME || 'vectra',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000'),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB по умолчанию
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,txt,html,md').split(','),
    uploadPath: process.env.UPLOAD_DIR || './uploads',
  },
  processing: {
    maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '3'),
    jobTimeout: parseInt(process.env.JOB_TIMEOUT || '300000'), // 5 минут по умолчанию
  },
};
