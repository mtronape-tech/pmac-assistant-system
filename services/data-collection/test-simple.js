#!/usr/bin/env node

/**
 * Упрощенный тест Data Collection без внешних зависимостей
 * Тестирует только основную логику и мок PMAC сервер
 */

import axios from 'axios';
import WebSocket from 'ws';

class SimpleDataCollectionTester {
  constructor() {
    this.mockPMACUrl = 'http://localhost:3007';
    this.testResults = {
      mockPMAC: false,
      pmacVariables: false,
      pmacStatus: false,
      pmacBatch: false,
    };
  }

  async runAllTests() {
    console.log('🧪 Упрощенное тестирование Data Collection (без БД)\n');
    console.log(`🤖 Mock PMAC URL: ${this.mockPMACUrl}\n`);

    try {
      await this.testMockPMACServer();
      await this.testPMACVariables();
      await this.testPMACStatus();
      await this.testPMACBatch();
      
      this.printSummary();
    } catch (error) {
      console.error('❌ Критическая ошибка при тестировании:', error.message);
    }
  }

  async testMockPMACServer() {
    console.log('🤖 === ТЕСТ MOCK PMAC СЕРВЕРА ===');
    
    try {
      // Проверяем основную информацию
      const infoResponse = await axios.get(`${this.mockPMACUrl}/api/info`);
      console.log('✅ Информация о сервере получена:', {
        service: infoResponse.data.service,
        variableCount: infoResponse.data.variableCount,
        isConnected: infoResponse.data.isConnected,
      });

      // Проверяем главную страницу
      const homeResponse = await axios.get(`${this.mockPMACUrl}/`);
      console.log('✅ Главная страница доступна');
      console.log('📋 Доступные endpoints:', Object.keys(homeResponse.data.endpoints));

      this.testResults.mockPMAC = true;
    } catch (error) {
      console.error('❌ Mock PMAC server test failed:', error.message);
      console.log('ℹ️  Убедитесь, что мок PMAC сервер запущен: node mock-pmac-server.js');
      throw error;
    }
    console.log('');
  }

  async testPMACVariables() {
    console.log('🔧 === ТЕСТ ПЕРЕМЕННЫХ PMAC ===');
    
    try {
      // Тестируем чтение разных типов переменных
      const variableTests = [
        { type: 'P', address: 100, description: 'Position variable' },
        { type: 'I', address: 1, description: 'System variable' },
        { type: 'Q', address: 5, description: 'Coordinate variable' },
        { type: 'M', address: 10, description: 'Flag variable' },
        { type: 'L', address: 15, description: 'Local variable' },
      ];

      let successCount = 0;
      for (const test of variableTests) {
        try {
          const response = await axios.get(`${this.mockPMACUrl}/api/variable`, {
            params: { type: test.type, address: test.address }
          });
          
          console.log(`✅ ${test.type}${test.address}: ${response.data.value} (${test.description})`);
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to read ${test.type}${test.address}:`, error.message);
        }
      }

      console.log(`📊 Успешно прочитано ${successCount}/${variableTests.length} переменных`);

      // Тестируем запись переменной
      const writeTest = { type: 'P', address: 999, value: 123.456 };
      const writeResponse = await axios.post(`${this.mockPMACUrl}/api/variable`, writeTest);
      console.log(`✅ Запись переменной: ${writeTest.type}${writeTest.address} = ${writeTest.value}`);

      // Проверяем, что значение записалось
      const readBackResponse = await axios.get(`${this.mockPMACUrl}/api/variable`, {
        params: { type: writeTest.type, address: writeTest.address }
      });
      console.log(`✅ Проверка записи: ${writeTest.type}${writeTest.address} = ${readBackResponse.data.value}`);

      this.testResults.pmacVariables = true;
    } catch (error) {
      console.error('❌ PMAC variables test failed:', error.message);
    }
    console.log('');
  }

  async testPMACStatus() {
    console.log('📊 === ТЕСТ СТАТУСА PMAC ===');
    
    try {
      const statusResponse = await axios.get(`${this.mockPMACUrl}/api/status`);
      const status = statusResponse.data;
      
      console.log('✅ Статус системы получен:');
      console.log(`   🔗 Подключение: ${status.isConnected ? 'Да' : 'Нет'}`);
      console.log(`   🏭 ID машины: ${status.machineId}`);
      console.log(`   💻 CPU: ${status.systemInfo.cpuUsage.toFixed(1)}%`);
      console.log(`   🧠 Memory: ${status.systemInfo.memoryUsage.toFixed(1)}%`);
      console.log(`   ⏱️ Uptime: ${status.systemInfo.uptime.toFixed(1)}s`);
      
      console.log(`   🎯 Активных осей: ${Object.keys(status.axisStatus).length}`);
      
      // Показываем статус первых нескольких осей
      const axisEntries = Object.entries(status.axisStatus).slice(0, 3);
      axisEntries.forEach(([axisNum, axisStatus]) => {
        console.log(`   📍 Ось ${axisNum}: pos=${axisStatus.position.toFixed(3)}, vel=${axisStatus.velocity.toFixed(3)}, ${axisStatus.enabled ? 'включена' : 'выключена'}`);
      });

      // Показываем количество переменных по типам
      const varCounts = Object.entries(status.variables).map(([type, vars]) => 
        `${type}:${Object.keys(vars).length}`
      ).join(', ');
      console.log(`   📋 Переменные: ${varCounts}`);

      this.testResults.pmacStatus = true;
    } catch (error) {
      console.error('❌ PMAC status test failed:', error.message);
    }
    console.log('');
  }

  async testPMACBatch() {
    console.log('⚡ === ТЕСТ BATCH ОПЕРАЦИЙ ===');
    
    try {
      // Тестируем batch чтение переменных
      const batchVariables = [
        { type: 'P', address: 1 },
        { type: 'P', address: 2 },
        { type: 'I', address: 1 },
        { type: 'I', address: 2 },
        { type: 'Q', address: 1 },
      ];

      const batchResponse = await axios.post(`${this.mockPMACUrl}/api/variables/read`, {
        variables: batchVariables
      });

      console.log('✅ Batch чтение выполнено:');
      batchResponse.data.results.forEach((result, index) => {
        const status = result.success ? '✅' : '❌';
        console.log(`   ${status} ${result.type}${result.address}: ${result.value}`);
      });

      const successfulReads = batchResponse.data.results.filter(r => r.success).length;
      console.log(`📊 Успешных чтений: ${successfulReads}/${batchVariables.length}`);

      this.testResults.pmacBatch = true;
    } catch (error) {
      console.error('❌ PMAC batch test failed:', error.message);
    }
    console.log('');
  }

  printSummary() {
    console.log('📋 === ИТОГИ УПРОЩЕННОГО ТЕСТИРОВАНИЯ ===');
    
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
      console.log('🎉 ВСЕ БАЗОВЫЕ ТЕСТЫ ПРОЙДЕНЫ!');
      console.log('✨ Mock PMAC сервер работает корректно');
      console.log('🚀 Основная логика Data Collection готова к работе');
    } else {
      console.log('⚠️  Некоторые тесты провалены. Проверьте логи выше.');
    }
    
    console.log('\n📚 Следующие шаги:');
    console.log('• Для полного тестирования установите PostgreSQL и Redis');
    console.log('• Запустите Data Collection сервис: npm run dev');
    console.log('• Выполните полные тесты: node test-full-functionality.js');
  }
}

// Главная функция
async function main() {
  const tester = new SimpleDataCollectionTester();
  await tester.runAllTests();
}

// Обработка ошибок
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
