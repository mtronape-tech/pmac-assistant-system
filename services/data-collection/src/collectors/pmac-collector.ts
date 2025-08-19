import axios, { AxiosInstance } from 'axios';
import { appConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { 
  DataPoint, 
  CollectionConfig, 
  CollectionJob, 
  CollectionJobStatus,
  CollectionJobType 
} from '../types/collection-types.js';

// Интерфейс для расширенной ошибки
interface EnrichedError extends Error {
  originalError?: unknown;
  errorType?: string;
  retryable?: boolean;
  readTimeMs?: number;
}

export interface PMACVariable {
  type: 'P' | 'Q' | 'I' | 'M' | 'L';
  address: number;
  name?: string;
  description?: string;
}

export interface PMACStatus {
  isConnected: boolean;
  machineId: string;
  systemInfo: {
    version: string;
    uptime: number;
    cpuUsage: number;
    memoryUsage: number;
  };
  axisStatus: Record<number, {
    position: number;
    velocity: number;
    following: boolean;
    enabled: boolean;
  }>;
  variables: {
    P: Record<number, number>;
    Q: Record<number, number>;
    I: Record<number, number>;
    M: Record<number, number>;
    L: Record<number, number>;
  };
}

export class PMACCollector {
  private httpClient: AxiosInstance;
  private isConnected = false;
  private lastConnectionCheck = 0;
  private connectionCheckInterval = 5000; // 5 seconds

  constructor() {
    this.httpClient = axios.create({
      baseURL: appConfig.pmacControl.baseUrl,
      timeout: appConfig.pmacControl.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        logger.debug('PMAC API request', { 
          method: config.method, 
          url: config.url,
          data: config.data 
        });
        return config;
      },
      (error) => {
        logger.error('PMAC API request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.httpClient.interceptors.response.use(
      (response) => {
        logger.debug('PMAC API response', { 
          status: response.status,
          url: response.config.url 
        });
        return response;
      },
      (error) => {
        logger.error('PMAC API response error:', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  async checkConnection(): Promise<boolean> {
    const now = Date.now();
    
    // Throttle connection checks
    if (now - this.lastConnectionCheck < this.connectionCheckInterval) {
      return this.isConnected;
    }

    try {
      if (!appConfig.pmacControl.enabled) {
        logger.debug('PMAC Control is disabled');
        this.isConnected = false;
        return false;
      }

      const response = await this.httpClient.get('/api/status');
      this.isConnected = response.status === 200 && response.data?.isConnected === true;
      this.lastConnectionCheck = now;
      
      if (this.isConnected) {
        logger.debug('PMAC connection verified');
      } else {
        logger.warn('PMAC is not connected');
      }
      
      return this.isConnected;
    } catch (error) {
      this.isConnected = false;
      this.lastConnectionCheck = now;
      logger.error('Failed to check PMAC connection:', error);
      return false;
    }
  }

  async collectVariables(
    config: CollectionConfig,
    job: CollectionJob
  ): Promise<DataPoint[]> {
    try {
      if (!await this.checkConnection()) {
        throw new Error('PMAC is not connected');
      }

      if (!config.variables || config.variables.length === 0) {
        logger.warn('No variables configured for collection', { configId: config.id });
        return [];
      }

      const dataPoints: DataPoint[] = [];
      const timestamp = new Date();
      const machineId = job.metadata.machineId || 'pmac-001';

      // Улучшенная логика batch обработки с динамическим размером
      let batchSize = Math.min(config.batchSize, 50);
      let consecutiveErrors = 0;
      
      for (let i = 0; i < config.variables.length; i += batchSize) {
        // Проверяем, не запросили ли остановку задачи
        if (job.metadata.stopRequested) {
          logger.info('Collection stop requested, aborting variable collection', { jobId: job.id });
          break;
        }

        const batch = config.variables.slice(i, i + batchSize);
        let batchErrors = 0;
        
        // Используем Promise.allSettled для параллельного чтения переменных в batch
        const batchPromises = batch.map(async (variable) => {
          try {
            const startTime = Date.now();
            const value = await this.readVariable(variable.type, variable.address);
            const readTime = Date.now() - startTime;
            
            return {
              success: true,
              dataPoint: {
                timestamp: new Date(), // Более точная временная метка для каждой переменной
                machineId,
                variableType: variable.type,
                variableAddress: variable.address,
                value,
                quality: 'good',
                collectionJobId: job.id,
                metadata: {
                  variableName: variable.name,
                  variableDescription: variable.description,
                  collectorType: 'pmac-variables',
                  readTimeMs: readTime,
                },
              } as DataPoint,
              variable,
            };
          } catch (error) {
            return {
              success: false,
              error,
              variable,
              dataPoint: {
                timestamp: new Date(),
                machineId,
                variableType: variable.type,
                variableAddress: variable.address,
                value: 0,
                quality: 'bad',
                collectionJobId: job.id,
                metadata: {
                  error: error instanceof Error ? error.message : String(error),
                  collectorType: 'pmac-variables',
                },
              } as DataPoint,
            };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            const { success, dataPoint, variable, error } = result.value;
            dataPoints.push(dataPoint);
            
            if (!success) {
              batchErrors++;
              consecutiveErrors++;
              logger.error('Failed to collect variable', {
                type: variable.type,
                address: variable.address,
                error: error instanceof Error ? error.message : String(error),
                jobId: job.id,
              });
            } else {
              consecutiveErrors = 0; // Сбрасываем счетчик при успешном чтении
              logger.debug('Variable collected', {
                type: variable.type,
                address: variable.address,
                value: dataPoint.value,
                readTimeMs: dataPoint.metadata.readTimeMs,
                jobId: job.id,
              });
            }
          } else {
            batchErrors++;
            consecutiveErrors++;
            logger.error('Batch promise rejected:', result.reason);
          }
        }
        
        // Адаптивная логика размера batch
        if (batchErrors > batch.length * 0.5) {
          // Если более 50% переменных в batch не удалось прочитать, уменьшаем размер
          batchSize = Math.max(1, Math.floor(batchSize * 0.7));
          logger.warn('High error rate in batch, reducing batch size', { 
            newBatchSize: batchSize,
            batchErrors,
            batchSize: batch.length 
          });
        } else if (batchErrors === 0 && batchSize < config.batchSize) {
          // Если batch успешен и размер меньше настроенного, увеличиваем
          batchSize = Math.min(config.batchSize, batchSize + 5);
        }
        
        // Прерываем сбор, если слишком много последовательных ошибок
        if (consecutiveErrors > 20) {
          logger.error('Too many consecutive errors, stopping variable collection', {
            consecutiveErrors,
            jobId: job.id,
          });
          throw new Error(`Too many consecutive read errors: ${consecutiveErrors}`);
        }
        
        // Динамическая задержка между batch в зависимости от ошибок
        if (i + batchSize < config.variables.length) {
          const delay = batchErrors > 0 ? 50 + (batchErrors * 10) : 10;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      const goodPoints = dataPoints.filter(dp => dp.quality === 'good').length;
      const successRate = dataPoints.length > 0 ? (goodPoints / dataPoints.length) * 100 : 0;

      logger.info(`Collected ${dataPoints.length} variable data points`, { 
        jobId: job.id,
        configId: config.id,
        goodPoints,
        successRate: `${successRate.toFixed(1)}%`,
      });
      
      return dataPoints;
    } catch (error) {
      logger.error('Failed to collect variables:', error);
      throw error;
    }
  }

  async collectStatus(
    config: CollectionConfig,
    job: CollectionJob
  ): Promise<DataPoint[]> {
    try {
      if (!await this.checkConnection()) {
        throw new Error('PMAC is not connected');
      }

      const status = await this.getStatus();
      const dataPoints: DataPoint[] = [];
      const timestamp = new Date();
      const machineId = status.machineId;

      // Collect system info as data points
      dataPoints.push(
        {
          timestamp,
          machineId,
          variableType: 'I',
          variableAddress: 9999, // Special address for CPU usage
          value: status.systemInfo.cpuUsage,
          quality: 'good',
          collectionJobId: job.id,
          metadata: {
            metric: 'cpu_usage',
            collectorType: 'pmac-status',
          },
        },
        {
          timestamp,
          machineId,
          variableType: 'I',
          variableAddress: 9998, // Special address for memory usage
          value: status.systemInfo.memoryUsage,
          quality: 'good',
          collectionJobId: job.id,
          metadata: {
            metric: 'memory_usage',
            collectorType: 'pmac-status',
          },
        },
        {
          timestamp,
          machineId,
          variableType: 'I',
          variableAddress: 9997, // Special address for uptime
          value: status.systemInfo.uptime,
          quality: 'good',
          collectionJobId: job.id,
          metadata: {
            metric: 'uptime',
            collectorType: 'pmac-status',
          },
        }
      );

      // Collect axis status
      for (const [axisNum, axisStatus] of Object.entries(status.axisStatus)) {
        const axisNumber = parseInt(axisNum);
        
        dataPoints.push(
          {
            timestamp,
            machineId,
            variableType: 'P',
            variableAddress: axisNumber * 100 + 1, // Position
            value: axisStatus.position,
            quality: 'good',
            collectionJobId: job.id,
            metadata: {
              axis: axisNumber,
              metric: 'position',
              collectorType: 'pmac-status',
            },
          },
          {
            timestamp,
            machineId,
            variableType: 'P',
            variableAddress: axisNumber * 100 + 2, // Velocity
            value: axisStatus.velocity,
            quality: 'good',
            collectionJobId: job.id,
            metadata: {
              axis: axisNumber,
              metric: 'velocity',
              collectorType: 'pmac-status',
            },
          },
          {
            timestamp,
            machineId,
            variableType: 'P',
            variableAddress: axisNumber * 100 + 3, // Following
            value: axisStatus.following ? 1 : 0,
            quality: 'good',
            collectionJobId: job.id,
            metadata: {
              axis: axisNumber,
              metric: 'following',
              collectorType: 'pmac-status',
            },
          },
          {
            timestamp,
            machineId,
            variableType: 'P',
            variableAddress: axisNumber * 100 + 4, // Enabled
            value: axisStatus.enabled ? 1 : 0,
            quality: 'good',
            collectionJobId: job.id,
            metadata: {
              axis: axisNumber,
              metric: 'enabled',
              collectorType: 'pmac-status',
            },
          }
        );
      }

      logger.info(`Collected ${dataPoints.length} status data points`, { 
        jobId: job.id,
        configId: config.id,
        machineId 
      });
      
      return dataPoints;
    } catch (error) {
      logger.error('Failed to collect status:', error);
      throw error;
    }
  }

  async collectDiagnostics(
    config: CollectionConfig,
    job: CollectionJob
  ): Promise<DataPoint[]> {
    try {
      if (!await this.checkConnection()) {
        throw new Error('PMAC is not connected');
      }

      // This would collect diagnostic information
      // For now, we'll collect some basic diagnostic variables
      const diagnosticVariables: PMACVariable[] = [
        { type: 'I', address: 1, name: 'ServoRate', description: 'Servo interrupt rate' },
        { type: 'I', address: 2, name: 'Phase1Rate', description: 'Phase 1 interrupt rate' },
        { type: 'I', address: 3, name: 'Phase2Rate', description: 'Phase 2 interrupt rate' },
        { type: 'I', address: 10, name: 'ServoPeriod', description: 'Servo period in microseconds' },
        { type: 'I', address: 58, name: 'TimerA', description: 'Timer A period' },
        { type: 'I', address: 59, name: 'TimerB', description: 'Timer B period' },
      ];

      const dataPoints: DataPoint[] = [];
      const timestamp = new Date();
      const machineId = job.metadata.machineId || 'pmac-001';

      for (const variable of diagnosticVariables) {
        try {
          const value = await this.readVariable(variable.type, variable.address);
          
          dataPoints.push({
            timestamp,
            machineId,
            variableType: variable.type,
            variableAddress: variable.address,
            value,
            quality: 'good',
            collectionJobId: job.id,
            metadata: {
              variableName: variable.name,
              variableDescription: variable.description,
              collectorType: 'pmac-diagnostics',
            },
          });
        } catch (error) {
          logger.error('Failed to collect diagnostic variable', {
            type: variable.type,
            address: variable.address,
            error: error instanceof Error ? error.message : String(error),
            jobId: job.id,
          });
        }
      }

      logger.info(`Collected ${dataPoints.length} diagnostic data points`, { 
        jobId: job.id,
        configId: config.id 
      });
      
      return dataPoints;
    } catch (error) {
      logger.error('Failed to collect diagnostics:', error);
      throw error;
    }
  }

  private async readVariable(type: string, address: number): Promise<number> {
    const startTime = Date.now();
    
    try {
      const response = await this.httpClient.get('/api/variable', {
        params: { type, address },
        timeout: 3000, // 3 секунды таймаут для одной переменной
      });
      
      const readTime = Date.now() - startTime;
      
      if (response.data && typeof response.data.value === 'number') {
        // Проверяем разумность значения
        const value = response.data.value;
        
        if (!isFinite(value)) {
          throw new Error(`Invalid value: ${value} (not finite)`);
        }
        
        // Логируем медленные чтения
        if (readTime > 1000) {
          logger.warn('Slow variable read detected', {
            variable: `${type}${address}`,
            readTimeMs: readTime,
          });
        }
        
        return value;
      } else {
        throw new Error(`Invalid response format: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      const readTime = Date.now() - startTime;
      
      // Классифицируем ошибки для лучшей обработки
      let errorType = 'unknown';
      let retryable = false;
      
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ECONNREFUSED') {
        errorType = 'connection_refused';
        retryable = true;
      } else if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOTFOUND') {
        errorType = 'host_not_found';
        retryable = false;
      } else if ((error && typeof error === 'object' && 'code' in error && error.code === 'ETIMEDOUT') || 
                 (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.includes('timeout'))) {
        errorType = 'timeout';
        retryable = true;
      } else if (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'status' in error.response && Number(error.response.status) >= 500) {
        errorType = 'server_error';
        retryable = true;
      } else if (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'status' in error.response && Number(error.response.status) === 404) {
        errorType = 'variable_not_found';
        retryable = false;
      } else if (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'status' in error.response && Number(error.response.status) >= 400) {
        errorType = 'client_error';
        retryable = false;
      }
      
      logger.error(`Failed to read variable ${type}${address}:`, {
        error: error instanceof Error ? error.message : String(error),
        errorType,
        retryable,
        readTimeMs: readTime,
        status: error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'status' in error.response ? error.response.status : undefined,
      });
      
      // Обогащаем ошибку информацией для принятия решений выше
      const enrichedError = new Error(error instanceof Error ? error.message : String(error)) as EnrichedError;
      enrichedError.originalError = error;
      enrichedError.errorType = errorType;
      enrichedError.retryable = retryable;
      enrichedError.readTimeMs = readTime;
      
      throw enrichedError;
    }
  }

  private async getStatus(): Promise<PMACStatus> {
    try {
      const response = await this.httpClient.get('/api/status');
      
      if (!response.data) {
        throw new Error('No status data received');
      }
      
      return response.data as PMACStatus;
    } catch (error) {
      logger.error('Failed to get PMAC status:', error);
      throw error;
    }
  }

  async executeCollection(
    config: CollectionConfig,
    job: CollectionJob
  ): Promise<DataPoint[]> {
    logger.info('Starting collection', { 
      jobId: job.id,
      configId: config.id,
      type: config.type 
    });

    try {
      let dataPoints: DataPoint[] = [];

      switch (config.type) {
        case CollectionJobType.VARIABLES:
          dataPoints = await this.collectVariables(config, job);
          break;
        case CollectionJobType.STATUS:
          dataPoints = await this.collectStatus(config, job);
          break;
        case CollectionJobType.DIAGNOSTICS:
          dataPoints = await this.collectDiagnostics(config, job);
          break;
        case CollectionJobType.SYSTEM_INFO:
          // System info collection would be implemented here
          dataPoints = await this.collectStatus(config, job);
          break;
        default:
          throw new Error(`Unsupported collection type: ${config.type}`);
      }

      logger.info('Collection completed successfully', {
        jobId: job.id,
        configId: config.id,
        dataPointsCollected: dataPoints.length,
      });

      return dataPoints;
    } catch (error) {
      logger.error('Collection failed', {
        jobId: job.id,
        configId: config.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
