import { readFileSync } from 'fs';
import { parse } from 'ini';
import { logger } from '../utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем config.ini файл
const configPath = path.join(__dirname, '../../config.ini');
let configData: any = {};

try {
  const configContent = readFileSync(configPath, 'utf-8');
  configData = parse(configContent);
  logger.info('Конфигурация загружена из config.ini');
} catch (error) {
  logger.error('Ошибка загрузки config.ini:', error);
  // Используем значения по умолчанию
  configData = {
    AI: { provider: 'openrouter' },
    OpenRouter: {
      api_key: '',
      base_url: 'https://openrouter.ai/api/v1',
      model: 'mistralai/mistral-7b-instruct:free',
      embedding_model: 'text-embedding-3-small',
      max_tokens: '4000'
    }
  };
}

// Отладочная информация
logger.info('Загружаем конфигурацию...');
logger.info(`AI_PROVIDER: ${configData.AI?.provider}`);
      logger.info(`OPENROUTER_API_KEY: ${configData.OpenRouter?.api_key ? '***' : 'not set'}`);
logger.info(`OPENROUTER_BASE_URL: ${configData.OpenRouter?.base_url}`);
logger.info(`OPENROUTER_MODEL: ${configData.OpenRouter?.model}`);

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
  ai: {
    provider: 'openai' | 'openrouter' | 'zai';
    openai: {
      apiKey: string;
      model: string;
      embeddingModel: string;
      maxTokens: number;
    };
    openrouter: {
      baseUrl: string;
      apiKey: string;
      model: string;
      embeddingModel: string;
      maxTokens: number;
    };
    zai: {
      baseUrl: string;
      apiKey: string;
      model: string;
      embeddingModel: string;
      maxTokens: number;
    };
  };
  upload: {
    maxFileSize: number;
    allowedTypes: string[];
    uploadPath: string;
  };
  processing: {
    maxConcurrentJobs: number;
    jobTimeout: number;
    chunkSize: number;
    chunkOverlap: number;
  };
}

export const config: Config = {
  server: {
    port: parseInt(configData.Server?.port || '3005'),
    host: configData.Server?.host || '0.0.0.0',
    cors: {
      origin: ['http://localhost:3000'],
      credentials: true,
    },
  },
  vectra: {
    dataPath: configData.Vectra?.data_path || './data',
    indexName: configData.Vectra?.index_name || 'vectra',
  },
  ai: {
    provider: (configData.AI?.provider as 'openai' | 'openrouter' | 'zai') || 'openrouter',
    openai: {
      apiKey: configData.OpenAI?.api_key || '',
      model: configData.OpenAI?.model || 'gpt-4o-mini',
      embeddingModel: configData.OpenAI?.embedding_model || 'text-embedding-3-small',
      maxTokens: parseInt(configData.OpenAI?.max_tokens || '4000'),
    },
    openrouter: {
      baseUrl: configData.OpenRouter?.base_url || 'https://openrouter.ai/api/v1',
      apiKey: configData.OpenRouter?.api_key || '',
      model: configData.OpenRouter?.model || 'mistralai/mistral-7b-instruct:free',
      embeddingModel: configData.OpenRouter?.embedding_model || 'text-embedding-3-small',
      maxTokens: parseInt(configData.OpenRouter?.max_tokens || '4000'),
    },
    zai: {
      baseUrl: configData.ZAI?.base_url || 'https://api.zai.com',
      apiKey: configData.ZAI?.api_key || '',
      model: configData.ZAI?.model || 'glm-4.5-air',
      embeddingModel: configData.ZAI?.embedding_model || 'glm-4.5-air',
      maxTokens: parseInt(configData.ZAI?.max_tokens || '4000'),
    },
  },
  upload: {
    maxFileSize: parseInt(configData.Upload?.max_file_size || '10485760'),
    allowedTypes: (configData.Upload?.allowed_file_types || 'pdf,doc,docx,txt,html,md').split(','),
    uploadPath: configData.Upload?.upload_dir || './uploads',
  },
  processing: {
    maxConcurrentJobs: parseInt(configData.Processing?.max_concurrent_jobs || '3'),
    jobTimeout: parseInt(configData.Processing?.job_timeout || '300000'),
    chunkSize: parseInt(configData.Processing?.chunk_size || '1200'),
    chunkOverlap: parseInt(configData.Processing?.chunk_overlap || '200'),
  },
};
