import { createClient, RedisClientType } from 'redis';
import { appConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { CollectionJob, CollectionConfig } from '../types/collection-types.js';

export class RedisService {
  private client: RedisClientType;
  private isConnected = false;

  constructor() {
    this.client = createClient({
      socket: {
        host: appConfig.redis.host,
        port: appConfig.redis.port,
      },
      password: appConfig.redis.password,
      database: appConfig.redis.db,
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Connected to Redis');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Disconnected from Redis');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('Redis connection established');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      logger.info('Disconnected from Redis');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  isHealthy(): boolean {
    return this.isConnected;
  }

  // Job Queue Operations
  async pushJob(queueName: string, job: CollectionJob): Promise<void> {
    try {
      await this.client.lPush(queueName, JSON.stringify(job));
      logger.debug(`Job pushed to queue ${queueName}`, { jobId: job.id });
    } catch (error) {
      logger.error(`Failed to push job to queue ${queueName}:`, error);
      throw error;
    }
  }

  async popJob(queueName: string, timeout: number = 10): Promise<CollectionJob | null> {
    try {
      const result = await this.client.brPop({ key: queueName, timeout });
      if (!result) return null;
      
      const job = JSON.parse(result.element) as CollectionJob;
      logger.debug(`Job popped from queue ${queueName}`, { jobId: job.id });
      return job;
    } catch (error) {
      logger.error(`Failed to pop job from queue ${queueName}:`, error);
      throw error;
    }
  }

  async getQueueLength(queueName: string): Promise<number> {
    try {
      return await this.client.lLen(queueName);
    } catch (error) {
      logger.error(`Failed to get queue length for ${queueName}:`, error);
      return 0;
    }
  }

  // Running Jobs Registry
  async setRunningJob(jobId: string, job: CollectionJob): Promise<void> {
    try {
      const key = `running_jobs:${jobId}`;
      await this.client.hSet(key, {
        id: job.id,
        configId: job.configId,
        status: job.status,
        type: job.type,
        startTime: job.startTime.toISOString(),
        recordsCollected: job.recordsCollected.toString(),
        retryCount: job.retryCount.toString(),
        metadata: JSON.stringify(job.metadata),
      });
      await this.client.expire(key, 24 * 60 * 60); // expire in 24 hours
      logger.debug(`Running job registered`, { jobId });
    } catch (error) {
      logger.error(`Failed to set running job ${jobId}:`, error);
      throw error;
    }
  }

  async getRunningJob(jobId: string): Promise<CollectionJob | null> {
    try {
      const key = `running_jobs:${jobId}`;
      const jobData = await this.client.hGetAll(key);
      
      if (!jobData || Object.keys(jobData).length === 0) return null;
      
      return {
        id: jobData.id,
        configId: jobData.configId,
        status: jobData.status as any,
        type: jobData.type as any,
        startTime: new Date(jobData.startTime),
        endTime: jobData.endTime ? new Date(jobData.endTime) : undefined,
        duration: jobData.duration ? parseInt(jobData.duration) : undefined,
        recordsCollected: parseInt(jobData.recordsCollected) || 0,
        errorMessage: jobData.errorMessage,
        retryCount: parseInt(jobData.retryCount) || 0,
        lastHeartbeat: jobData.lastHeartbeat ? new Date(jobData.lastHeartbeat) : undefined,
        metadata: jobData.metadata ? JSON.parse(jobData.metadata) : {},
      };
    } catch (error) {
      logger.error(`Failed to get running job ${jobId}:`, error);
      return null;
    }
  }

  async removeRunningJob(jobId: string): Promise<void> {
    try {
      const key = `running_jobs:${jobId}`;
      await this.client.del(key);
      logger.debug(`Running job removed`, { jobId });
    } catch (error) {
      logger.error(`Failed to remove running job ${jobId}:`, error);
      throw error;
    }
  }

  async getAllRunningJobs(): Promise<CollectionJob[]> {
    try {
      const keys = await this.client.keys('running_jobs:*');
      const jobs: CollectionJob[] = [];
      
      for (const key of keys) {
        const jobData = await this.client.hGetAll(key);
        if (jobData && Object.keys(jobData).length > 0) {
          jobs.push({
            id: jobData.id,
            configId: jobData.configId,
            status: jobData.status as any,
            type: jobData.type as any,
            startTime: new Date(jobData.startTime),
            endTime: jobData.endTime ? new Date(jobData.endTime) : undefined,
            duration: jobData.duration ? parseInt(jobData.duration) : undefined,
            recordsCollected: parseInt(jobData.recordsCollected) || 0,
            errorMessage: jobData.errorMessage,
            retryCount: parseInt(jobData.retryCount) || 0,
            lastHeartbeat: jobData.lastHeartbeat ? new Date(jobData.lastHeartbeat) : undefined,
            metadata: jobData.metadata ? JSON.parse(jobData.metadata) : {},
          });
        }
      }
      
      return jobs;
    } catch (error) {
      logger.error('Failed to get all running jobs:', error);
      return [];
    }
  }

  // Configuration Cache
  async cacheConfig(config: CollectionConfig): Promise<void> {
    try {
      const key = `config:${config.id}`;
      await this.client.set(key, JSON.stringify(config), { EX: 60 * 60 }); // expire in 1 hour
      logger.debug(`Config cached`, { configId: config.id });
    } catch (error) {
      logger.error(`Failed to cache config ${config.id}:`, error);
      throw error;
    }
  }

  async getCachedConfig(configId: string): Promise<CollectionConfig | null> {
    try {
      const key = `config:${configId}`;
      const configData = await this.client.get(key);
      
      if (!configData) return null;
      
      return JSON.parse(configData) as CollectionConfig;
    } catch (error) {
      logger.error(`Failed to get cached config ${configId}:`, error);
      return null;
    }
  }

  async removeCachedConfig(configId: string): Promise<void> {
    try {
      const key = `config:${configId}`;
      await this.client.del(key);
      logger.debug(`Config cache removed`, { configId });
    } catch (error) {
      logger.error(`Failed to remove cached config ${configId}:`, error);
      throw error;
    }
  }

  // Heartbeat Operations
  async updateHeartbeat(jobId: string): Promise<void> {
    try {
      const key = `running_jobs:${jobId}`;
      await this.client.hSet(key, 'lastHeartbeat', new Date().toISOString());
    } catch (error) {
      logger.error(`Failed to update heartbeat for job ${jobId}:`, error);
      throw error;
    }
  }

  // Statistics Cache
  async cacheStats(stats: any): Promise<void> {
    try {
      await this.client.set('collection_stats', JSON.stringify(stats), { EX: 60 }); // expire in 1 minute
    } catch (error) {
      logger.error('Failed to cache stats:', error);
      throw error;
    }
  }

  async getCachedStats(): Promise<any | null> {
    try {
      const statsData = await this.client.get('collection_stats');
      return statsData ? JSON.parse(statsData) : null;
    } catch (error) {
      logger.error('Failed to get cached stats:', error);
      return null;
    }
  }

  // Lock Operations
  async acquireLock(lockKey: string, ttl: number = 30): Promise<boolean> {
    try {
      const result = await this.client.set(lockKey, '1', { EX: ttl, NX: true });
      return result === 'OK';
    } catch (error) {
      logger.error(`Failed to acquire lock ${lockKey}:`, error);
      return false;
    }
  }

  async releaseLock(lockKey: string): Promise<void> {
    try {
      await this.client.del(lockKey);
    } catch (error) {
      logger.error(`Failed to release lock ${lockKey}:`, error);
      throw error;
    }
  }
}
