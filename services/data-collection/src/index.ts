import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { appConfig } from './config/index.js';
import { logger } from './utils/logger.js';
import { DatabaseService } from './services/database.js';
// Redis удален - используется in-memory кеширование
import { CollectionScheduler } from './services/collection-scheduler.js';
import { PMACCollector } from './collectors/pmac-collector.js';
import { CollectionController } from './controllers/collection-controller.js';
import { WebSocketStreamer } from './services/websocket-streamer.js';
import { QualityMonitor } from './services/quality-monitor.js';

class DataCollectionServer {
  private app: express.Application;
  private server: any;
  private database: DatabaseService;
  private scheduler: CollectionScheduler;
  private collector: PMACCollector;
  private controller: CollectionController;
  private wsStreamer: WebSocketStreamer;
  private qualityMonitor: QualityMonitor;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.database = new DatabaseService();
    this.collector = new PMACCollector();
    this.scheduler = new CollectionScheduler(this.database, this.collector);
    this.controller = new CollectionController(this.database, this.scheduler);
    this.wsStreamer = new WebSocketStreamer(this.server, this.database);
    this.qualityMonitor = new QualityMonitor(this.database);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', this.controller.healthCheck);
    this.app.get('/api/health', this.controller.healthCheck);

    // Configuration management
    this.app.get('/api/configurations', this.controller.getConfigurations);
    this.app.get('/api/configurations/:id', this.controller.getConfiguration);
    this.app.post('/api/configurations', this.controller.createConfiguration);
    this.app.put('/api/configurations/:id', this.controller.updateConfiguration);
    this.app.delete('/api/configurations/:id', this.controller.deleteConfiguration);

    // Job management
    this.app.post('/api/collections/start', this.controller.startCollection);
    this.app.post('/api/collections/stop', this.controller.stopCollection);
    this.app.get('/api/jobs', this.controller.getJobs);
    this.app.get('/api/jobs/running', this.controller.getRunningJobs);

    // Data access
    this.app.get('/api/data-points', this.controller.getDataPoints);

    // Statistics
    this.app.get('/api/stats', this.controller.getStats);

    // WebSocket stats
    this.app.get('/api/websocket/stats', (req, res) => {
      const stats = this.wsStreamer.getStats();
      res.json({
        success: true,
        data: stats,
      });
    });

    // Quality monitoring endpoints
    this.app.get('/api/quality/metrics/:machineId', async (req, res) => {
      try {
        const metrics = await this.qualityMonitor.getQualityMetrics(req.params.machineId);
        res.json({
          success: true,
          data: metrics,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Failed to get quality metrics',
          error: error.message,
        });
      }
    });

    this.app.get('/api/quality/alerts', async (req, res) => {
      try {
        const alerts = await this.qualityMonitor.getActiveAlerts();
        res.json({
          success: true,
          data: alerts,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Failed to get alerts',
          error: error.message,
        });
      }
    });

    this.app.post('/api/quality/alerts/:alertId/acknowledge', async (req, res) => {
      try {
        const success = await this.qualityMonitor.acknowledgeAlert(req.params.alertId);
        res.json({
          success,
          message: success ? 'Alert acknowledged' : 'Alert not found',
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Failed to acknowledge alert',
          error: error.message,
        });
      }
    });

    this.app.get('/api/quality/stats', (req, res) => {
      const stats = this.qualityMonitor.getStats();
      res.json({
        success: true,
        data: stats,
      });
    });

    // Utility endpoints
    this.app.get('/api/collection-types', this.controller.getCollectionTypes);
    this.app.post('/api/cleanup', this.controller.cleanupOldData);

    // API documentation
    this.app.get('/api', (req, res) => {
      res.json({
        service: 'Data Collection Service',
        version: process.env.npm_package_version || '1.0.0',
        endpoints: {
          health: 'GET /health, GET /api/health',
          configurations: {
            list: 'GET /api/configurations',
            get: 'GET /api/configurations/:id',
            create: 'POST /api/configurations',
            update: 'PUT /api/configurations/:id',
            delete: 'DELETE /api/configurations/:id',
          },
          collections: {
            start: 'POST /api/collections/start',
            stop: 'POST /api/collections/stop',
          },
          jobs: {
            list: 'GET /api/jobs',
            running: 'GET /api/jobs/running',
          },
          data: {
            dataPoints: 'GET /api/data-points',
          },
          statistics: 'GET /api/stats',
          utilities: {
            collectionTypes: 'GET /api/collection-types',
            cleanup: 'POST /api/cleanup',
          },
        },
        documentation: 'See README.md for detailed API documentation',
      });
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'PMAC Assistant - Data Collection Service',
        status: 'running',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date().toISOString(),
        api: '/api',
        health: '/health',
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        availableEndpoints: '/api',
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.url,
      });

      if (res.headersSent) {
        return next(err);
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled Promise Rejection:', reason);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  }

  async start(): Promise<void> {
    try {
      logger.info('Starting Data Collection Service');

      // Connect to services
      logger.info('Connecting to database...');
      await this.database.connect();

      logger.info('Redis отключен - используется in-memory кеширование');

      // Start scheduler if collection is enabled
      if (appConfig.collection.enabled) {
        logger.info('Starting collection scheduler...');
        await this.scheduler.start();
      } else {
        logger.info('Collection is disabled in configuration');
      }

      // Start WebSocket streamer
      logger.info('Starting WebSocket streamer...');
      await this.wsStreamer.start();

      // Start quality monitor
      logger.info('Starting quality monitor...');
      await this.qualityMonitor.start();

      // Start HTTP server
      this.server.listen(appConfig.port, appConfig.host, () => {
        logger.info(`Data Collection Service listening on ${appConfig.host}:${appConfig.port}`);
        logger.info(`WebSocket endpoint available at ws://${appConfig.host}:${appConfig.port}/ws/data-stream`);
      });

      // Graceful shutdown
      const gracefulShutdown = async (signal: string) => {
        logger.info(`Received ${signal}, starting graceful shutdown...`);

        this.server.close(async () => {
          try {
            logger.info('Stopping quality monitor...');
            await this.qualityMonitor.stop();

            logger.info('Stopping WebSocket streamer...');
            await this.wsStreamer.stop();

            if (appConfig.collection.enabled) {
              logger.info('Stopping collection scheduler...');
              await this.scheduler.stop();
            }

            logger.info('Redis отключен - нечего отключать');

            logger.info('Disconnecting from database...');
            await this.database.disconnect();

            logger.info('Graceful shutdown completed');
            process.exit(0);
          } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
          }
        });
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));

      logger.info('Data Collection Service started successfully');
    } catch (error) {
      logger.error('Failed to start Data Collection Service:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new DataCollectionServer();
server.start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
