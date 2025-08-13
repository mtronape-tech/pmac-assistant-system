#!/usr/bin/env node

/**
 * Автоматический запуск тестов Data Collection Service
 * Запускает все необходимые сервисы и проводит комплексное тестирование
 */

import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TestRunner {
  constructor() {
    this.processes = [];
    this.testResults = {};
  }

  async runTests() {
    console.log('🧪 Автоматическое тестирование Data Collection Service\n');
    
    try {
      // Шаг 1: Проверяем зависимости
      await this.checkDependencies();
      
      // Шаг 2: Запускаем мок PMAC сервер
      await this.startMockPMACServer();
      
      // Шаг 3: Собираем проект
      await this.buildProject();
      
      // Шаг 4: Запускаем Data Collection сервис
      await this.startDataCollectionService();
      
      // Шаг 5: Ждем готовности сервисов
      await this.waitForServices();
      
      // Шаг 6: Запускаем тесты
      await this.runFullTests();
      
      // Шаг 7: Опциональные WebSocket тесты
      await this.runWebSocketTests();
      
    } catch (error) {
      console.error('❌ Ошибка при тестировании:', error.message);
    } finally {
      await this.cleanup();
    }
  }

  async checkDependencies() {
    console.log('🔧 Проверка зависимостей...');
    
    const requiredCommands = ['node', 'npm', 'psql', 'redis-cli'];
    
    for (const cmd of requiredCommands) {
      try {
        await this.execCommand(`${cmd} --version`);
        console.log(`✅ ${cmd} доступен`);
      } catch (error) {
        console.log(`⚠️  ${cmd} не найден или недоступен`);
      }
    }
    
    // Проверяем установку зависимостей
    if (!fs.existsSync('node_modules')) {
      console.log('📦 Устанавливаем зависимости...');
      await this.execCommand('npm install');
    }
    
    console.log('');
  }

  async startMockPMACServer() {
    console.log('🤖 Запуск Mock PMAC Server...');
    
    const mockServer = spawn('node', ['mock-pmac-server.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, SIMULATE_DISCONNECTS: 'false' }
    });
    
    this.processes.push({ name: 'Mock PMAC', process: mockServer });
    
    mockServer.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) console.log(`[PMAC] ${output}`);
    });
    
    mockServer.stderr.on('data', (data) => {
      console.error(`[PMAC ERROR] ${data}`);
    });
    
    // Ждем запуска
    await this.sleep(3000);
    console.log('✅ Mock PMAC Server запущен\n');
  }

  async buildProject() {
    console.log('🔨 Сборка проекта...');
    
    try {
      await this.execCommand('npm run build');
      console.log('✅ Проект собран\n');
    } catch (error) {
      console.log('⚠️  Ошибка сборки, продолжаем с исходниками\n');
    }
  }

  async startDataCollectionService() {
    console.log('🚀 Запуск Data Collection Service...');
    
    // Используем тестовую конфигурацию
    const envFile = path.join(__dirname, 'test.env');
    const env = { ...process.env };
    
    // Загружаем переменные из test.env
    if (fs.existsSync(envFile)) {
      const envContent = fs.readFileSync(envFile, 'utf8');
      envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          env[key.trim()] = value.trim();
        }
      });
      console.log('📝 Загружена тестовая конфигурация');
    }
    
    // Отключаем PMAC control для тестов
    env.PMAC_CONTROL_ENABLED = 'true'; // Включаем, поскольку мок-сервер работает
    env.PMAC_CONTROL_BASE_URL = 'http://localhost:3007';
    
    const dcService = spawn('npm', ['run', 'dev'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env
    });
    
    this.processes.push({ name: 'Data Collection', process: dcService });
    
    dcService.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) console.log(`[DC] ${output}`);
    });
    
    dcService.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output && !output.includes('ExperimentalWarning')) {
        console.error(`[DC ERROR] ${output}`);
      }
    });
    
    console.log('✅ Data Collection Service запущен\n');
  }

  async waitForServices() {
    console.log('⏳ Ожидание готовности сервисов...');
    
    const services = [
      { name: 'Mock PMAC', url: 'http://localhost:3007/api/info' },
      { name: 'Data Collection', url: 'http://localhost:3001/health' }
    ];
    
    for (const service of services) {
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        try {
          const response = await fetch(service.url);
          if (response.ok) {
            console.log(`✅ ${service.name} готов`);
            break;
          }
        } catch (error) {
          // Продолжаем ждать
        }
        
        attempts++;
        await this.sleep(1000);
        
        if (attempts === maxAttempts) {
          throw new Error(`${service.name} не готов после ${maxAttempts} попыток`);
        }
      }
    }
    
    console.log('✅ Все сервисы готовы\n');
  }

  async runFullTests() {
    console.log('🧪 Запуск полного тестирования...');
    
    try {
      await this.execCommand('node test-full-functionality.js');
      console.log('✅ Полное тестирование завершено\n');
      this.testResults.full = true;
    } catch (error) {
      console.error('❌ Ошибка полного тестирования:', error.message);
      this.testResults.full = false;
    }
  }

  async runWebSocketTests() {
    console.log('🔌 Запуск WebSocket тестов...');
    
    try {
      // Запускаем WebSocket тест с таймаутом
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('WebSocket тест превысил таймаут')), 20000)
      );
      
      const test = this.execCommand('node test-websocket-client.js');
      
      await Promise.race([test, timeout]);
      console.log('✅ WebSocket тесты завершены\n');
      this.testResults.websocket = true;
    } catch (error) {
      console.error('❌ Ошибка WebSocket тестов:', error.message);
      this.testResults.websocket = false;
    }
  }

  async cleanup() {
    console.log('🧹 Очистка процессов...');
    
    for (const { name, process } of this.processes) {
      try {
        process.kill('SIGTERM');
        console.log(`🛑 ${name} остановлен`);
      } catch (error) {
        console.log(`⚠️  Ошибка остановки ${name}:`, error.message);
      }
    }
    
    // Ждем завершения процессов
    await this.sleep(2000);
    
    console.log('\n📊 ИТОГИ ТЕСТИРОВАНИЯ:');
    Object.entries(this.testResults).forEach(([test, result]) => {
      const icon = result ? '✅' : '❌';
      console.log(`${icon} ${test}: ${result ? 'ПРОЙДЕН' : 'ПРОВАЛЕН'}`);
    });
    
    const passed = Object.values(this.testResults).filter(Boolean).length;
    const total = Object.values(this.testResults).length;
    
    console.log(`\n🎯 Результат: ${passed}/${total} тестов пройдено`);
    
    if (passed === total) {
      console.log('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!');
    } else {
      console.log('⚠️  Некоторые тесты провалены.');
      process.exit(1);
    }
  }

  execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Функция для настройки fetch
async function setupFetch() {
  if (!global.fetch) {
    console.log('📦 Проверяем node-fetch...');
    try {
      const { default: fetch } = await import('node-fetch');
      global.fetch = fetch;
    } catch (error) {
      console.log('⚠️  Используется встроенный fetch Node.js 18+');
    }
  }
}

// Главная функция
async function main() {
  await setupFetch();
  
  // Обработка сигналов
  process.on('SIGINT', () => {
    console.log('\n🛑 Тестирование прервано');
    process.exit(0);
  });

  // Запуск
  const runner = new TestRunner();
  await runner.runTests();
}

// Запуск
main().catch(console.error);
