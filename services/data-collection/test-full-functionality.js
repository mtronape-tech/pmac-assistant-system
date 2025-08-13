#!/usr/bin/env node

/**
 * Комплексный тест Data Collection Service
 * Проверяет REST API, WebSocket, базу данных и качество данных
 */

import axios from 'axios';
import WebSocket from 'ws';

class DataCollectionTester {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.wsUrl = baseUrl.replace('http', 'ws') + '/ws/data-stream';
    this.api = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
    });
    this.testResults = {
      health: false,
      api: false,
      websocket: false,
      database: false,
      quality: false,
    };
  }

  async runAllTests() {
    console.log('🧪 Запуск комплексного тестирования Data Collection Service\n');
    console.log(`🔗 Base URL: ${this.baseUrl}`);
    console.log(`🔗 WebSocket URL: ${this.wsUrl}\n`);

    try {
      await this.testHealth();
      await this.testRestAPI();
      await this.testWebSocketAPI();
      await this.testDatabaseOperations();
      await this.testQualityMonitoring();
      
      this.printSummary();
    } catch (error) {
      console.error('❌ Критическая ошибка при тестировании:', error.message);
    }
  }

  async testHealth() {
    console.log('🏥 === ТЕСТ ЗДОРОВЬЯ СЕРВИСА ===');
    
    try {
      const response = await this.api.get('/health');
      console.log(`✅ Health check: ${response.status} ${response.statusText}`);
      console.log(`📊 Response:`, response.data);
      this.testResults.health = true;
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      console.log('ℹ️  Убедитесь, что сервис запущен: npm run dev');
      throw error;
    }
    console.log('');
  }

  async testRestAPI() {
    console.log('🌐 === ТЕСТ REST API ===');
    
    try {
      // Тест получения типов коллекций
      const typesResponse = await this.api.get('/api/collection-types');
      console.log('✅ Collection types получены:', typesResponse.data);

      // Тест получения конфигураций
      const configsResponse = await this.api.get('/api/configurations');
      console.log('✅ Конфигурации получены:', configsResponse.data.success);

      // Тест создания тестовой конфигурации
      const testConfig = {
        id: 'test-config-' + Date.now(),
        name: 'Тестовая конфигурация',
        type: 'variables',
        enabled: true,
        interval: 5000,
        batchSize: 5,
        timeout: 10000,
        retryAttempts: 2,
        retryDelay: 2000,
        variables: [
          { type: 'P', address: 100, name: 'Test Position', description: 'Тестовая позиция' },
          { type: 'I', address: 1, name: 'Test Counter', description: 'Тестовый счетчик' },
        ],
        metadata: { test: true, createdBy: 'test-script' }
      };

      const createResponse = await this.api.post('/api/configurations', testConfig);
      console.log('✅ Конфигурация создана:', createResponse.data.success);
      
      // Тест получения статистики
      const statsResponse = await this.api.get('/api/stats');
      console.log('✅ Статистика получена:', statsResponse.data);

      // Тест WebSocket статистики
      const wsStatsResponse = await this.api.get('/api/websocket/stats');
      console.log('✅ WebSocket статистика:', wsStatsResponse.data);

      this.testResults.api = true;
      this.testConfigId = testConfig.id;
    } catch (error) {
      console.error('❌ REST API test failed:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
    }
    console.log('');
  }

  async testWebSocketAPI() {
    console.log('🔌 === ТЕСТ WEBSOCKET API ===');
    
    return new Promise((resolve) => {
      let messageCount = 0;
      let subscriptionId = null;
      
      const ws = new WebSocket(this.wsUrl);
      
      const timeout = setTimeout(() => {
        console.log('⏰ WebSocket тест завершен по таймауту');
        ws.close();
        resolve();
      }, 15000);

      ws.on('open', () => {
        console.log('✅ WebSocket подключен');
        
        // Создаем подписку на тестовые данные
        subscriptionId = 'test-sub-' + Date.now();
        const subscription = {
          type: 'subscribe',
          subscriptionId,
          payload: {
            machineId: 'pmac-001',
            variableType: 'P',
            interval: 3000,
          },
          timestamp: new Date(),
        };
        
        ws.send(JSON.stringify(subscription));
        console.log('📝 Подписка отправлена:', subscriptionId);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          messageCount++;
          
          console.log(`📩 Сообщение ${messageCount}: ${message.type}`);
          
          if (message.type === 'subscribe' && message.payload?.success) {
            console.log('✅ Подписка подтверждена');
          }
          
          if (message.type === 'data') {
            console.log(`📊 Получены данные: ${message.payload?.count || 0} точек`);
            this.testResults.websocket = true;
            
            // После получения данных отменяем подписку
            if (subscriptionId) {
              ws.send(JSON.stringify({
                type: 'unsubscribe',
                subscriptionId,
                timestamp: new Date(),
              }));
              console.log('🗑️ Подписка отменена');
              subscriptionId = null;
            }
          }
          
          if (message.type === 'unsubscribe') {
            console.log('✅ Отмена подписки подтверждена');
            clearTimeout(timeout);
            ws.close();
            resolve();
          }
        } catch (error) {
          console.error('❌ Ошибка парсинга WebSocket сообщения:', error);
        }
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket ошибка:', error.message);
        clearTimeout(timeout);
        resolve();
      });

      ws.on('close', () => {
        console.log('🔌 WebSocket закрыт');
        console.log(`📊 Всего получено сообщений: ${messageCount}`);
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  async testDatabaseOperations() {
    console.log('🗄️ === ТЕСТ БАЗЫ ДАННЫХ ===');
    
    try {
      // Получаем данные за последний час
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const dataResponse = await this.api.get('/api/data-points', {
        params: {
          machineId: 'pmac-001',
          startTime,
          endTime,
          limit: 10,
        }
      });
      
      console.log('✅ Данные из БД получены:', {
        success: dataResponse.data.success,
        count: dataResponse.data.data?.length || 0,
      });
      
      // Тестируем cleanup
      const cleanupResponse = await this.api.post('/api/cleanup', {
        retentionDays: 30,
      });
      
      console.log('✅ Cleanup выполнен:', cleanupResponse.data);
      
      this.testResults.database = true;
    } catch (error) {
      console.error('❌ Database test failed:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
    }
    console.log('');
  }

  async testQualityMonitoring() {
    console.log('⚡ === ТЕСТ МОНИТОРИНГА КАЧЕСТВА ===');
    
    try {
      // Получаем статистику качества
      const qualityStatsResponse = await this.api.get('/api/quality/stats');
      console.log('✅ Статистика качества:', qualityStatsResponse.data);
      
      // Получаем метрики для машины
      const metricsResponse = await this.api.get('/api/quality/metrics/pmac-001');
      console.log('✅ Метрики качества для pmac-001:', {
        success: metricsResponse.data.success,
        hasData: !!metricsResponse.data.data,
      });
      
      // Получаем активные алерты
      const alertsResponse = await this.api.get('/api/quality/alerts');
      console.log('✅ Активные алерты:', {
        success: alertsResponse.data.success,
        count: alertsResponse.data.data?.length || 0,
      });
      
      this.testResults.quality = true;
    } catch (error) {
      console.error('❌ Quality monitoring test failed:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
    }
    console.log('');
  }

  printSummary() {
    console.log('📋 === ИТОГИ ТЕСТИРОВАНИЯ ===');
    
    const results = Object.entries(this.testResults);
    const passed = results.filter(([, result]) => result).length;
    const total = results.length;
    
    results.forEach(([test, result]) => {
      const icon = result ? '✅' : '❌';
      const status = result ? 'ПРОЙДЕН' : 'ПРОВАЛЕН';
      console.log(`${icon} ${test.toUpperCase()}: ${status}`);
    });
    
    console.log(`\n🎯 Результат: ${passed}/${total} тестов пройдено`);
    
    if (passed === total) {
      console.log('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Data Collection Service работает корректно.');
    } else {
      console.log('⚠️  Некоторые тесты провалены. Проверьте логи выше.');
    }
    
    console.log('\n📚 Полезные команды:');
    console.log(`• Запуск сервиса: cd services/data-collection && npm run dev`);
    console.log(`• WebSocket тест: node test-websocket-client.js`);
    console.log(`• REST API docs: GET ${this.baseUrl}/api`);
  }
}

// Функция для проверки доступности сервисов
async function checkPrerequisites() {
  console.log('🔧 Проверка предварительных условий...\n');
  
  const checks = [
    {
      name: 'PostgreSQL',
      check: async () => {
        const { default: pkg } = await import('pg');
        const { Client } = pkg;
        const client = new Client({
          host: 'localhost',
          port: 5432,
          database: 'pmac_assistant',
          user: 'postgres',
          password: 'postgres',
        });
        await client.connect();
        await client.query('SELECT NOW()');
        await client.end();
      }
    },
    {
      name: 'Redis',
      check: async () => {
        const { createClient } = await import('redis');
        const client = createClient({
          socket: { host: 'localhost', port: 6379 }
        });
        await client.connect();
        await client.ping();
        await client.quit();
      }
    }
  ];
  
  for (const { name, check } of checks) {
    try {
      await check();
      console.log(`✅ ${name} доступен`);
    } catch (error) {
      console.log(`❌ ${name} недоступен:`, error.message);
      console.log(`ℹ️  Убедитесь, что ${name} запущен и настроен`);
    }
  }
  console.log('');
}

// Главная функция
async function main() {
  console.log('🚀 Data Collection Service - Комплексное тестирование\n');
  
  // Проверяем зависимости
  await checkPrerequisites();
  
  // Запускаем тесты
  const tester = new DataCollectionTester();
  await tester.runAllTests();
}

// Обработка ошибок и сигналов
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Тестирование прервано пользователем');
  process.exit(0);
});

// Запуск
main().catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});
