import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { AdvancedPMACSimulator } from './pmac-simulator.js';
import type { 
  PMACVariableType, 
  PMACStatus, 
  PMACDataPoint,
  PMACConnection 
} from '../types/pmac-types.js';

export interface PMACConnectionOptions {
  type: 'tcp' | 'serial' | 'usb' | 'simulation';
  host?: string;
  port?: number;
  serialPort?: string;
  baudRate?: number;
  timeout?: number;
  retries?: number;
}

export abstract class PMACConnectionBase extends EventEmitter {
  protected connectionOptions: PMACConnectionOptions;
  protected isConnected: boolean = false;
  protected lastError?: Error;
  protected reconnectAttempts: number = 0;
  protected maxReconnectAttempts: number = 5;
  protected reconnectInterval?: NodeJS.Timeout;

  constructor(options: PMACConnectionOptions) {
    super();
    this.connectionOptions = options;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract readVariable(type: PMACVariableType, address: number): Promise<number>;
  abstract writeVariable(type: PMACVariableType, address: number, value: number): Promise<void>;
  abstract executeCommand(command: string): Promise<string>;
  abstract getStatus(): Promise<PMACStatus>;
  abstract getDataPoint(): PMACDataPoint;

  public isConnectionAlive(): boolean {
    return this.isConnected;
  }

  public getLastError(): Error | undefined {
    return this.lastError;
  }

  protected handleConnectionError(error: Error): void {
    this.lastError = error;
    this.isConnected = false;
    this.emit('connectionError', error);
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      this.emit('connectionFailed', error);
    }
  }

  protected scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff
    
    logger.warn(`Попытка переподключения ${this.reconnectAttempts}/${this.maxReconnectAttempts} через ${delay}ms`);
    
    this.reconnectInterval = setTimeout(async () => {
      try {
        await this.connect();
        this.reconnectAttempts = 0;
      } catch (error) {
        this.handleConnectionError(error as Error);
      }
    }, delay);
  }

  protected resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = undefined;
    }
  }
}

export class PMACSimulationConnection extends PMACConnectionBase {
  private simulator: AdvancedPMACSimulator;

  constructor(options: PMACConnectionOptions) {
    super(options);
    this.simulator = new AdvancedPMACSimulator();
    this.setupSimulatorEvents();
  }

  private setupSimulatorEvents(): void {
    this.simulator.on('connected', () => {
      this.isConnected = true;
      this.resetReconnectAttempts();
      this.emit('connected');
    });

    this.simulator.on('disconnected', () => {
      this.isConnected = false;
      this.emit('disconnected');
    });

    this.simulator.on('error', (errorCode: string) => {
      this.emit('systemError', errorCode);
    });

    this.simulator.on('dataUpdated', (dataPoint: PMACDataPoint) => {
      this.emit('dataUpdated', dataPoint);
    });

    this.simulator.on('stateChanged', (newState: string) => {
      this.emit('stateChanged', newState);
    });
  }

  async connect(): Promise<void> {
    try {
      await this.simulator.connect();
      logger.info('Подключение к PMAC симулятору установлено');
    } catch (error) {
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.simulator.disconnect();
      logger.info('Подключение к PMAC симулятору закрыто');
    } catch (error) {
      logger.error('Ошибка при отключении симулятора:', error);
      throw error;
    }
  }

  async readVariable(type: PMACVariableType, address: number): Promise<number> {
    if (!this.isConnected) {
      throw new Error('PMAC не подключен');
    }
    return this.simulator.readVariable(type, address);
  }

  async writeVariable(type: PMACVariableType, address: number, value: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('PMAC не подключен');
    }
    return this.simulator.writeVariable(type, address, value);
  }

  async readMultipleVariables(variables: Array<{type: PMACVariableType, address: number}>): Promise<Map<string, number>> {
    if (!this.isConnected) {
      throw new Error('PMAC не подключен');
    }
    return this.simulator.readMultipleVariables(variables);
  }

  async writeMultipleVariables(variables: Array<{type: PMACVariableType, address: number, value: number}>): Promise<void> {
    if (!this.isConnected) {
      throw new Error('PMAC не подключен');
    }
    return this.simulator.writeMultipleVariables(variables);
  }

  async executeCommand(command: string): Promise<string> {
    if (!this.isConnected) {
      throw new Error('PMAC не подключен');
    }
    return this.simulator.executeCommand(command);
  }

  async getStatus(): Promise<PMACStatus> {
    if (!this.isConnected) {
      throw new Error('PMAC не подключен');
    }
    return this.simulator.getStatus();
  }

  getDataPoint(): PMACDataPoint {
    return this.simulator.getDataPoint();
  }

  getConnectionInfo(): PMACConnection {
    return this.simulator.getConnectionInfo();
  }

  destroy(): void {
    this.simulator.destroy();
    this.removeAllListeners();
  }
}

export class PMACTCPConnection extends PMACConnectionBase {
  // TODO: Реализация TCP подключения к реальному PMAC
  
  async connect(): Promise<void> {
    throw new Error('TCP подключение пока не реализовано');
  }

  async disconnect(): Promise<void> {
    throw new Error('TCP подключение пока не реализовано');
  }

  async readVariable(type: PMACVariableType, address: number): Promise<number> {
    throw new Error('TCP подключение пока не реализовано');
  }

  async writeVariable(type: PMACVariableType, address: number, value: number): Promise<void> {
    throw new Error('TCP подключение пока не реализовано');
  }

  async executeCommand(command: string): Promise<string> {
    throw new Error('TCP подключение пока не реализовано');
  }

  async getStatus(): Promise<PMACStatus> {
    throw new Error('TCP подключение пока не реализовано');
  }

  getDataPoint(): PMACDataPoint {
    throw new Error('TCP подключение пока не реализовано');
  }
}

export class PMACSerialConnection extends PMACConnectionBase {
  // TODO: Реализация Serial подключения к реальному PMAC
  
  async connect(): Promise<void> {
    throw new Error('Serial подключение пока не реализовано');
  }

  async disconnect(): Promise<void> {
    throw new Error('Serial подключение пока не реализовано');
  }

  async readVariable(type: PMACVariableType, address: number): Promise<number> {
    throw new Error('Serial подключение пока не реализовано');
  }

  async writeVariable(type: PMACVariableType, address: number, value: number): Promise<void> {
    throw new Error('Serial подключение пока не реализовано');
  }

  async executeCommand(command: string): Promise<string> {
    throw new Error('Serial подключение пока не реализовано');
  }

  async getStatus(): Promise<PMACStatus> {
    throw new Error('Serial подключение пока не реализовано');
  }

  getDataPoint(): PMACDataPoint {
    throw new Error('Serial подключение пока не реализовано');
  }
}

export class PMACConnectionManager extends EventEmitter {
  private connections: Map<string, PMACConnectionBase> = new Map();
  private activeConnection?: PMACConnectionBase;
  private connectionId: string = 'default';

  constructor() {
    super();
  }

  async createConnection(id: string, options: PMACConnectionOptions): Promise<void> {
    let connection: PMACConnectionBase;

    switch (options.type) {
      case 'simulation':
        connection = new PMACSimulationConnection(options);
        break;
      case 'tcp':
        connection = new PMACTCPConnection(options);
        break;
      case 'serial':
        connection = new PMACSerialConnection(options);
        break;
      default:
        throw new Error(`Неподдерживаемый тип подключения: ${options.type}`);
    }

    // Проксируем события соединения
    connection.on('connected', () => this.emit('connected', id));
    connection.on('disconnected', () => this.emit('disconnected', id));
    connection.on('connectionError', (error) => this.emit('connectionError', id, error));
    connection.on('dataUpdated', (data) => this.emit('dataUpdated', id, data));
    connection.on('stateChanged', (state) => this.emit('stateChanged', id, state));
    connection.on('systemError', (errorCode) => this.emit('systemError', id, errorCode));

    this.connections.set(id, connection);
    
    // Если это первое подключение, делаем его активным
    if (!this.activeConnection) {
      this.activeConnection = connection;
      this.connectionId = id;
    }

    logger.info(`Создано подключение ${id} типа ${options.type}`);
  }

  async connect(id?: string): Promise<void> {
    const connectionId = id || this.connectionId;
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      throw new Error(`Подключение ${connectionId} не найдено`);
    }

    await connection.connect();
    this.activeConnection = connection;
    this.connectionId = connectionId;
  }

  async disconnect(id?: string): Promise<void> {
    const connectionId = id || this.connectionId;
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      throw new Error(`Подключение ${connectionId} не найдено`);
    }

    await connection.disconnect();
    
    if (this.activeConnection === connection) {
      this.activeConnection = undefined;
    }
  }

  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.values()).map(conn => 
      conn.disconnect().catch(err => logger.error('Ошибка при отключении:', err))
    );
    
    await Promise.all(disconnectPromises);
    this.activeConnection = undefined;
  }

  async switchActiveConnection(id: string): Promise<void> {
    const connection = this.connections.get(id);
    
    if (!connection) {
      throw new Error(`Подключение ${id} не найдено`);
    }

    if (!connection.isConnectionAlive()) {
      await connection.connect();
    }

    this.activeConnection = connection;
    this.connectionId = id;
    
    logger.info(`Переключено на подключение ${id}`);
  }

  getActiveConnection(): PMACConnectionBase | undefined {
    return this.activeConnection;
  }

  getConnection(id: string): PMACConnectionBase | undefined {
    return this.connections.get(id);
  }

  getAllConnections(): Map<string, PMACConnectionBase> {
    return new Map(this.connections);
  }

  removeConnection(id: string): void {
    const connection = this.connections.get(id);
    
    if (connection) {
      connection.disconnect().catch(err => logger.error('Ошибка при отключении:', err));
      this.connections.delete(id);
      
      if (this.activeConnection === connection) {
        this.activeConnection = undefined;
      }
      
      logger.info(`Подключение ${id} удалено`);
    }
  }

  // Методы для работы с активным подключением

  async readVariable(type: PMACVariableType, address: number): Promise<number> {
    if (!this.activeConnection) {
      throw new Error('Нет активного подключения');
    }
    return this.activeConnection.readVariable(type, address);
  }

  async writeVariable(type: PMACVariableType, address: number, value: number): Promise<void> {
    if (!this.activeConnection) {
      throw new Error('Нет активного подключения');
    }
    return this.activeConnection.writeVariable(type, address, value);
  }

  async executeCommand(command: string): Promise<string> {
    if (!this.activeConnection) {
      throw new Error('Нет активного подключения');
    }
    return this.activeConnection.executeCommand(command);
  }

  async getStatus(): Promise<PMACStatus> {
    if (!this.activeConnection) {
      throw new Error('Нет активного подключения');
    }
    return this.activeConnection.getStatus();
  }

  getDataPoint(): PMACDataPoint {
    if (!this.activeConnection) {
      throw new Error('Нет активного подключения');
    }
    return this.activeConnection.getDataPoint();
  }

  isConnected(): boolean {
    return this.activeConnection?.isConnectionAlive() || false;
  }

  destroy(): void {
    this.connections.forEach(connection => {
      if ('destroy' in connection && typeof connection.destroy === 'function') {
        (connection as any).destroy();
      }
    });
    this.connections.clear();
    this.activeConnection = undefined;
    this.removeAllListeners();
  }
}
