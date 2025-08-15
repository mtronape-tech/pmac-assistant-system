import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';
import { appConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { PMACCollector } from '../collectors/pmac-collector.js';
import {
  CollectionConfig,
  CollectionJob,
  CollectionJobStatus,
  CollectionJobType,
  DataPoint,
} from '../types/collection-types.js';

export interface SchedulerStats {
  totalJobsScheduled: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageExecutionTime: number;
  lastScheduledAt: Date | null;
}

export class CollectionScheduler {
  private collector: PMACCollector;
  private isRunning = false;
  private scheduledJobs = new Map<string, NodeJS.Timeout>();
  private cronJobs = new Map<string, cron.ScheduledTask>();
  private runningJobs = new Map<string, CollectionJob>();
  private configurations = new Map<string, CollectionConfig>();
  private dataPoints = new Map<string, DataPoint[]>();
  private completedJobs = new Map<string, CollectionJob>();
  private stats: SchedulerStats = {
    totalJobsScheduled: 0,
    activeJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    averageExecutionTime: 0,
    lastScheduledAt: null,
  };

  constructor(collector: PMACCollector) {
    this.collector = collector;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Collection scheduler is already running');
      return;
    }

    logger.info('Starting collection scheduler');
    
    try {
      // Load existing configurations from in-memory storage
      await this.loadConfigurations();
      
      // Start cleanup job for old data
      this.startCleanupJob();
      
      // Start heartbeat monitoring
      this.startHeartbeatMonitoring();
      
      this.isRunning = true;
      logger.info('Collection scheduler started successfully');
    } catch (error) {
      logger.error('Failed to start collection scheduler:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Collection scheduler is not running');
      return;
    }

    logger.info('Stopping collection scheduler');
    
    try {
      // Stop all scheduled jobs
      for (const [configId, timeout] of this.scheduledJobs) {
        clearTimeout(timeout);
        logger.debug(`Stopped scheduled job for config ${configId}`);
      }
      this.scheduledJobs.clear();

      // Stop all cron jobs
      for (const [configId, task] of this.cronJobs) {
        task.stop();
        logger.debug(`Stopped cron job for config ${configId}`);
      }
      this.cronJobs.clear();

      // Wait for running jobs to complete (with timeout)
      await this.waitForRunningJobs(30000); // 30 seconds timeout

      this.isRunning = false;
      logger.info('Collection scheduler stopped successfully');
    } catch (error) {
      logger.error('Error stopping collection scheduler:', error);
      throw error;
    }
  }

  async addConfiguration(config: CollectionConfig): Promise<void> {
    try {
      // Validate configuration
      if (!config.enabled) {
        logger.info(`Configuration ${config.id} is disabled, skipping scheduling`);
        return;
      }

      // Save to in-memory storage
      this.configurations.set(config.id, config);

      // Schedule the job
      await this.scheduleJob(config);
      
      logger.info(`Configuration added and scheduled`, { configId: config.id });
    } catch (error) {
      logger.error(`Failed to add configuration ${config.id}:`, error);
      throw error;
    }
  }

  async removeConfiguration(configId: string): Promise<void> {
    try {
      // Stop scheduled job
      const timeout = this.scheduledJobs.get(configId);
      if (timeout) {
        clearTimeout(timeout);
        this.scheduledJobs.delete(configId);
      }

      // Stop cron job
      const cronJob = this.cronJobs.get(configId);
      if (cronJob) {
        cronJob.stop();
        this.cronJobs.delete(configId);
      }

      // Remove from in-memory storage
      this.configurations.delete(configId);
      
      logger.info(`Configuration removed`, { configId });
    } catch (error) {
      logger.error(`Failed to remove configuration ${configId}:`, error);
      throw error;
    }
  }

  async updateConfiguration(config: CollectionConfig): Promise<void> {
    try {
      // Remove existing schedule
      await this.removeConfiguration(config.id);
      
      // Add new schedule
      await this.addConfiguration(config);
      
      logger.info(`Configuration updated`, { configId: config.id });
    } catch (error) {
      logger.error(`Failed to update configuration ${config.id}:`, error);
      throw error;
    }
  }

  async executeJobNow(configId: string): Promise<string> {
    try {
      const config = this.getConfiguration(configId);
      if (!config) {
        throw new Error(`Configuration not found: ${configId}`);
      }

      const job = this.createJob(config);
      await this.executeJob(job, config);
      
      return job.id;
    } catch (error) {
      logger.error(`Failed to execute job immediately for config ${configId}:`, error);
      throw error;
    }
  }

  async stopJob(jobId: string, force: boolean = false): Promise<void> {
    try {
      const job = this.runningJobs.get(jobId);
      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }

      if (force) {
        // Force stop - mark as cancelled
        job.status = CollectionJobStatus.CANCELLED;
        job.endTime = new Date();
        job.duration = job.endTime.getTime() - job.startTime.getTime();
        
        this.completedJobs.set(jobId, job);
        this.runningJobs.delete(jobId);
        
        logger.info(`Job force stopped`, { jobId });
      } else {
        // Graceful stop - just mark for stopping
        job.metadata.stopRequested = true;
        
        logger.info(`Job stop requested`, { jobId });
      }
    } catch (error) {
      logger.error(`Failed to stop job ${jobId}:`, error);
      throw error;
    }
  }

  getStats(): SchedulerStats {
    return { ...this.stats };
  }

  getRunningJobs(): CollectionJob[] {
    return Array.from(this.runningJobs.values());
  }

  getConfigurations(): CollectionConfig[] {
    return Array.from(this.configurations.values());
  }

  getConfiguration(configId: string): CollectionConfig | null {
    return this.configurations.get(configId) || null;
  }

  getDataPoints(configId?: string): DataPoint[] {
    if (configId) {
      return this.dataPoints.get(configId) || [];
    }
    return Array.from(this.dataPoints.values()).flat();
  }

  private async loadConfigurations(): Promise<void> {
    try {
      const configs = Array.from(this.configurations.values());
      
      for (const config of configs) {
        if (config.enabled) {
          await this.scheduleJob(config);
        }
      }
      
      logger.info(`Loaded ${configs.length} configurations, ${configs.filter(c => c.enabled).length} enabled`);
    } catch (error) {
      logger.error('Failed to load configurations:', error);
      throw error;
    }
  }

  private async scheduleJob(config: CollectionConfig): Promise<void> {
    try {
      if (config.interval >= 60000) {
        // For intervals >= 1 minute, use cron
        const cronExpression = this.intervalToCron(config.interval);
        const task = cron.schedule(cronExpression, async () => {
          const job = this.createJob(config);
          await this.executeJob(job, config);
        }, { scheduled: false });
        
        task.start();
        this.cronJobs.set(config.id, task);
        
        logger.debug(`Scheduled cron job for config ${config.id} with expression: ${cronExpression}`);
      } else {
        // For shorter intervals, use setTimeout with recursion
        const scheduleNext = () => {
          const timeout = setTimeout(async () => {
            try {
              const job = this.createJob(config);
              await this.executeJob(job, config);
            } catch (error) {
              logger.error(`Error in scheduled job for config ${config.id}:`, error);
            } finally {
              // Schedule next execution
              if (this.scheduledJobs.has(config.id)) {
                scheduleNext();
              }
            }
          }, config.interval);
          
          this.scheduledJobs.set(config.id, timeout);
        };
        
        scheduleNext();
        logger.debug(`Scheduled interval job for config ${config.id} with interval: ${config.interval}ms`);
      }
    } catch (error) {
      logger.error(`Failed to schedule job for config ${config.id}:`, error);
      throw error;
    }
  }

  private createJob(config: CollectionConfig): CollectionJob {
    return {
      id: uuidv4(),
      configId: config.id,
      status: CollectionJobStatus.PENDING,
      type: config.type,
      startTime: new Date(),
      recordsCollected: 0,
      retryCount: 0,
      metadata: {
        machineId: 'pmac-001',
        scheduledBy: 'scheduler',
      },
    };
  }

  private async executeJob(job: CollectionJob, config: CollectionConfig): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Update stats
      this.stats.totalJobsScheduled++;
      this.stats.activeJobs++;
      this.stats.lastScheduledAt = new Date();

      // Mark job as running
      job.status = CollectionJobStatus.RUNNING;
      job.lastHeartbeat = new Date();
      this.runningJobs.set(job.id, job);

      logger.info(`Starting job execution`, { jobId: job.id, configId: config.id });

      // Execute collection
      const dataPoints = await this.collector.executeCollection(config, job);
      
      // Check if stop was requested
      if (job.metadata.stopRequested) {
        job.status = CollectionJobStatus.CANCELLED;
        logger.info(`Job cancelled by request`, { jobId: job.id });
      } else {
        // Save collected data to in-memory storage
        if (dataPoints.length > 0) {
          const existingData = this.dataPoints.get(config.id) || [];
          this.dataPoints.set(config.id, [...existingData, ...dataPoints]);
        }

        // Mark job as successful
        job.status = CollectionJobStatus.SUCCESS;
        job.recordsCollected = dataPoints.length;
        
        logger.info(`Job completed successfully`, { 
          jobId: job.id, 
          configId: config.id,
          recordsCollected: dataPoints.length,
        });
      }
    } catch (error) {
      logger.error(`Job execution failed`, { 
        jobId: job.id, 
        configId: config.id,
        error: error instanceof Error ? error.message : String(error)
      });

      job.status = CollectionJobStatus.FAILED;
      job.errorMessage = error instanceof Error ? error.message : String(error);
      job.retryCount++;

      // Update stats
      this.stats.failedJobs++;

      // Retry logic
      if (job.retryCount < config.retryAttempts) {
        logger.info(`Scheduling retry for job`, { 
          jobId: job.id,
          retryCount: job.retryCount,
          maxRetries: config.retryAttempts 
        });
        
        setTimeout(() => {
          this.executeJob(job, config);
        }, config.retryDelay);
        return;
      }
    } finally {
      // Finalize job
      job.endTime = new Date();
      job.duration = job.endTime.getTime() - job.startTime.getTime();
      
      // Update stats
      this.stats.activeJobs--;
      if (job.status === CollectionJobStatus.SUCCESS) {
        this.stats.completedJobs++;
      }
      
      const executionTime = Date.now() - startTime;
      this.stats.averageExecutionTime = 
        (this.stats.averageExecutionTime * (this.stats.totalJobsScheduled - 1) + executionTime) / 
        this.stats.totalJobsScheduled;

      // Clean up
      this.completedJobs.set(job.id, job);
      this.runningJobs.delete(job.id);
    }
  }

  private intervalToCron(intervalMs: number): string {
    const seconds = Math.floor(intervalMs / 1000);
    
    if (seconds < 60) {
      return `*/${seconds} * * * * *`;
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `0 */${minutes} * * * *`;
    }
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `0 0 */${hours} * * *`;
    }
    
    const days = Math.floor(hours / 24);
    return `0 0 0 */${days} * *`;
  }

  private startCleanupJob(): void {
    // Run cleanup daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Starting daily cleanup job');
        const deletedCount = this.cleanupOldData(appConfig.collection.retentionDays);
        logger.info(`Cleanup completed, deleted ${deletedCount} old records`);
      } catch (error) {
        logger.error('Cleanup job failed:', error);
      }
    });
  }

  private cleanupOldData(retentionDays: number): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    let deletedCount = 0;
    
    // Clean up old data points
    for (const [configId, dataPoints] of this.dataPoints) {
      const filteredData = dataPoints.filter(dp => new Date(dp.timestamp) > cutoffDate);
      const deleted = dataPoints.length - filteredData.length;
      deletedCount += deleted;
      this.dataPoints.set(configId, filteredData);
    }
    
    // Clean up old completed jobs
    for (const [jobId, job] of this.completedJobs) {
      if (job.endTime && job.endTime < cutoffDate) {
        this.completedJobs.delete(jobId);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  private startHeartbeatMonitoring(): void {
    // Monitor heartbeats every 30 seconds
    setInterval(async () => {
      try {
        const runningJobs = Array.from(this.runningJobs.values());
        const now = Date.now();
        
        for (const job of runningJobs) {
          if (job.lastHeartbeat) {
            const timeSinceHeartbeat = now - job.lastHeartbeat.getTime();
            
            // If no heartbeat for 5 minutes, consider job stuck
            if (timeSinceHeartbeat > 5 * 60 * 1000) {
              logger.warn(`Job appears to be stuck, removing from running jobs`, {
                jobId: job.id,
                timeSinceHeartbeat,
              });
              
              job.status = CollectionJobStatus.FAILED;
              job.errorMessage = 'Job timeout - no heartbeat received';
              job.endTime = new Date();
              job.duration = job.endTime.getTime() - job.startTime.getTime();
              
              this.completedJobs.set(job.id, job);
              this.runningJobs.delete(job.id);
            }
          }
        }
      } catch (error) {
        logger.error('Heartbeat monitoring failed:', error);
      }
    }, 30000);
  }

  private async waitForRunningJobs(timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    
    while (this.runningJobs.size > 0) {
      if (Date.now() - startTime > timeoutMs) {
        logger.warn(`Timeout waiting for running jobs, ${this.runningJobs.size} jobs still running`);
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
