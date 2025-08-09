// Простой тестовый клиент для Knowledge Base Service
import http from 'http';

const KB_HOST = 'localhost';
const KB_PORT = 3002;

// Утилита для HTTP запросов
function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: KB_HOST,
            port: KB_PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: jsonData
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// Тестовые функции
async function testHealthCheck() {
    console.log('\n🔍 Тест 1: Health Check');
    try {
        const response = await makeRequest('GET', '/health');
        console.log(`✅ Статус: ${response.statusCode}`);
        console.log('📋 Ответ:', JSON.stringify(response.data, null, 2));
        return response.statusCode === 200;
    } catch (error) {
        console.log('❌ Ошибка:', error.message);
        return false;
    }
}

async function testApiDocumentation() {
    console.log('\n🔍 Тест 2: API Documentation');
    try {
        const response = await makeRequest('GET', '/api');
        console.log(`✅ Статус: ${response.statusCode}`);
        console.log('📋 Сервис:', response.data.service);
        console.log('📋 Версия:', response.data.version);
        console.log('📋 Доступные endpoints:', Object.keys(response.data.endpoints || {}));
        return response.statusCode === 200;
    } catch (error) {
        console.log('❌ Ошибка:', error.message);
        return false;
    }
}

async function testSearch() {
    console.log('\n🔍 Тест 3: Поиск документов');
    try {
        const searchQuery = {
            query: "PMAC контроллер настройка",
            limit: 5,
            threshold: 0.7
        };

        const response = await makeRequest('POST', '/search', searchQuery);
        console.log(`✅ Статус: ${response.statusCode}`);
        
        if (response.data.success) {
            console.log('📋 Результатов найдено:', response.data.data.totalCount);
            console.log('📋 Запрос:', response.data.data.query);
        } else {
            console.log('❌ Ошибка поиска:', response.data.error);
        }
        
        return response.statusCode === 200;
    } catch (error) {
        console.log('❌ Ошибка:', error.message);
        return false;
    }
}

async function testAIQuestion() {
    console.log('\n🔍 Тест 4: AI вопрос');
    try {
        const question = {
            query: "Как подключить ось к PMAC контроллеру?",
            maxSources: 3
        };

        const response = await makeRequest('POST', '/ask', question);
        console.log(`✅ Статус: ${response.statusCode}`);
        
        if (response.data.success) {
            console.log('📋 AI ответ получен, длина:', response.data.data.answer.length);
            console.log('📋 Источников использовано:', response.data.data.sources.length);
            console.log('📋 Уверенность:', (response.data.data.confidence * 100).toFixed(1) + '%');
        } else {
            console.log('❌ Ошибка AI:', response.data.error);
            if (response.data.details) {
                console.log('📋 Детали:', response.data.details);
            }
        }
        
        return response.statusCode === 200;
    } catch (error) {
        console.log('❌ Ошибка:', error.message);
        return false;
    }
}

async function testStats() {
    console.log('\n🔍 Тест 5: Статистика');
    try {
        const response = await makeRequest('GET', '/stats');
        console.log(`✅ Статус: ${response.statusCode}`);
        
        if (response.data.success) {
            const stats = response.data.data;
            console.log('📋 Документов:', stats.documents.totalDocuments);
            console.log('📋 Активных задач:', stats.processing.activeJobs);
        } else {
            console.log('❌ Ошибка получения статистики:', response.data.error);
        }
        
        return response.statusCode === 200;
    } catch (error) {
        console.log('❌ Ошибка:', error.message);
        return false;
    }
}

// Основная функция тестирования
async function runTests() {
    console.log('🚀 Запуск тестов Knowledge Base Service');
    console.log(`🔗 Подключение к http://${KB_HOST}:${KB_PORT}`);
    
    const tests = [
        { name: 'Health Check', fn: testHealthCheck },
        { name: 'API Documentation', fn: testApiDocumentation },
        { name: 'Search', fn: testSearch },
        { name: 'AI Question', fn: testAIQuestion },
        { name: 'Statistics', fn: testStats }
    ];

    let passed = 0;
    let total = tests.length;

    for (const test of tests) {
        try {
            const result = await test.fn();
            if (result) {
                passed++;
            }
        } catch (error) {
            console.log(`❌ Тест "${test.name}" упал с ошибкой:`, error.message);
        }
        
        // Небольшая пауза между тестами
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n📊 Результаты тестирования:');
    console.log(`✅ Успешно: ${passed}/${total}`);
    console.log(`❌ Неудачно: ${total - passed}/${total}`);
    
    if (passed === total) {
        console.log('🎉 Все тесты прошли успешно!');
    } else if (passed > 0) {
        console.log('⚠️  Некоторые тесты прошли, но есть проблемы');
    } else {
        console.log('💥 Все тесты провалились. Проверьте, что сервис запущен');
    }

    return passed === total;
}

// Проверка подключения к серверу
async function checkConnection() {
    console.log('🔗 Проверка подключения к Knowledge Base Service...');
    try {
        const response = await makeRequest('GET', '/health');
        console.log('✅ Сервис доступен!');
        return true;
    } catch (error) {
        console.log('❌ Сервис недоступен:', error.message);
        console.log('💡 Убедитесь, что Knowledge Base Service запущен на порту 3002');
        return false;
    }
}

// Запуск
if (process.argv.includes('--check')) {
    checkConnection();
} else {
    checkConnection().then(connected => {
        if (connected) {
            runTests();
        }
    });
}
