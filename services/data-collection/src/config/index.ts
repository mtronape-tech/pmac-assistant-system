import { config } from 'dotenv';
import { z } from 'zod';

config();

const ConfigSchema = z.object({
  // Server
  port: z.coerce.number().default(3002),
  host: z.string().default('0.0.0.0'),
  
  // PMAC Control Service
  pmacControl: z.object({
    baseUrl: z.string().default('http://localhost:3001'),
    enabled: z.boolean().default(true),
    timeout: z.coerce.number().default(5000),
  }),
  
  // Collection Settings
  collection: z.object({
    enabled: z.boolean().default(true),
    interval: z.coerce.number().default(1000), // ms
    batchSize: z.coerce.number().default(100),
    retentionDays: z.coerce.number().default(30),
    maxRetries: z.coerce.number().default(3),
  }),
  
  // Logging
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    format: z.enum(['json', 'simple']).default('json'),
  }),
});

export const appConfig = ConfigSchema.parse({
  port: process.env.PORT,
  host: process.env.HOST,
  
  pmacControl: {
    baseUrl: process.env.PMAC_CONTROL_BASE_URL,
    enabled: process.env.PMAC_CONTROL_ENABLED !== 'false',
    timeout: process.env.PMAC_CONTROL_TIMEOUT,
  },
  
  collection: {
    enabled: process.env.COLLECTION_ENABLED !== 'false',
    interval: process.env.COLLECTION_INTERVAL,
    batchSize: process.env.COLLECTION_BATCH_SIZE,
    retentionDays: process.env.COLLECTION_RETENTION_DAYS,
    maxRetries: process.env.COLLECTION_MAX_RETRIES,
  },
  
  logging: {
    level: process.env.LOG_LEVEL,
    format: process.env.LOG_FORMAT,
  },
});

export type AppConfig = z.infer<typeof ConfigSchema>;
