import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { DatabaseService } from '../services/database.js';
// Redis удален - используется in-memory кеширование
import { CollectionScheduler } from '../services/collection-scheduler.js';
import { 
  CollectionConfigSchema,
  StartCollectionRequestSchema,
  StopCollectionRequestSchema,
  CollectionJobType,
} from '../types/collection-types.js';

// Request validation schemas
const GetDataPointsQuerySchema = z.object({
  machineId: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  variableType: z.enum(['P', 'Q', 'I', 'M', 'L']).optional(),
  variableAddress: z.coerce.number().optional(),
  limit: z.coerce.number().min(1).max(10000).default(1000),
});

const CreateConfigRequestSchema = CollectionConfigSchema.omit({ id: true });

export class CollectionController {
  constructor(
    private database: DatabaseService,
    private scheduler: CollectionScheduler
  ) {}

  // Health Check
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          database: this.database.isHealthy(),
          redis: 'disabled (using in-memory)',
          scheduler: this.scheduler.getStats(),
        },
        version: process.env.npm_package_version || '1.0.0',
      };

      res.json(health);
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Health check failed',
        error: error.message,
      });
    }
  };

  // Configuration Management
  getConfigurations = async (req: Request, res: Response): Promise<void> => {
    try {
      const configs = await this.database.getCollectionConfigs();
      res.json({
        success: true,
        data: configs,
        count: configs.length,
      });
    } catch (error) {
      logger.error('Failed to get configurations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get configurations',
        error: error.message,
      });
    }
  };

  getConfiguration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const config = await this.database.getCollectionConfig(id);
      
      if (!config) {
        res.status(404).json({
          success: false,
          message: 'Configuration not found',
        });
        return;
      }

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      logger.error('Failed to get configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get configuration',
        error: error.message,
      });
    }
  };

  createConfiguration = async (req: Request, res: Response): Promise<void> => {
    try {
      const configData = CreateConfigRequestSchema.parse(req.body);
      
      // Generate ID
      const config = {
        id: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...configData,
      };

      // Save to database first
      const savedConfig = await this.database.createCollectionConfig(config);
      
      // Add to scheduler
      await this.scheduler.addConfiguration(savedConfig);

      res.status(201).json({
        success: true,
        message: 'Configuration created successfully',
        data: savedConfig,
      });

      logger.info('Configuration created', { configId: config.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid configuration data',
          errors: error.errors,
        });
        return;
      }

      logger.error('Failed to create configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create configuration',
        error: error.message,
      });
    }
  };

  updateConfiguration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const configData = CreateConfigRequestSchema.parse(req.body);
      
      const config = {
        id,
        ...configData,
      };

      // Update in scheduler
      await this.scheduler.updateConfiguration(config);

      res.json({
        success: true,
        message: 'Configuration updated successfully',
        data: config,
      });

      logger.info('Configuration updated', { configId: config.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid configuration data',
          errors: error.errors,
        });
        return;
      }

      logger.error('Failed to update configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update configuration',
        error: error.message,
      });
    }
  };

  deleteConfiguration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Remove from scheduler
      await this.scheduler.removeConfiguration(id);

      res.json({
        success: true,
        message: 'Configuration deleted successfully',
      });

      logger.info('Configuration deleted', { configId: id });
    } catch (error) {
      logger.error('Failed to delete configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete configuration',
        error: error.message,
      });
    }
  };

  // Job Management
  startCollection = async (req: Request, res: Response): Promise<void> => {
    try {
      const requestData = StartCollectionRequestSchema.parse(req.body);
      
      const jobId = await this.scheduler.executeJobNow(requestData.configId);

      res.json({
        success: true,
        message: 'Collection started successfully',
        data: { jobId },
      });

      logger.info('Collection started manually', { 
        configId: requestData.configId,
        jobId,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: error.errors,
        });
        return;
      }

      logger.error('Failed to start collection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start collection',
        error: error.message,
      });
    }
  };

  stopCollection = async (req: Request, res: Response): Promise<void> => {
    try {
      const requestData = StopCollectionRequestSchema.parse(req.body);
      
      if (requestData.jobId) {
        await this.scheduler.stopJob(requestData.jobId, requestData.force);
        res.json({
          success: true,
          message: 'Job stopped successfully',
        });
      } else if (requestData.configId) {
        await this.scheduler.removeConfiguration(requestData.configId);
        res.json({
          success: true,
          message: 'Configuration stopped successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Either jobId or configId must be provided',
        });
        return;
      }

      logger.info('Collection stopped', requestData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: error.errors,
        });
        return;
      }

      logger.error('Failed to stop collection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stop collection',
        error: error.message,
      });
    }
  };

  getJobs = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const jobs = await this.database.getCollectionJobs(limit);
      
      res.json({
        success: true,
        data: jobs,
        count: jobs.length,
      });
    } catch (error) {
      logger.error('Failed to get jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get jobs',
        error: error.message,
      });
    }
  };

  getRunningJobs = async (req: Request, res: Response): Promise<void> => {
    try {
      const jobs = this.scheduler.getRunningJobs();
      
      res.json({
        success: true,
        data: jobs,
        count: jobs.length,
      });
    } catch (error) {
      logger.error('Failed to get running jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get running jobs',
        error: error.message,
      });
    }
  };

  // Data Access
  getDataPoints = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = GetDataPointsQuerySchema.parse(req.query);
      
      const dataPoints = await this.database.getDataPoints(
        query.machineId,
        new Date(query.startTime),
        new Date(query.endTime),
        query.variableType,
        query.variableAddress,
        query.limit
      );

      res.json({
        success: true,
        data: dataPoints,
        count: dataPoints.length,
        query: {
          machineId: query.machineId,
          startTime: query.startTime,
          endTime: query.endTime,
          variableType: query.variableType,
          variableAddress: query.variableAddress,
          limit: query.limit,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors,
        });
        return;
      }

      logger.error('Failed to get data points:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get data points',
        error: error.message,
      });
    }
  };

  // Statistics
  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      // Try to get cached stats first
      let stats = await this.redis.getCachedStats();
      
      if (!stats) {
        // Generate fresh stats
        const dbStats = await this.database.getCollectionStats();
        const schedulerStats = this.scheduler.getStats();
        
        stats = {
          database: dbStats,
          scheduler: schedulerStats,
          timestamp: new Date(),
        };
        
        // Cache for 1 minute
        await this.redis.cacheStats(stats);
      }

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get statistics',
        error: error.message,
      });
    }
  };

  // Utility endpoints
  getCollectionTypes = async (req: Request, res: Response): Promise<void> => {
    try {
      const types = Object.values(CollectionJobType);
      res.json({
        success: true,
        data: types,
      });
    } catch (error) {
      logger.error('Failed to get collection types:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get collection types',
        error: error.message,
      });
    }
  };

  cleanupOldData = async (req: Request, res: Response): Promise<void> => {
    try {
      const retentionDays = parseInt(req.query.retentionDays as string) || 30;
      const deletedRows = await this.database.cleanupOldData(retentionDays);
      
      res.json({
        success: true,
        message: 'Cleanup completed successfully',
        data: {
          deletedRows,
          retentionDays,
        },
      });

      logger.info('Manual cleanup completed', { deletedRows, retentionDays });
    } catch (error) {
      logger.error('Failed to cleanup old data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup old data',
        error: error.message,
      });
    }
  };
}
