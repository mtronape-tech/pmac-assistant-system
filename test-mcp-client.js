const http = require('http');

// Простой тестовый клиент для MCP сервера
async function testMCPServer() {
  console.log('Тестирование MCP сервера...\n');

  // Тест 1: Health check
  console.log('1. Проверка health endpoint...');
  try {
    const healthResponse = await makeRequest('GET', '/health');
    console.log('✅ Health check успешен:', healthResponse);
  } catch (error) {
    console.log('❌ Health check не удался:', error.message);
  }

  // Тест 2: Чтение переменной PMAC
  console.log('\n2. Тест чтения переменной PMAC...');
  try {
    const readResponse = await makeRequest('POST', '/mcp', {
      method: 'tools/call',
      params: {
        name: 'read_pmac_variable',
        arguments: {
          variableType: 'P',
          address: 1,
          machineId: 'test-machine'
        }
      }
    });
    console.log('✅ Чтение переменной PMAC успешно:', readResponse);
  } catch (error) {
    console.log('❌ Чтение переменной PMAC не удалось:', error.message);
  }

  // Тест 3: Получение статуса PMAC
  console.log('\n3. Тест получения статуса PMAC...');
  try {
    const statusResponse = await makeRequest('POST', '/mcp', {
      method: 'tools/call',
      params: {
        name: 'get_pmac_status',
        arguments: {
          machineId: 'test-machine'
        }
      }
    });
    console.log('✅ Получение статуса PMAC успешно:', statusResponse);
  } catch (error) {
    console.log('❌ Получение статуса PMAC не удалось:', error.message);
  }

  // Тест 4: Анализ трендов
  console.log('\n4. Тест анализа трендов...');
  try {
    const trendsResponse = await makeRequest('POST', '/mcp', {
      method: 'tools/call',
      params: {
        name: 'analyze_trends',
        arguments: {
          variableType: 'P',
          address: 1,
          hours: 24,
          machineId: 'test-machine'
        }
      }
    });
    console.log('✅ Анализ трендов успешен:', trendsResponse);
  } catch (error) {
    console.log('❌ Анализ трендов не удался:', error.message);
  }

  // Тест 5: Генерация рекомендаций
  console.log('\n5. Тест генерации рекомендаций...');
  try {
    const recommendationsResponse = await makeRequest('POST', '/mcp', {
      method: 'tools/call',
      params: {
        name: 'generate_recommendations',
        arguments: {
          focus: 'performance',
          machineId: 'test-machine',
          hours: 24
        }
      }
    });
    console.log('✅ Генерация рекомендаций успешна:', recommendationsResponse);
  } catch (error) {
    console.log('❌ Генерация рекомендаций не удалась:', error.message);
  }

  console.log('\n🎉 Тестирование завершено!');
}

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = body ? JSON.parse(body) : null;
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        } catch (error) {
          reject(new Error(`Ошибка парсинга ответа: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Ошибка запроса: ${error.message}`));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Запуск тестов
testMCPServer().catch(console.error);
