import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import type { 
  PMACVariableType, 
  PMACStatus, 
  PMACDataPoint,
  PMACConnection,
  DriveStatus
} from '../types/pmac-types.js';

export interface PMACVariable {
  type: PMACVariableType;
  address: number;
  value: number;
  lastModified: Date;
  readOnly: boolean;
  description?: string;
}

export interface PMACAxis {
  name: string;
  position: number;
  velocity: number;
  acceleration: number;
  followingError: number;
  enabled: boolean;
  homed: boolean;
  inPosition: boolean;
  limits: {
    positive: boolean;
    negative: boolean;
    software: {
      positive: number;
      negative: number;
    };
  };
  fault: boolean;
  faultCode?: string;
}

export class AdvancedPMACSimulator extends EventEmitter {
  private variables: Map<string, PMACVariable> = new Map();
  private axes: Map<string, PMACAxis> = new Map();
  private drives: DriveStatus[] = [];
  private controllerState: 'idle' | 'running' | 'error' | 'homing' | 'programming' = 'idle';
  private connectionState: 'connected' | 'disconnected' | 'error' = 'disconnected';
  private startTime: Date = new Date();
  private errorCodes: string[] = [];
  private systemData = {
    temperature: 25.0,
    voltage: 24.0,
    current: 0.0,
    cpuUsage: 0.0,
    memoryUsage: 0.0,
  };

  private updateInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.initializeVariables();
    this.initializeAxes();
    this.initializeDrives();
    this.startSimulation();
  }

  private initializeVariables(): void {
    // Инициализируем P-переменные (глобальные параметры)
    for (let addr = 1; addr <= 8191; addr++) {
      this.createVariable('P', addr, Math.random() * 1000, {
        description: `Глобальная переменная P${addr}`,
        readOnly: addr > 8000, // P8001-P8191 только для чтения
      });
    }

    // Q-переменные (локальные переменные)
    for (let addr = 1; addr <= 8191; addr++) {
      this.createVariable('Q', addr, Math.random() * 100, {
        description: `Локальная переменная Q${addr}`,
      });
    }

    // I-переменные (системные переменные)
    for (let addr = 1; addr <= 8191; addr++) {
      this.createVariable('I', addr, Math.random() * 1000, {
        description: `Системная переменная I${addr}`,
        readOnly: addr < 100, // I1-I99 критически важные
      });
    }

    // M-переменные (переменные движения)
    for (let addr = 1; addr <= 8191; addr++) {
      this.createVariable('M', addr, Math.random() * 500, {
        description: `Переменная движения M${addr}`,
      });
    }

    // L-переменные (переменные координат)
    for (let addr = 1; addr <= 8191; addr++) {
      this.createVariable('L', addr, Math.random() * 100, {
        description: `Переменная координат L${addr}`,
      });
    }

    logger.info(`Инициализировано ${this.variables.size} переменных PMAC`);
  }

  private createVariable(
    type: PMACVariableType, 
    address: number, 
    value: number, 
    options: { description?: string; readOnly?: boolean } = {}
  ): void {
    const key = `${type}${address}`;
    const variable: PMACVariable = {
      type,
      address,
      value,
      lastModified: new Date(),
      readOnly: options.readOnly || false,
      description: options.description,
    };
    this.variables.set(key, variable);
  }

  private initializeAxes(): void {
    const axisNames = ['X', 'Y', 'Z', 'A', 'B', 'C', 'U', 'V'];
    
    axisNames.forEach((name, index) => {
      const axis: PMACAxis = {
        name,
        position: Math.random() * 100 - 50,
        velocity: 0,
        acceleration: 0,
        followingError: 0,
        enabled: true,
        homed: Math.random() > 0.5,
        inPosition: true,
        limits: {
          positive: false,
          negative: false,
          software: {
            positive: 1000,
            negative: -1000,
          },
        },
        fault: false,
      };
      this.axes.set(name, axis);
    });

    logger.info(`Инициализировано ${this.axes.size} осей`);
  }

  private initializeDrives(): void {
    const driveConfigs = [
      { id: 1, name: 'Мотор 1', axis: 'X' },
      { id: 2, name: 'Мотор 2', axis: 'Y' },
      { id: 3, name: 'Мотор 3', axis: 'Z' },
      { id: 4, name: 'Мотор 4', axis: 'A' },
      { id: 5, name: 'Мотор 5', axis: 'B' },
      { id: 6, name: 'Мотор 6', axis: 'C' },
      { id: 7, name: 'Мотор 7', axis: 'S' },
      { id: 8, name: 'Мотор 8', axis: 'S1' }
    ];

    driveConfigs.forEach(config => {
      const drive: DriveStatus = {
        id: config.id,
        name: config.name,
        axis: config.axis,
        converterState: Math.random() > 0.95 ? 'ERROR' : 'OK',
        operationPermission: Math.random() > 0.1,
        fanOn: Math.random() > 0.2,
        dynamicBraking: Math.random() > 0.8,
        error: Math.random() > 0.95,
        state: this.getRandomDriveState(),
        trackingStatus: this.getRandomTrackingStatus(),
        current: Math.random() * 10, // 0-10A
        temperature: 20 + Math.random() * 25, // 20-45°C
        lastUpdated: new Date()
      };
      this.drives.push(drive);
    });

    logger.info(`Инициализировано ${this.drives.length} приводов`);
  }

  private getRandomDriveState(): 'O' | 'L' | 'H' | '1' {
    const rand = Math.random();
    if (rand < 0.7) return 'O';      // 70% - норма
    if (rand < 0.85) return 'L';     // 15% - нет питания
    if (rand < 0.95) return 'H';     // 10% - подано питание
    return '1';                       // 5% - ошибка
  }

  private getRandomTrackingStatus(): 'Ось в слежении' | 'Нет питания' | 'Подано питание' | 'Ошибка' {
    const rand = Math.random();
    if (rand < 0.7) return 'Ось в слежении';
    if (rand < 0.85) return 'Нет питания';
    if (rand < 0.95) return 'Подано питание';
    return 'Ошибка';
  }

  private startSimulation(): void {
    this.connectionState = 'connected';
    this.updateInterval = setInterval(() => {
      this.updateSimulation();
    }, config.pmac.simulation.variableUpdateInterval);

    logger.info('PMAC симулятор запущен');
    this.emit('connected');
  }

  private updateSimulation(): void {
    // Обновляем системные данные
    this.updateSystemData();

    // Обновляем координаты осей при движении
    if (this.controllerState === 'running') {
      this.updateAxesPosition();
    }

    // Обновляем приводы
    this.updateDrives();

    // Обновляем некоторые переменные
    this.updateVariables();

    // Генерируем случайные ошибки
    this.generateRandomErrors();

    // Эмитируем событие обновления данных
    this.emit('dataUpdated', this.getDataPoint());
  }

  private updateDrives(): void {
    this.drives.forEach(drive => {
      // Обновляем ток (0-10A с плавными изменениями)
      const currentChange = (Math.random() - 0.5) * 0.5;
      drive.current = Math.max(0, Math.min(10, drive.current + currentChange));
      
      // Обновляем температуру (20-45°C с плавными изменениями)
      const tempChange = (Math.random() - 0.5) * 0.3;
      drive.temperature = Math.max(20, Math.min(45, drive.temperature + tempChange));
      
      // Случайно изменяем состояние вентилятора
      if (Math.random() < 0.1) {
        drive.fanOn = !drive.fanOn;
      }
      
      // Случайно изменяем динамическое торможение
      if (Math.random() < 0.05) {
        drive.dynamicBraking = !drive.dynamicBraking;
      }
      
      // Случайно генерируем ошибки
      if (Math.random() < 0.02) {
        drive.error = true;
        drive.state = '1';
        drive.trackingStatus = 'Ошибка';
      } else if (drive.error && Math.random() < 0.1) {
        // Восстанавливаемся от ошибки
        drive.error = false;
        drive.state = this.getRandomDriveState();
        drive.trackingStatus = this.getRandomTrackingStatus();
      }
      
      // Обновляем время последнего обновления
      drive.lastUpdated = new Date();
    });
  }

  private updateSystemData(): void {
    this.systemData.temperature += (Math.random() - 0.5) * 0.5;
    this.systemData.temperature = Math.max(15, Math.min(45, this.systemData.temperature));

    this.systemData.voltage += (Math.random() - 0.5) * 0.2;
    this.systemData.voltage = Math.max(22, Math.min(26, this.systemData.voltage));

    this.systemData.current = Math.random() * 5;
    this.systemData.cpuUsage = Math.random() * 100;
    this.systemData.memoryUsage = Math.random() * 100;
  }

  private updateAxesPosition(): void {
    this.axes.forEach((axis, name) => {
      if (axis.enabled && !axis.fault) {
        // Симулируем движение
        const targetVelocity = (Math.random() - 0.5) * 10;
        axis.velocity += (targetVelocity - axis.velocity) * 0.1;
        axis.position += axis.velocity * (config.pmac.simulation.variableUpdateInterval / 1000);
        
        // Проверяем пределы
        if (axis.position >= axis.limits.software.positive) {
          axis.limits.positive = true;
          axis.velocity = 0;
        } else if (axis.position <= axis.limits.software.negative) {
          axis.limits.negative = true;
          axis.velocity = 0;
        } else {
          axis.limits.positive = false;
          axis.limits.negative = false;
        }

        // Обновляем статус "в позиции"
        axis.inPosition = Math.abs(axis.velocity) < 0.1;
        
        // Обновляем ошибку следования
        axis.followingError = (Math.random() - 0.5) * 0.1;
      }
    });
  }

  private updateVariables(): void {
    // Обновляем случайные переменные
    const types: PMACVariableType[] = ['P', 'Q', 'M', 'L'];
    
    types.forEach(type => {
      for (let i = 0; i < 10; i++) {
        const address = Math.floor(Math.random() * 100) + 1;
        const key = `${type}${address}`;
        const variable = this.variables.get(key);
        
        if (variable && !variable.readOnly) {
          const change = (Math.random() - 0.5) * 10;
          variable.value += change;
          variable.lastModified = new Date();
        }
      }
    });
  }

  private generateRandomErrors(): void {
    if (Math.random() < config.pmac.simulation.errorRate) {
      const errorCodes = ['E001', 'E002', 'E003', 'W001', 'W002'];
      const newError = errorCodes[Math.floor(Math.random() * errorCodes.length)];
      
      if (!this.errorCodes.includes(newError)) {
        this.errorCodes.push(newError);
        this.emit('error', newError);
        
        // Автоматически очищаем ошибки через некоторое время
        setTimeout(() => {
          this.clearError(newError);
        }, 10000);
      }
    }
  }

  private clearError(errorCode: string): void {
    const index = this.errorCodes.indexOf(errorCode);
    if (index > -1) {
      this.errorCodes.splice(index, 1);
      this.emit('errorCleared', errorCode);
    }
  }

  // Публичные методы API

  async connect(): Promise<void> {
    await this.simulateDelay();
    this.connectionState = 'connected';
    this.emit('connected');
    logger.info('PMAC симулятор подключен');
  }

  async disconnect(): Promise<void> {
    await this.simulateDelay();
    this.connectionState = 'disconnected';
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.emit('disconnected');
    logger.info('PMAC симулятор отключен');
  }

  async readVariable(type: PMACVariableType, address: number): Promise<number> {
    await this.simulateDelay();

    if (this.connectionState !== 'connected') {
      throw new Error('PMAC не подключен');
    }

    const key = `${type}${address}`;
    const variable = this.variables.get(key);
    
    if (!variable) {
      throw new Error(`Переменная ${key} не найдена`);
    }

    logger.debug(`Чтение переменной ${key} = ${variable.value}`);
    return variable.value;
  }

  async writeVariable(type: PMACVariableType, address: number, value: number): Promise<void> {
    await this.simulateDelay();

    if (this.connectionState !== 'connected') {
      throw new Error('PMAC не подключен');
    }

    const key = `${type}${address}`;
    const variable = this.variables.get(key);
    
    if (!variable) {
      throw new Error(`Переменная ${key} не найдена`);
    }

    if (variable.readOnly) {
      throw new Error(`Переменная ${key} доступна только для чтения`);
    }

    // Проверка критических переменных
    if (config.pmac.safety.criticalVariables.includes(key)) {
      if (value < config.pmac.safety.minValueThreshold || value > config.pmac.safety.maxValueThreshold) {
        throw new Error(`Значение ${value} для критической переменной ${key} вне безопасного диапазона`);
      }
    }

    variable.value = value;
    variable.lastModified = new Date();
    
    this.emit('variableChanged', { variable: key, value, timestamp: new Date() });
    logger.debug(`Запись переменной ${key} = ${value}`);
  }

  async readMultipleVariables(variables: Array<{type: PMACVariableType, address: number}>): Promise<Map<string, number>> {
    await this.simulateDelay();

    const results = new Map<string, number>();
    
    for (const { type, address } of variables) {
      try {
        const value = await this.readVariable(type, address);
        results.set(`${type}${address}`, value);
      } catch (error) {
        logger.warn(`Ошибка чтения переменной ${type}${address}:`, error);
      }
    }

    return results;
  }

  async writeMultipleVariables(variables: Array<{type: PMACVariableType, address: number, value: number}>): Promise<void> {
    await this.simulateDelay();

    for (const { type, address, value } of variables) {
      try {
        await this.writeVariable(type, address, value);
      } catch (error) {
        logger.warn(`Ошибка записи переменной ${type}${address}:`, error);
      }
    }
  }

  async executeCommand(command: string): Promise<string> {
    await this.simulateDelay();

    if (this.connectionState !== 'connected') {
      throw new Error('PMAC не подключен');
    }

    const cmd = command.toUpperCase().trim();
    
    switch (cmd) {
      case 'START':
      case 'RUN':
        this.controllerState = 'running';
        this.emit('stateChanged', 'running');
        return 'Контроллер запущен';
        
      case 'STOP':
      case 'PAUSE':
        this.controllerState = 'idle';
        this.emit('stateChanged', 'idle');
        return 'Контроллер остановлен';
        
      case 'RESET':
        this.controllerState = 'idle';
        this.errorCodes = [];
        this.axes.forEach(axis => {
          axis.fault = false;
          axis.faultCode = undefined;
        });
        this.emit('stateChanged', 'idle');
        return 'Контроллер сброшен';
        
      case 'KILL':
      case 'ABORT':
        this.controllerState = 'error';
        this.emit('stateChanged', 'error');
        return 'Аварийная остановка выполнена';
        
      case 'HOME':
        this.controllerState = 'homing';
        this.emit('stateChanged', 'homing');
        
        // Симулируем процесс возврата в исходное положение
        setTimeout(() => {
          this.axes.forEach(axis => {
            axis.position = 0;
            axis.homed = true;
            axis.velocity = 0;
          });
          this.controllerState = 'idle';
          this.emit('stateChanged', 'idle');
          this.emit('homeComplete');
        }, 3000);
        
        return 'Выполняется возврат в исходное положение';
        
      default:
        // Обработка команд записи переменных
        const writeMatch = cmd.match(/^([PQIML])(\d+)=(.+)$/);
        if (writeMatch) {
          const [, type, address, value] = writeMatch;
          await this.writeVariable(type as PMACVariableType, parseInt(address), parseFloat(value));
          return `${type}${address} = ${value}`;
        }
        
        // Обработка команд чтения переменных
        const readMatch = cmd.match(/^([PQIML])(\d+)$/);
        if (readMatch) {
          const [, type, address] = readMatch;
          const value = await this.readVariable(type as PMACVariableType, parseInt(address));
          return `${type}${address} = ${value}`;
        }
        
        return `Неизвестная команда: ${command}`;
    }
  }

  getStatus(): PMACStatus {
    const axes = Array.from(this.axes.entries()).reduce((acc, [name, axis]) => {
      acc[name.toLowerCase()] = {
        position: axis.position,
        velocity: axis.velocity,
        followingError: axis.followingError,
        status: axis.enabled ? 'enabled' : 'disabled',
        limits: {
          positive: axis.limits.positive,
          negative: axis.limits.negative,
        },
      };
      return acc;
    }, {} as Record<string, any>);

    const variables = {
      P: {} as Record<number, number>,
      Q: {} as Record<number, number>,
      I: {} as Record<number, number>,
      M: {} as Record<number, number>,
      L: {} as Record<number, number>,
    };

    // Заполняем переменные первыми 10 для каждого типа
    const types: PMACVariableType[] = ['P', 'Q', 'I', 'M', 'L'];
    types.forEach(type => {
      for (let addr = 1; addr <= 10; addr++) {
        const key = `${type}${addr}`;
        const variable = this.variables.get(key);
        if (variable) {
          variables[type][addr] = variable.value;
        }
      }
    });

    return {
      controllerState: this.controllerState,
      communicationStatus: this.connectionState,
      coordinates: Array.from(this.axes.entries()).reduce((acc, [name, axis]) => {
        acc[name.toLowerCase()] = axis.position;
        return acc;
      }, {} as Record<string, number>),
      variables,
      axes,
      drives: this.drives,
      system: {
        temperature: this.systemData.temperature,
        voltage: this.systemData.voltage,
        errorCodes: this.errorCodes,
        uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
      },
    };
  }

  getDataPoint(): PMACDataPoint {
    return {
      timestamp: new Date(),
      variables: Object.fromEntries(
        Array.from(this.variables.entries())
          .slice(0, 100) // Первые 100 переменных для примера
          .map(([key, variable]) => [key, variable.value])
      ),
      coordinates: Array.from(this.axes.entries()).reduce((acc, [name, axis]) => {
        acc[name.toLowerCase()] = axis.position;
        return acc;
      }, {} as Record<string, number>),
      status: this.controllerState,
      metadata: {
        source: 'simulator',
        quality: 'good',
        errorCodes: this.errorCodes,
      },
    };
  }

  getDrives(): DriveStatus[] {
    return this.drives;
  }

  getConnectionInfo(): PMACConnection {
    return {
      id: 'simulator-1',
      name: 'PMAC Simulator',
      type: 'simulation',
      host: 'localhost',
      port: 1025,
      status: this.connectionState,
      lastConnected: this.startTime,
      settings: {
        timeout: 5000,
        retries: 3,
        protocol: 'tcp',
      },
    };
  }

  private async simulateDelay(): Promise<void> {
    const delay = config.pmac.simulation.responseDelay;
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Методы для тестирования
  setSystemError(errorCode: string): void {
    if (!this.errorCodes.includes(errorCode)) {
      this.errorCodes.push(errorCode);
      this.emit('error', errorCode);
    }
  }

  clearAllErrors(): void {
    this.errorCodes = [];
    this.emit('errorsCleared');
  }

  getVariable(type: PMACVariableType, address: number): PMACVariable | undefined {
    const key = `${type}${address}`;
    return this.variables.get(key);
  }

  getAxis(name: string): PMACAxis | undefined {
    return this.axes.get(name.toUpperCase());
  }

  setAxisPosition(name: string, position: number): void {
    const axis = this.axes.get(name.toUpperCase());
    if (axis) {
      axis.position = position;
    }
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.removeAllListeners();
    logger.info('PMAC симулятор остановлен');
  }
}
