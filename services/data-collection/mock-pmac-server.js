#!/usr/bin/env node

/**
 * Мок PMAC сервер для тестирования Data Collection
 * Симулирует поведение реального PMAC контроллера
 */

import express from 'express';
import cors from 'cors';

class MockPMACServer {
  constructor(port = 3007) {
    this.port = port;
    this.app = express();
    this.isConnected = true;
    this.variables = new Map();
    this.systemInfo = {
      version: '2.6.1.0',
      uptime: 0,
      cpuUsage: 15,
      memoryUsage: 45,
    };
    this.axisStatus = {
      1: { position: 0, velocity: 0, following: true, enabled: true },
      2: { position: 0, velocity: 0, following: true, enabled: true },
      3: { position: 0, velocity: 0, following: false, enabled: false },
    };
    
    this.setupServer();
    this.startSimulation();
  }

  setupServer() {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Логирование запросов
    this.app.use((req, res, next) => {
      console.log(`📡 ${new Date().toISOString()} ${req.method} ${req.url}`);
      next();
    });

    // Статус системы
    this.app.get('/api/status', (req, res) => {
      res.json({
        isConnected: this.isConnected,
        machineId: 'pmac-001',
        systemInfo: this.systemInfo,
        axisStatus: this.axisStatus,
        variables: {
          P: Object.fromEntries([...this.variables.entries()].filter(([key]) => key.startsWith('P'))),
          Q: Object.fromEntries([...this.variables.entries()].filter(([key]) => key.startsWith('Q'))),
          I: Object.fromEntries([...this.variables.entries()].filter(([key]) => key.startsWith('I'))),
          M: Object.fromEntries([...this.variables.entries()].filter(([key]) => key.startsWith('M'))),
          L: Object.fromEntries([...this.variables.entries()].filter(([key]) => key.startsWith('L'))),
        },
      });
    });

    // Чтение переменной
    this.app.get('/api/variable', (req, res) => {
      const { type, address } = req.query;
      
      if (!type || address === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing type or address parameter',
        });
      }

      const key = `${type}${address}`;
      const value = this.variables.get(key);
      
      if (value !== undefined) {
        res.json({
          success: true,
          value,
          type,
          address: parseInt(address),
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(404).json({
          success: false,
          error: `Variable ${key} not found`,
        });
      }
    });

    // Запись переменной
    this.app.post('/api/variable', (req, res) => {
      const { type, address, value } = req.body;
      
      if (!type || address === undefined || value === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing type, address, or value',
        });
      }

      const key = `${type}${address}`;
      this.variables.set(key, parseFloat(value));
      
      console.log(`📝 Variable ${key} set to ${value}`);
      
      res.json({
        success: true,
        message: `Variable ${key} set to ${value}`,
        timestamp: new Date().toISOString(),
      });
    });

    // Batch чтение переменных
    this.app.post('/api/variables/read', (req, res) => {
      const { variables } = req.body;
      
      if (!Array.isArray(variables)) {
        return res.status(400).json({
          success: false,
          error: 'Variables must be an array',
        });
      }

      const results = variables.map(({ type, address }) => {
        const key = `${type}${address}`;
        const value = this.variables.get(key);
        
        return {
          type,
          address,
          value: value !== undefined ? value : 0,
          success: value !== undefined,
        };
      });

      res.json({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      });
    });

    // Контроль соединения
    this.app.post('/api/connection', (req, res) => {
      const { action } = req.body;
      
      if (action === 'disconnect') {
        this.isConnected = false;
        console.log('🔌 PMAC disconnected');
      } else if (action === 'connect') {
        this.isConnected = true;
        console.log('🔌 PMAC connected');
      }
      
      res.json({
        success: true,
        isConnected: this.isConnected,
      });
    });

    // Сброс к заводским настройкам
    this.app.post('/api/reset', (req, res) => {
      this.variables.clear();
      this.initializeVariables();
      console.log('🔄 PMAC variables reset');
      
      res.json({
        success: true,
        message: 'Variables reset to defaults',
      });
    });

    // Информация о сервере
    this.app.get('/api/info', (req, res) => {
      res.json({
        service: 'Mock PMAC Server',
        version: '1.0.0',
        variableCount: this.variables.size,
        isConnected: this.isConnected,
        uptime: process.uptime(),
      });
    });

    // Главная страница
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Mock PMAC Server',
        endpoints: {
          status: 'GET /api/status',
          variable: 'GET /api/variable?type=P&address=100',
          setVariable: 'POST /api/variable {type, address, value}',
          batchRead: 'POST /api/variables/read {variables: [{type, address}]}',
          connection: 'POST /api/connection {action: "connect"|"disconnect"}',
          reset: 'POST /api/reset',
          info: 'GET /api/info',
        },
      });
    });
  }

  initializeVariables() {
    // P переменные (позиции)
    for (let i = 0; i < 200; i++) {
      this.variables.set(`P${i}`, Math.random() * 1000 - 500);
    }
    
    // I переменные (системные)
    this.variables.set('I1', 8388608); // ServoRate
    this.variables.set('I2', 2097152); // Phase1Rate
    this.variables.set('I3', 2097152); // Phase2Rate
    this.variables.set('I10', 119);    // ServoPeriod
    this.variables.set('I58', 8388608); // TimerA
    this.variables.set('I59', 8388608); // TimerB
    
    // Q переменные (координаты)
    for (let i = 1; i <= 32; i++) {
      this.variables.set(`Q${i}`, Math.random() * 360);
    }
    
    // M переменные (флаги)
    for (let i = 0; i < 100; i++) {
      this.variables.set(`M${i}`, Math.random() > 0.5 ? 1 : 0);
    }
    
    // L переменные (локальные)
    for (let i = 0; i < 50; i++) {
      this.variables.set(`L${i}`, Math.random() * 100);
    }
  }

  startSimulation() {
    // Обновляем переменные каждые 100ms
    setInterval(() => {
      if (!this.isConnected) return;
      
      // Симуляция движения осей
      for (const [axisNum, status] of Object.entries(this.axisStatus)) {
        if (status.following && status.enabled) {
          status.position += (Math.random() - 0.5) * 0.1;
          status.velocity = (Math.random() - 0.5) * 10;
          
          // Обновляем соответствующие P переменные
          this.variables.set(`P${axisNum}01`, status.position);
          this.variables.set(`P${axisNum}02`, status.velocity);
        }
      }
      
      // Симуляция системных переменных
      this.systemInfo.uptime = process.uptime();
      this.systemInfo.cpuUsage = 10 + Math.random() * 20;
      this.systemInfo.memoryUsage = 40 + Math.random() * 20;
      
      // Обновляем некоторые переменные
      for (let i = 100; i < 110; i++) {
        const current = this.variables.get(`P${i}`) || 0;
        this.variables.set(`P${i}`, current + (Math.random() - 0.5) * 0.5);
      }
      
      // Случайно изменяем M переменные
      if (Math.random() < 0.1) {
        const mVar = `M${Math.floor(Math.random() * 100)}`;
        this.variables.set(mVar, Math.random() > 0.5 ? 1 : 0);
      }
    }, 100);

    // Периодически меняем статус подключения для тестирования
    if (process.env.SIMULATE_DISCONNECTS === 'true') {
      setInterval(() => {
        if (Math.random() < 0.05) { // 5% вероятность
          this.isConnected = !this.isConnected;
          console.log(`🔌 Connection ${this.isConnected ? 'restored' : 'lost'}`);
        }
      }, 5000);
    }
  }

  start() {
    this.initializeVariables();
    
    this.app.listen(this.port, () => {
      console.log(`🤖 Mock PMAC Server запущен на порту ${this.port}`);
      console.log(`📊 Инициализировано ${this.variables.size} переменных`);
      console.log(`🌐 API доступен: http://localhost:${this.port}/api`);
      console.log(`📖 Документация: http://localhost:${this.port}/`);
    });
  }
}

// Запуск сервера
const port = process.env.MOCK_PMAC_PORT || 3007;
const server = new MockPMACServer(port);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Остановка Mock PMAC Server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Остановка Mock PMAC Server...');
  process.exit(0);
});

server.start();
