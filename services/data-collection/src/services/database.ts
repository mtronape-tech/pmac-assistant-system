import { Pool, PoolClient } from 'pg';
import { appConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { DataPoint, CollectionConfig, CollectionJob, CollectionStats } from '../types/collection-types.js';

export class DatabaseService {
  private pool: Pool;
  private isConnected = false;

  constructor() {
    this.pool = new Pool({
      host: appConfig.database.host,
      port: appConfig.database.port,
      database: appConfig.database.database,
      user: appConfig.database.username,
      password: appConfig.database.password,
      ssl: appConfig.database.ssl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('PostgreSQL pool error:', err);
    });
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.isConnected = true;
      logger.info('Connected to PostgreSQL database');
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to PostgreSQL:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      this.isConnected = false;
      logger.info('Disconnected from PostgreSQL database');
    } catch (error) {
      logger.error('Error disconnecting from PostgreSQL:', error);
      throw error;
    }
  }

  isHealthy(): boolean {
    return this.isConnected;
  }

  // Data Points Operations
  async saveDataPoint(dataPoint: DataPoint): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO pmac_data (
          time, machine_id, variable_type, variable_address, 
          value, quality, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      const values = [
        dataPoint.timestamp,
        dataPoint.machineId,
        dataPoint.variableType,
        dataPoint.variableAddress,
        dataPoint.value,
        dataPoint.quality,
        JSON.stringify(dataPoint.metadata),
      ];
      
      await client.query(query, values);
      logger.debug('Data point saved', { 
        machineId: dataPoint.machineId,
        variableType: dataPoint.variableType,
        variableAddress: dataPoint.variableAddress,
        value: dataPoint.value,
      });
    } finally {
      client.release();
    }
  }

  async saveDataPoints(dataPoints: DataPoint[]): Promise<void> {
    if (dataPoints.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const query = `
        INSERT INTO pmac_data (
          time, machine_id, variable_type, variable_address, 
          value, quality, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      for (const dataPoint of dataPoints) {
        const values = [
          dataPoint.timestamp,
          dataPoint.machineId,
          dataPoint.variableType,
          dataPoint.variableAddress,
          dataPoint.value,
          dataPoint.quality,
          JSON.stringify(dataPoint.metadata),
        ];
        await client.query(query, values);
      }
      
      await client.query('COMMIT');
      logger.info(`Saved ${dataPoints.length} data points in batch`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to save data points batch:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getDataPoints(
    machineId: string,
    startTime: Date,
    endTime: Date,
    variableType?: string,
    variableAddress?: number,
    limit: number = 1000
  ): Promise<DataPoint[]> {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT time, machine_id, variable_type, variable_address, 
               value, quality, metadata
        FROM pmac_data 
        WHERE machine_id = $1 AND time >= $2 AND time <= $3
      `;
      const params: any[] = [machineId, startTime, endTime];
      
      if (variableType) {
        query += ` AND variable_type = $${params.length + 1}`;
        params.push(variableType);
      }
      
      if (variableAddress !== undefined) {
        query += ` AND variable_address = $${params.length + 1}`;
        params.push(variableAddress);
      }
      
      query += ` ORDER BY time DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      
      const result = await client.query(query, params);
      
      return result.rows.map(row => ({
        timestamp: row.time,
        machineId: row.machine_id,
        variableType: row.variable_type,
        variableAddress: row.variable_address,
        value: row.value,
        quality: row.quality,
        collectionJobId: undefined, // Not stored in simplified schema
        metadata: row.metadata || {},
      }));
    } finally {
      client.release();
    }
  }

  // Collection Configuration Operations
  async saveCollectionConfig(config: CollectionConfig): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO collection_configs (
          id, name, type, enabled, interval_ms, batch_size, 
          timeout_ms, retry_attempts, retry_delay_ms, variables, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          enabled = EXCLUDED.enabled,
          interval_ms = EXCLUDED.interval_ms,
          batch_size = EXCLUDED.batch_size,
          timeout_ms = EXCLUDED.timeout_ms,
          retry_attempts = EXCLUDED.retry_attempts,
          retry_delay_ms = EXCLUDED.retry_delay_ms,
          variables = EXCLUDED.variables,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `;
      const values = [
        config.id,
        config.name,
        config.type,
        config.enabled,
        config.interval,
        config.batchSize,
        config.timeout,
        config.retryAttempts,
        config.retryDelay,
        JSON.stringify(config.variables || []),
        JSON.stringify(config.metadata),
      ];
      
      await client.query(query, values);
      logger.info('Collection config saved', { configId: config.id });
    } finally {
      client.release();
    }
  }

  async getCollectionConfigs(): Promise<CollectionConfig[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, name, type, enabled, interval_ms, batch_size,
               timeout_ms, retry_attempts, retry_delay_ms, variables, metadata
        FROM collection_configs
        ORDER BY name
      `;
      const result = await client.query(query);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        enabled: row.enabled,
        interval: row.interval_ms,
        batchSize: row.batch_size,
        timeout: row.timeout_ms,
        retryAttempts: row.retry_attempts,
        retryDelay: row.retry_delay_ms,
        variables: row.variables || [],
        metadata: row.metadata || {},
      }));
    } finally {
      client.release();
    }
  }

  async getCollectionConfig(id: string): Promise<CollectionConfig | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, name, type, enabled, interval_ms, batch_size,
               timeout_ms, retry_attempts, retry_delay_ms, variables, metadata
        FROM collection_configs
        WHERE id = $1
      `;
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        type: row.type,
        enabled: row.enabled,
        interval: row.interval_ms,
        batchSize: row.batch_size,
        timeout: row.timeout_ms,
        retryAttempts: row.retry_attempts,
        retryDelay: row.retry_delay_ms,
        variables: row.variables || [],
        metadata: row.metadata || {},
      };
    } finally {
      client.release();
    }
  }

  // Collection Job Operations
  async saveCollectionJob(job: CollectionJob): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO collection_jobs (
          id, config_id, status, type, start_time, end_time,
          duration_ms, records_collected, error_message, retry_count,
          last_heartbeat, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          end_time = EXCLUDED.end_time,
          duration_ms = EXCLUDED.duration_ms,
          records_collected = EXCLUDED.records_collected,
          error_message = EXCLUDED.error_message,
          retry_count = EXCLUDED.retry_count,
          last_heartbeat = EXCLUDED.last_heartbeat,
          metadata = EXCLUDED.metadata
      `;
      const values = [
        job.id,
        job.configId,
        job.status,
        job.type,
        job.startTime,
        job.endTime,
        job.duration,
        job.recordsCollected,
        job.errorMessage,
        job.retryCount,
        job.lastHeartbeat,
        JSON.stringify(job.metadata),
      ];
      
      await client.query(query, values);
    } finally {
      client.release();
    }
  }

  async getCollectionJobs(limit: number = 100): Promise<CollectionJob[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, config_id, status, type, start_time, end_time,
               duration_ms, records_collected, error_message, retry_count,
               last_heartbeat, metadata
        FROM collection_jobs
        ORDER BY start_time DESC
        LIMIT $1
      `;
      const result = await client.query(query, [limit]);
      
      return result.rows.map(row => ({
        id: row.id,
        configId: row.config_id,
        status: row.status,
        type: row.type,
        startTime: row.start_time,
        endTime: row.end_time,
        duration: row.duration_ms,
        recordsCollected: row.records_collected,
        errorMessage: row.error_message,
        retryCount: row.retry_count,
        lastHeartbeat: row.last_heartbeat,
        metadata: row.metadata || {},
      }));
    } finally {
      client.release();
    }
  }

  async getCollectionStats(): Promise<CollectionStats> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT 
          COUNT(*) as total_jobs,
          COUNT(*) FILTER (WHERE status = 'running') as running_jobs,
          COUNT(*) FILTER (WHERE status = 'success') as successful_jobs,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
          SUM(records_collected) as total_records,
          AVG(duration_ms) as avg_duration,
          MAX(start_time) as last_collection_time
        FROM collection_jobs
        WHERE start_time >= NOW() - INTERVAL '24 hours'
      `;
      const result = await client.query(query);
      const row = result.rows[0];
      
      const totalJobs = parseInt(row.total_jobs) || 0;
      const successfulJobs = parseInt(row.successful_jobs) || 0;
      const errorRate = totalJobs > 0 ? ((totalJobs - successfulJobs) / totalJobs) * 100 : 0;
      
      return {
        totalJobs,
        runningJobs: parseInt(row.running_jobs) || 0,
        successfulJobs,
        failedJobs: parseInt(row.failed_jobs) || 0,
        totalRecords: parseInt(row.total_records) || 0,
        avgDuration: parseFloat(row.avg_duration) || 0,
        lastCollectionTime: row.last_collection_time ? new Date(row.last_collection_time) : undefined,
        uptimeSeconds: process.uptime(),
        collectionsPerSecond: totalJobs > 0 ? totalJobs / (24 * 60 * 60) : 0,
        errorRate,
      };
    } finally {
      client.release();
    }
  }

  // Cleanup old data
  async cleanupOldData(retentionDays: number): Promise<number> {
    const client = await this.pool.connect();
    try {
      const query = `
        DELETE FROM pmac_data 
        WHERE timestamp < NOW() - INTERVAL '${retentionDays} days'
      `;
      const result = await client.query(query);
      const deletedRows = result.rowCount || 0;
      
      if (deletedRows > 0) {
        logger.info(`Cleaned up ${deletedRows} old data points older than ${retentionDays} days`);
      }
      
      return deletedRows;
    } finally {
      client.release();
    }
  }
}
