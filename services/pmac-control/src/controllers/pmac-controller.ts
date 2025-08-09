import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { PMACConnectionManager } from '../services/pmac-connection-manager.js';
import type { PMACVariableType } from '../types/pmac-types.js';

// Схемы валидации Zod
const ReadVariableSchema = z.object({
  type: z.enum(['P', 'Q', 'I', 'M', 'L']),
  address: z.number().int().min(1).max(8191),
});

const WriteVariableSchema = z.object({
  type: z.enum(['P', 'Q', 'I', 'M', 'L']),
  address: z.number().int().min(1).max(8191),
  value: z.number(),
});

const ReadMultipleVariablesSchema = z.object({
  variables: z.array(ReadVariableSchema).min(1).max(100), // Ограничение на 100 переменных за раз
});

const WriteMultipleVariablesSchema = z.object({
  variables: z.array(WriteVariableSchema).min(1).max(100),
});

const ExecuteCommandSchema = z.object({
  command: z.string().min(1).max(255),
});

const ConnectionConfigSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['simulation', 'tcp', 'serial', 'usb']),
  host: z.string().optional(),
  port: z.number().int().min(1).max(65535).optional(),
  serialPort: z.string().optional(),
  baudRate: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
  retries: z.number().int().min(0).max(10).optional(),
});

export class PMACController {
  private connectionManager: PMACConnectionManager;

  constructor(connectionManager: PMACConnectionManager) {
    this.connectionManager = connectionManager;
  }

  // Получение статуса контроллера
  getStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.connectionManager.isConnected()) {
        res.status(503).json({
          success: false,
          error: 'PMAC не подключен',
          code: 'NOT_CONNECTED'
        });
        return;
      }

      const status = await this.connectionManager.getStatus();
      
      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Ошибка получения статуса PMAC:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения статуса',
        code: 'STATUS_ERROR',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  // Чтение переменной
  readVariable = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, address } = ReadVariableSchema.parse({
        type: req.query.type,
        address: parseInt(req.query.address as string)
      });
      
      if (!this.connectionManager.isConnected()) {
        res.status(503).json({
          success: false,
          error: 'PMAC не подключен',
          code: 'NOT_CONNECTED'
        });
        return;
      }

      const value = await this.connectionManager.readVariable(type as PMACVariableType, address);
      
      res.json({
        success: true,
        data: {
          variable: `${type}${address}`,
          value,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Неверные параметры',
          code: 'VALIDATION_ERROR',
          details: error.errors
        });
        return;
      }

      logger.error('Ошибка чтения переменной:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка чтения переменной',
        code: 'READ_ERROR',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  // Запись переменной
  writeVariable = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, address, value } = WriteVariableSchema.parse(req.body);
      
      if (!this.connectionManager.isConnected()) {
        res.status(503).json({
          success: false,
          error: 'PMAC не подключен',
          code: 'NOT_CONNECTED'
        });
        return;
      }

      await this.connectionManager.writeVariable(type as PMACVariableType, address, value);
      
      res.json({
        success: true,
        data: {
          variable: `${type}${address}`,
          value,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Неверные параметры',
          code: 'VALIDATION_ERROR',
          details: error.errors
        });
        return;
      }

      logger.error('Ошибка записи переменной:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка записи переменной',
        code: 'WRITE_ERROR',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  // Чтение множественных переменных
  readMultipleVariables = async (req: Request, res: Response): Promise<void> => {
    try {
      const { variables } = ReadMultipleVariablesSchema.parse(req.body);
      
      if (!this.connectionManager.isConnected()) {
        res.status(503).json({
          success: false,
          error: 'PMAC не подключен',
          code: 'NOT_CONNECTED'
        });
        return;
      }

      // Для симуляции используем обычные вызовы read
      const results: Record<string, number> = {};
      const errors: Record<string, string> = {};

      for (const variable of variables) {
        try {
          const value = await this.connectionManager.readVariable(
            variable.type as PMACVariableType, 
            variable.address
          );
          results[`${variable.type}${variable.address}`] = value;
        } catch (error) {
          errors[`${variable.type}${variable.address}`] = 
            error instanceof Error ? error.message : 'Неизвестная ошибка';
        }
      }
      
      res.json({
        success: true,
        data: {
          variables: results,
          errors: Object.keys(errors).length > 0 ? errors : undefined,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Неверные параметры',
          code: 'VALIDATION_ERROR',
          details: error.errors
        });
        return;
      }

      logger.error('Ошибка чтения множественных переменных:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка чтения переменных',
        code: 'READ_MULTIPLE_ERROR',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  // Запись множественных переменных
  writeMultipleVariables = async (req: Request, res: Response): Promise<void> => {
    try {
      const { variables } = WriteMultipleVariablesSchema.parse(req.body);
      
      if (!this.connectionManager.isConnected()) {
        res.status(503).json({
          success: false,
          error: 'PMAC не подключен',
          code: 'NOT_CONNECTED'
        });
        return;
      }

      const results: Record<string, boolean> = {};
      const errors: Record<string, string> = {};

      for (const variable of variables) {
        try {
          await this.connectionManager.writeVariable(
            variable.type as PMACVariableType, 
            variable.address, 
            variable.value
          );
          results[`${variable.type}${variable.address}`] = true;
        } catch (error) {
          results[`${variable.type}${variable.address}`] = false;
          errors[`${variable.type}${variable.address}`] = 
            error instanceof Error ? error.message : 'Неизвестная ошибка';
        }
      }
      
      res.json({
        success: true,
        data: {
          results,
          errors: Object.keys(errors).length > 0 ? errors : undefined,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Неверные параметры',
          code: 'VALIDATION_ERROR',
          details: error.errors
        });
        return;
      }

      logger.error('Ошибка записи множественных переменных:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка записи переменных',
        code: 'WRITE_MULTIPLE_ERROR',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  // Выполнение команды
  executeCommand = async (req: Request, res: Response): Promise<void> => {
    try {
      const { command } = ExecuteCommandSchema.parse(req.body);
      
      if (!this.connectionManager.isConnected()) {
        res.status(503).json({
          success: false,
          error: 'PMAC не подключен',
          code: 'NOT_CONNECTED'
        });
        return;
      }

      const result = await this.connectionManager.executeCommand(command);
      
      res.json({
        success: true,
        data: {
          command,
          result,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Неверные параметры',
          code: 'VALIDATION_ERROR',
          details: error.errors
        });
        return;
      }

      logger.error('Ошибка выполнения команды:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка выполнения команды',
        code: 'COMMAND_ERROR',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  // Получение текущих данных
  getDataPoint = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.connectionManager.isConnected()) {
        res.status(503).json({
          success: false,
          error: 'PMAC не подключен',
          code: 'NOT_CONNECTED'
        });
        return;
      }

      const dataPoint = this.connectionManager.getDataPoint();
      
      res.json({
        success: true,
        data: dataPoint
      });
    } catch (error) {
      logger.error('Ошибка получения данных:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения данных',
        code: 'DATA_ERROR',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  // Управление подключениями

  // Создание нового подключения
  createConnection = async (req: Request, res: Response): Promise<void> => {
    try {
      const connectionConfig = ConnectionConfigSchema.parse(req.body);
      
      await this.connectionManager.createConnection(connectionConfig.id, {
        type: connectionConfig.type,
        host: connectionConfig.host,
        port: connectionConfig.port,
        serialPort: connectionConfig.serialPort,
        baudRate: connectionConfig.baudRate,
        timeout: connectionConfig.timeout,
        retries: connectionConfig.retries,
      });
      
      res.status(201).json({
        success: true,
        data: {
          connectionId: connectionConfig.id,
          message: 'Подключение создано'
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Неверные параметры',
          code: 'VALIDATION_ERROR',
          details: error.errors
        });
        return;
      }

      logger.error('Ошибка создания подключения:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка создания подключения',
        code: 'CONNECTION_CREATE_ERROR',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  // Подключение
  connect = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      await this.connectionManager.connect(id);
      
      res.json({
        success: true,
        data: {
          connectionId: id,
          message: 'Подключение установлено'
        }
      });
    } catch (error) {
      logger.error('Ошибка подключения:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка подключения',
        code: 'CONNECTION_ERROR',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  // Отключение
  disconnect = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      await this.connectionManager.disconnect(id);
      
      res.json({
        success: true,
        data: {
          connectionId: id,
          message: 'Подключение закрыто'
        }
      });
    } catch (error) {
      logger.error('Ошибка отключения:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка отключения',
        code: 'DISCONNECTION_ERROR',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  // Переключение активного подключения
  switchConnection = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      await this.connectionManager.switchActiveConnection(id);
      
      res.json({
        success: true,
        data: {
          activeConnectionId: id,
          message: 'Активное подключение переключено'
        }
      });
    } catch (error) {
      logger.error('Ошибка переключения подключения:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка переключения подключения',
        code: 'SWITCH_CONNECTION_ERROR',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  // Получение списка подключений
  getConnections = async (req: Request, res: Response): Promise<void> => {
    try {
      const connections = Array.from(this.connectionManager.getAllConnections().entries()).map(([id, connection]) => ({
        id,
        connected: connection.isConnectionAlive(),
        lastError: connection.getLastError()?.message,
      }));
      
      res.json({
        success: true,
        data: {
          connections,
          activeConnection: this.connectionManager.isConnected() ? 'default' : null,
        }
      });
    } catch (error) {
      logger.error('Ошибка получения списка подключений:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения подключений',
        code: 'GET_CONNECTIONS_ERROR',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  // Health check
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const isConnected = this.connectionManager.isConnected();
      
      res.json({
        success: true,
        data: {
          service: 'pmac-control',
          status: 'healthy',
          connected: isConnected,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Ошибка проверки состояния',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };
}
