import { z } from 'zod';

// Collection Job Status
export enum CollectionJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Collection Job Type
export enum CollectionJobType {
  VARIABLES = 'variables',
  STATUS = 'status',
  DIAGNOSTICS = 'diagnostics',
  SYSTEM_INFO = 'system_info'
}

// Collection Configuration
export const CollectionConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.nativeEnum(CollectionJobType),
  enabled: z.boolean().default(true),
  interval: z.number().min(100), // минимум 100ms
  batchSize: z.number().min(1).max(1000).default(100),
  timeout: z.number().min(1000).default(10000), // 10 секунд
  retryAttempts: z.number().min(0).max(5).default(3),
  retryDelay: z.number().min(1000).default(5000), // 5 секунд
  variables: z.array(z.object({
    type: z.enum(['P', 'Q', 'I', 'M', 'L']),
    address: z.number().min(0),
    name: z.string().optional(),
    description: z.string().optional(),
  })).optional(),
  metadata: z.record(z.any()).default({}),
});

export type CollectionConfig = z.infer<typeof CollectionConfigSchema>;

// Collection Job
export const CollectionJobSchema = z.object({
  id: z.string(),
  configId: z.string(),
  status: z.nativeEnum(CollectionJobStatus),
  type: z.nativeEnum(CollectionJobType),
  startTime: z.date(),
  endTime: z.date().optional(),
  duration: z.number().optional(), // milliseconds
  recordsCollected: z.number().default(0),
  errorMessage: z.string().optional(),
  retryCount: z.number().default(0),
  lastHeartbeat: z.date().optional(),
  metadata: z.record(z.any()).default({}),
});

export type CollectionJob = z.infer<typeof CollectionJobSchema>;

// Collection Stats
export const CollectionStatsSchema = z.object({
  totalJobs: z.number(),
  runningJobs: z.number(),
  successfulJobs: z.number(),
  failedJobs: z.number(),
  totalRecords: z.number(),
  avgDuration: z.number(), // milliseconds
  lastCollectionTime: z.date().optional(),
  uptimeSeconds: z.number(),
  collectionsPerSecond: z.number(),
  errorRate: z.number(), // percentage
});

export type CollectionStats = z.infer<typeof CollectionStatsSchema>;

// Data Point
export const DataPointSchema = z.object({
  timestamp: z.date(),
  machineId: z.string(),
  variableType: z.enum(['P', 'Q', 'I', 'M', 'L']),
  variableAddress: z.number(),
  value: z.number(),
  quality: z.string().optional(),
  collectionJobId: z.string().optional(),
  metadata: z.record(z.any()).default({}),
});

export type DataPoint = z.infer<typeof DataPointSchema>;

// Collection Request/Response Types
export const StartCollectionRequestSchema = z.object({
  configId: z.string(),
  immediate: z.boolean().default(false),
});

export type StartCollectionRequest = z.infer<typeof StartCollectionRequestSchema>;

export const StopCollectionRequestSchema = z.object({
  configId: z.string().optional(),
  jobId: z.string().optional(),
  force: z.boolean().default(false),
});

export type StopCollectionRequest = z.infer<typeof StopCollectionRequestSchema>;

export const CollectionStatusResponseSchema = z.object({
  jobs: z.array(CollectionJobSchema),
  stats: CollectionStatsSchema,
});

export type CollectionStatusResponse = z.infer<typeof CollectionStatusResponseSchema>;
