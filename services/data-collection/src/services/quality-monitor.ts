import { logger } from '../utils/logger.js';
import { DatabaseService } from './database.js';
// Redis удален - используется in-memory кеширование
import { DataPoint } from '../types/collection-types.js';

export interface QualityMetrics {
  totalDataPoints: number;
  goodQualityPoints: number;
  badQualityPoints: number;
  qualityPercentage: number;
  averageLatency: number;
  errorRate: number;
  lastUpdated: Date;
}

export interface QualityAlert {
  id: string;
  type: 'quality_degradation' | 'high_error_rate' | 'data_gap' | 'connection_loss';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  machineId: string;
  variableType?: string;
  variableAddress?: number;
  timestamp: Date;
  acknowledged: boolean;
  metadata?: Record<string, any>;
}

export class QualityMonitor {
  private database: DatabaseService;
  private isRunning = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private qualityThresholds = {
    minQualityPercentage: 95, // минимум 95% хороших данных
    maxErrorRate: 5, // максимум 5% ошибок
    maxLatency: 5000, // максимум 5 секунд задержки
    dataGapThreshold: 60000, // 1 минута без данных считается проблемой
  };
  private alerts = new Map<string, QualityAlert>();

  constructor(database: DatabaseService) {
    this.database = database;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Quality monitor is already running');
      return;
    }

    logger.info('Starting data quality monitor');
    
    // Запускаем мониторинг каждые 30 секунд
    this.monitorInterval = setInterval(() => {
      this.performQualityCheck();
    }, 30000);

    this.isRunning = true;
    logger.info('Data quality monitor started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Quality monitor is not running');
      return;
    }

    logger.info('Stopping data quality monitor');

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    this.isRunning = false;
    logger.info('Data quality monitor stopped');
  }

  private async performQualityCheck(): Promise<void> {
    try {
      logger.debug('Performing data quality check');

      // Получаем список активных машин
      const activeMachines = await this.getActiveMachines();
      
      for (const machineId of activeMachines) {
        await this.checkMachineDataQuality(machineId);
      }

      logger.debug('Data quality check completed');
    } catch (error) {
      logger.error('Error during quality check:', error);
    }
  }

  private async getActiveMachines(): Promise<string[]> {
    try {
      // Получаем машины, которые отправляли данные за последние 5 минут
      const query = `
        SELECT DISTINCT machine_id
        FROM pmac_data
        WHERE timestamp >= NOW() - INTERVAL '5 minutes'
      `;
      
      const client = await this.database['pool'].connect();
      try {
        const result = await client.query(query);
        return result.rows.map(row => row.machine_id);
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Failed to get active machines:', error);
      return [];
    }
  }

  private async checkMachineDataQuality(machineId: string): Promise<void> {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 5 * 60 * 1000); // последние 5 минут

      // Получаем метрики качества
      const metrics = await this.calculateQualityMetrics(machineId, startTime, endTime);
      
      // Сохраняем метрики в Redis
      await this.redis.set(
        `quality_metrics:${machineId}`,
        JSON.stringify(metrics),
        { EX: 300 } // TTL 5 минут
      );

      // Проверяем пороги и создаем алерты
      await this.checkQualityThresholds(machineId, metrics);

      logger.debug('Quality metrics calculated', {
        machineId,
        qualityPercentage: metrics.qualityPercentage,
        errorRate: metrics.errorRate,
      });
    } catch (error) {
      logger.error(`Failed to check quality for machine ${machineId}:`, error);
    }
  }

  private async calculateQualityMetrics(
    machineId: string,
    startTime: Date,
    endTime: Date
  ): Promise<QualityMetrics> {
    const client = await this.database['pool'].connect();
    try {
      const query = `
        SELECT 
          COUNT(*) as total_points,
          COUNT(*) FILTER (WHERE quality = 'good') as good_points,
          COUNT(*) FILTER (WHERE quality = 'bad') as bad_points,
          AVG(EXTRACT(EPOCH FROM (NOW() - timestamp))) as avg_age_seconds
        FROM pmac_data
        WHERE machine_id = $1 
          AND timestamp >= $2 
          AND timestamp <= $3
      `;
      
      const result = await client.query(query, [machineId, startTime, endTime]);
      const row = result.rows[0];
      
      const totalPoints = parseInt(row.total_points) || 0;
      const goodPoints = parseInt(row.good_points) || 0;
      const badPoints = parseInt(row.bad_points) || 0;
      const avgAgeSeconds = parseFloat(row.avg_age_seconds) || 0;
      
      const qualityPercentage = totalPoints > 0 ? (goodPoints / totalPoints) * 100 : 100;
      const errorRate = totalPoints > 0 ? (badPoints / totalPoints) * 100 : 0;
      
      return {
        totalDataPoints: totalPoints,
        goodQualityPoints: goodPoints,
        badQualityPoints: badPoints,
        qualityPercentage,
        averageLatency: avgAgeSeconds * 1000, // конвертируем в миллисекунды
        errorRate,
        lastUpdated: new Date(),
      };
    } finally {
      client.release();
    }
  }

  private async checkQualityThresholds(
    machineId: string,
    metrics: QualityMetrics
  ): Promise<void> {
    // Проверка качества данных
    if (metrics.qualityPercentage < this.qualityThresholds.minQualityPercentage) {
      await this.createAlert({
        id: `quality_${machineId}_${Date.now()}`,
        type: 'quality_degradation',
        severity: metrics.qualityPercentage < 90 ? 'high' : 'medium',
        message: `Data quality degraded to ${metrics.qualityPercentage.toFixed(1)}% for machine ${machineId}`,
        machineId,
        timestamp: new Date(),
        acknowledged: false,
        metadata: { qualityPercentage: metrics.qualityPercentage },
      });
    }

    // Проверка уровня ошибок
    if (metrics.errorRate > this.qualityThresholds.maxErrorRate) {
      await this.createAlert({
        id: `error_rate_${machineId}_${Date.now()}`,
        type: 'high_error_rate',
        severity: metrics.errorRate > 15 ? 'critical' : 'high',
        message: `High error rate ${metrics.errorRate.toFixed(1)}% for machine ${machineId}`,
        machineId,
        timestamp: new Date(),
        acknowledged: false,
        metadata: { errorRate: metrics.errorRate },
      });
    }

    // Проверка задержки
    if (metrics.averageLatency > this.qualityThresholds.maxLatency) {
      await this.createAlert({
        id: `latency_${machineId}_${Date.now()}`,
        type: 'data_gap',
        severity: 'medium',
        message: `High data latency ${(metrics.averageLatency / 1000).toFixed(1)}s for machine ${machineId}`,
        machineId,
        timestamp: new Date(),
        acknowledged: false,
        metadata: { latency: metrics.averageLatency },
      });
    }

    // Проверка пропусков данных
    await this.checkDataGaps(machineId);
  }

  private async checkDataGaps(machineId: string): Promise<void> {
    try {
      const query = `
        SELECT MAX(timestamp) as last_data_time
        FROM pmac_data
        WHERE machine_id = $1
      `;
      
      const client = await this.database['pool'].connect();
      try {
        const result = await client.query(query, [machineId]);
        const lastDataTime = result.rows[0]?.last_data_time;
        
        if (lastDataTime) {
          const timeSinceLastData = Date.now() - new Date(lastDataTime).getTime();
          
          if (timeSinceLastData > this.qualityThresholds.dataGapThreshold) {
            await this.createAlert({
              id: `data_gap_${machineId}_${Date.now()}`,
              type: 'data_gap',
              severity: timeSinceLastData > 5 * 60 * 1000 ? 'critical' : 'high',
              message: `No data received for ${Math.round(timeSinceLastData / 60000)} minutes from machine ${machineId}`,
              machineId,
              timestamp: new Date(),
              acknowledged: false,
              metadata: { 
                timeSinceLastData,
                lastDataTime: new Date(lastDataTime),
              },
            });
          }
        }
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error(`Failed to check data gaps for machine ${machineId}:`, error);
    }
  }

  private async createAlert(alert: QualityAlert): Promise<void> {
    // Проверяем, не создавали ли мы уже подобный алерт недавно
    const existingAlertKey = `${alert.type}_${alert.machineId}`;
    const existingAlert = this.alerts.get(existingAlertKey);
    
    if (existingAlert && (Date.now() - existingAlert.timestamp.getTime()) < 60000) {
      // Не создаваем дубликат алерта в течение минуты
      return;
    }

    this.alerts.set(existingAlertKey, alert);

    // Сохраняем алерт в Redis
    await this.redis.set(
      `quality_alert:${alert.id}`,
      JSON.stringify(alert),
      { EX: 3600 } // TTL 1 час
    );

    // Логируем алерт
    logger.warn('Quality alert created', {
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      machineId: alert.machineId,
      message: alert.message,
    });

    // Здесь можно добавить отправку уведомлений (email, Slack, etc.)
  }

  // Публичные методы для получения информации о качестве
  async getQualityMetrics(machineId: string): Promise<QualityMetrics | null> {
    try {
      const cached = await this.redis.get(`quality_metrics:${machineId}`);
      if (cached) {
        return JSON.parse(cached);
      }
      
      // Если нет кэшированных данных, вычисляем на лету
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 5 * 60 * 1000);
      return await this.calculateQualityMetrics(machineId, startTime, endTime);
    } catch (error) {
      logger.error(`Failed to get quality metrics for ${machineId}:`, error);
      return null;
    }
  }

  async getActiveAlerts(): Promise<QualityAlert[]> {
    try {
      const alertKeys = await this.redis.keys('quality_alert:*');
      const alerts: QualityAlert[] = [];
      
      for (const key of alertKeys) {
        const alertData = await this.redis.get(key);
        if (alertData) {
          const alert = JSON.parse(alertData);
          if (!alert.acknowledged) {
            alerts.push(alert);
          }
        }
      }
      
      return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      logger.error('Failed to get active alerts:', error);
      return [];
    }
  }

  async acknowledgeAlert(alertId: string): Promise<boolean> {
    try {
      const alertData = await this.redis.get(`quality_alert:${alertId}`);
      if (alertData) {
        const alert: QualityAlert = JSON.parse(alertData);
        alert.acknowledged = true;
        
        await this.redis.set(
          `quality_alert:${alertId}`,
          JSON.stringify(alert),
          { EX: 3600 }
        );
        
        logger.info('Alert acknowledged', { alertId });
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Failed to acknowledge alert ${alertId}:`, error);
      return false;
    }
  }

  // Метод для валидации данных перед сохранением
  validateDataPoint(dataPoint: DataPoint): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Проверка временной метки
    const now = Date.now();
    const dataTime = dataPoint.timestamp.getTime();
    
    if (dataTime > now + 60000) { // данные из будущего
      issues.push('Timestamp is in the future');
    }
    
    if (now - dataTime > 24 * 60 * 60 * 1000) { // данные старше суток
      issues.push('Timestamp is too old');
    }
    
    // Проверка значения
    if (typeof dataPoint.value !== 'number' || !isFinite(dataPoint.value)) {
      issues.push('Invalid value (not a finite number)');
    }
    
    // Проверка диапазона значений (примерные границы для PMAC)
    if (Math.abs(dataPoint.value) > 1e10) {
      issues.push('Value is out of reasonable range');
    }
    
    // Проверка типа и адреса переменной
    if (!['P', 'Q', 'I', 'M', 'L'].includes(dataPoint.variableType)) {
      issues.push('Invalid variable type');
    }
    
    if (dataPoint.variableAddress < 0 || dataPoint.variableAddress > 99999) {
      issues.push('Variable address out of range');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  getStats(): {
    isRunning: boolean;
    activeAlerts: number;
    qualityThresholds: typeof this.qualityThresholds;
  } {
    return {
      isRunning: this.isRunning,
      activeAlerts: this.alerts.size,
      qualityThresholds: this.qualityThresholds,
    };
  }
}
