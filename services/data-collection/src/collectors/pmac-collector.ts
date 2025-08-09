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

      // Collect variables in batches to avoid overwhelming the PMAC
      const batchSize = Math.min(config.batchSize, 50);
      for (let i = 0; i < config.variables.length; i += batchSize) {
        const batch = config.variables.slice(i, i + batchSize);
        
        for (const variable of batch) {
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
                collectorType: 'pmac-variables',
              },
            });
            
            logger.debug('Variable collected', {
              type: variable.type,
              address: variable.address,
              value,
              jobId: job.id,
            });
          } catch (error) {
            logger.error('Failed to collect variable', {
              type: variable.type,
              address: variable.address,
              error: error.message,
              jobId: job.id,
            });
            
            // Add error data point with bad quality
            dataPoints.push({
              timestamp,
              machineId,
              variableType: variable.type,
              variableAddress: variable.address,
              value: 0,
              quality: 'bad',
              collectionJobId: job.id,
              metadata: {
                error: error.message,
                collectorType: 'pmac-variables',
              },
            });
          }
        }
        
        // Small delay between batches
        if (i + batchSize < config.variables.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      logger.info(`Collected ${dataPoints.length} variable data points`, { 
        jobId: job.id,
        configId: config.id 
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
            error: error.message,
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
    try {
      const response = await this.httpClient.get('/api/variable', {
        params: { type, address },
      });
      
      if (response.data && typeof response.data.value === 'number') {
        return response.data.value;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      logger.error(`Failed to read variable ${type}${address}:`, error);
      throw error;
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
        error: error.message,
      });
      throw error;
    }
  }
}
