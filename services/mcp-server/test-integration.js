import http from 'http';

const MCP_SERVER_URL = 'http://localhost:3000';

// Генерируем случайный sessionId
const sessionId = 'test-session-' + Math.random().toString(36).substring(7);

// Функция для выполнения MCP запроса
async function mcpRequest(toolName, args) {
  const requestData = {
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args
    }
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(requestData);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-Session-ID': sessionId
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ statusCode: res.statusCode, response });
        } catch (err) {
          reject(new Error(`Ошибка парсинга JSON: ${err.message}, данные: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

// Функция для тестирования
async function runTests() {
  console.log('🧪 Начинаем тестирование интеграции MCP Server <-> PMAC Control Service\n');
  
  try {
    // Тест 1: Чтение переменной P1
    console.log('📊 Тест 1: Чтение переменной P1');
    const readResult = await mcpRequest('read_pmac_variable', {
      variableType: 'P',
      address: 1
    });
    
    console.log('Статус:', readResult.statusCode);
    if (readResult.response && readResult.response.content) {
      const content = JSON.parse(readResult.response.content[0].text);
      console.log('Результат:', content);
      
      if (content.success) {
        console.log('✅ Чтение переменной P1 успешно:', content.variable, '=', content.value);
      } else {
        console.log('❌ Ошибка чтения переменной:', content.error);
      }
    }
    console.log('');

    // Тест 2: Запись переменной P10
    console.log('📝 Тест 2: Запись переменной P10 = 777.7');
    const writeResult = await mcpRequest('write_pmac_variable', {
      variableType: 'P',
      address: 10,
      value: 777.7
    });
    
    console.log('Статус:', writeResult.statusCode);
    if (writeResult.response && writeResult.response.content) {
      const content = JSON.parse(writeResult.response.content[0].text);
      console.log('Результат:', content);
      
      if (content.success) {
        console.log('✅ Запись переменной P10 успешна:', content.variable, '=', content.value);
      } else {
        console.log('❌ Ошибка записи переменной:', content.error);
      }
    }
    console.log('');

    // Тест 3: Выполнение команды START
    console.log('🚀 Тест 3: Выполнение команды START');
    const commandResult = await mcpRequest('execute_pmac_command', {
      command: 'START'
    });
    
    console.log('Статус:', commandResult.statusCode);
    if (commandResult.response && commandResult.response.content) {
      const content = JSON.parse(commandResult.response.content[0].text);
      console.log('Результат:', content);
      
      if (content.success) {
        console.log('✅ Команда START выполнена успешно:', content.result);
      } else {
        console.log('❌ Ошибка выполнения команды:', content.error);
      }
    }
    console.log('');

    // Тест 4: Получение статуса PMAC
    console.log('📈 Тест 4: Получение статуса PMAC');
    const statusResult = await mcpRequest('get_pmac_status', {
      includeAxes: true
    });
    
    console.log('Статус:', statusResult.statusCode);
    if (statusResult.response && statusResult.response.content) {
      const content = JSON.parse(statusResult.response.content[0].text);
      console.log('Результат:', content);
      
      if (content.success) {
        console.log('✅ Статус PMAC получен успешно:');
        console.log('   - Состояние контроллера:', content.status.controllerState);
        console.log('   - Статус связи:', content.status.communicationStatus);
        console.log('   - Координаты:', Object.keys(content.status.coordinates).length, 'осей');
        console.log('   - Температура:', content.status.system?.temperature, '°C');
      } else {
        console.log('❌ Ошибка получения статуса:', content.error);
      }
    }
    console.log('');

    // Тест 5: Проверка чтения записанной переменной P10
    console.log('🔍 Тест 5: Проверка записанной переменной P10');
    const readP10Result = await mcpRequest('read_pmac_variable', {
      variableType: 'P',
      address: 10
    });
    
    console.log('Статус:', readP10Result.statusCode);
    if (readP10Result.response && readP10Result.response.content) {
      const content = JSON.parse(readP10Result.response.content[0].text);
      console.log('Результат:', content);
      
      if (content.success) {
        console.log('✅ Чтение переменной P10 успешно:', content.variable, '=', content.value);
        if (Math.abs(content.value - 777.7) < 0.001) {
          console.log('✅ Значение соответствует записанному!');
        } else {
          console.log('⚠️  Значение не соответствует записанному (ожидалось 777.7)');
        }
      } else {
        console.log('❌ Ошибка чтения переменной:', content.error);
      }
    }

    console.log('\n🎉 Тестирование завершено!');
    
  } catch (error) {
    console.error('❌ Ошибка во время тестирования:', error.message);
  }
}

// Запускаем тесты
runTests();
