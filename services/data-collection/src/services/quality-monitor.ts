import { logger } from '../utils/logger.js';
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
  private isRunning = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private qualityThresholds = {
    minQualityPercentage: 95, // минимум 95% хороших данных
    maxErrorRate: 5, // максимум 5% ошибок
    maxLatency: 5000, // максимум 5 секунд задержки
    dataGapThreshold: 60000, // 1 минута без данных считается проблемой
  };
  private alerts = new Map<string, QualityAlert>();

  constructor() {}

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
      // For now, return a default machine since we don't have access to data
      // In a real implementation, this would get machines from the scheduler
      return ['pmac-001'];
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
    try {
      // For now, return default metrics since we don't have access to data
      // In a real implementation, this would calculate metrics from actual data
      return {
        totalDataPoints: 0,
        goodQualityPoints: 0,
        badQualityPoints: 0,
        qualityPercentage: 100,
        averageLatency: 0,
        errorRate: 0,
        lastUpdated: new Date(),
      };
    } catch (error) {
      logger.error('Failed to calculate quality metrics:', error);
      return {
        totalDataPoints: 0,
        goodQualityPoints: 0,
        badQualityPoints: 0,
        qualityPercentage: 0,
        averageLatency: 0,
        errorRate: 100,
        lastUpdated: new Date(),
      };
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
      // For now, skip data gap checking since we don't have access to data
      // In a real implementation, this would check for gaps in actual data
      logger.debug('Data gap checking skipped - no data access');
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
      // For now, calculate metrics on demand since we don't have Redis
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
      // Return alerts from in-memory storage
      const alerts = Array.from(this.alerts.values()).filter(alert => !alert.acknowledged);
      return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      logger.error('Failed to get active alerts:', error);
      return [];
    }
  }

  async acknowledgeAlert(alertId: string): Promise<boolean> {
    try {
      // Find alert in in-memory storage
      for (const [key, alert] of this.alerts) {
        if (alert.id === alertId) {
          alert.acknowledged = true;
          logger.info('Alert acknowledged', { alertId });
          return true;
        }
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
