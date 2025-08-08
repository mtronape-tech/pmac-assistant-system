import http from 'http';

// Упрощенный тестовый клиент для MCP сервера
async function testSimpleMCPServer() {
  console.log('🧪 Тестирование упрощенного MCP сервера...\n');

  // Тест 1: Health check
  console.log('1. ✅ Проверка health endpoint...');
  try {
    const healthResponse = await makeRequest('GET', '/health');
    console.log('   Health check успешен:', healthResponse);
  } catch (error) {
    console.log('   ❌ Health check не удался:', error.message);
    return;
  }

  // Тест 2: Чтение переменной PMAC
  console.log('\n2. 📖 Тест чтения переменной PMAC...');
  try {
    const readResponse = await makeRequest('POST', '/mcp?sessionId=test-session', {
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
    console.log('   ✅ Чтение переменной PMAC успешно:', readResponse);
  } catch (error) {
    console.log('   ❌ Чтение переменной PMAC не удалось:', error.message);
  }

  // Тест 3: Получение статуса PMAC
  console.log('\n3. 📊 Тест получения статуса PMAC...');
  try {
    const statusResponse = await makeRequest('POST', '/mcp?sessionId=test-session', {
      method: 'tools/call',
      params: {
        name: 'get_pmac_status',
        arguments: {
          machineId: 'test-machine'
        }
      }
    });
    console.log('   ✅ Получение статуса PMAC успешно:', statusResponse);
  } catch (error) {
    console.log('   ❌ Получение статуса PMAC не удалось:', error.message);
  }

  // Тест 4: Выполнение команды PMAC
  console.log('\n4. ⚙️ Тест выполнения команды PMAC...');
  try {
    const commandResponse = await makeRequest('POST', '/mcp?sessionId=test-session', {
      method: 'tools/call',
      params: {
        name: 'execute_pmac_command',
        arguments: {
          command: 'HOME',
          machineId: 'test-machine',
          confirm: true
        }
      }
    });
    console.log('   ✅ Выполнение команды PMAC успешно:', commandResponse);
  } catch (error) {
    console.log('   ❌ Выполнение команды PMAC не удалось:', error.message);
  }

  // Тест 5: Чтение другой переменной
  console.log('\n5. 🔢 Тест чтения другой переменной...');
  try {
    const readResponse2 = await makeRequest('POST', '/mcp?sessionId=test-session', {
      method: 'tools/call',
      params: {
        name: 'read_pmac_variable',
        arguments: {
          variableType: 'Q',
          address: 1,
          machineId: 'test-machine'
        }
      }
    });
    console.log('   ✅ Чтение переменной Q1 успешно:', readResponse2);
  } catch (error) {
    console.log('   ❌ Чтение переменной Q1 не удалось:', error.message);
  }

  console.log('\n🎉 Тестирование завершено!');
  console.log('\n📝 Примечание: Для полноценного тестирования MCP протокола');
  console.log('   нужно использовать специальный MCP клиент, который');
  console.log('   поддерживает SSE соединения и правильную инициализацию сессий.');
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
console.log('🚀 Запуск тестового клиента...\n');
testSimpleMCPServer().catch(console.error);
