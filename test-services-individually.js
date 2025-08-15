#!/usr/bin/env node
/**
 * Индивидуальное тестирование каждого сервиса
 * Помогает понять, какие сервисы можно запустить
 */

console.log('🧪 Индивидуальное тестирование сервисов PMAC Assistant System');
console.log('=' * 60);

// Функция для проверки сервиса
async function checkService(name, port, description) {
    console.log(`\n🔍 Тестирование: ${name}`);
    console.log(`   Порт: ${port}`);
    console.log(`   Описание: ${description}`);
    
    try {
        const response = await fetch(`http://localhost:${port}/health`, { 
            signal: AbortSignal.timeout(5000) 
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`   ✅ Статус: ЗАПУЩЕН`);
            console.log(`   📊 Ответ: ${JSON.stringify(data, null, 2)}`);
            return true;
        } else {
            console.log(`   ❌ Статус: ОШИБКА ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Статус: НЕ ЗАПУЩЕН`);
        console.log(`   💡 Причина: ${error.message}`);
        return false;
    }
}

// Функция для проверки Python сервиса
async function checkPythonService(name, port, description) {
    console.log(`\n🔍 Тестирование: ${name}`);
    console.log(`   Порт: ${port}`);
    console.log(`   Описание: ${description}`);
    console.log(`   Тип: Python (FastAPI)`);
    
    try {
        const response = await fetch(`http://localhost:${port}/health`, { 
            signal: AbortSignal.timeout(5000) 
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`   ✅ Статус: ЗАПУЩЕН`);
            console.log(`   📊 Ответ: ${JSON.stringify(data, null, 2)}`);
            
            // Проверяем документацию
            try {
                const docsResponse = await fetch(`http://localhost:${port}/docs`);
                if (docsResponse.ok) {
                    console.log(`   📚 Swagger UI: доступен`);
                } else {
                    console.log(`   📚 Swagger UI: недоступен`);
                }
            } catch (docsError) {
                console.log(`   📚 Swagger UI: недоступен`);
            }
            
            return true;
        } else {
            console.log(`   ❌ Статус: ОШИБКА ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Статус: НЕ ЗАПУЩЕН`);
        console.log(`   💡 Причина: ${error.message}`);
        return false;
    }
}

// Главная функция тестирования
async function runIndividualTests() {
    console.log('🚀 Запуск индивидуального тестирования...');
    
    const results = [];
    
    // Тестируем каждый сервис
    results.push(await checkPythonService(
        'Analytics Service', 
        3003, 
        'Аналитика и визуализация данных PMAC'
    ));
    
    results.push(await checkService(
        'MCP Server', 
        3000, 
        'Model Context Protocol сервер для интеграции с AI'
    ));
    
    results.push(await checkService(
        'PMAC Control Service', 
        3001, 
        'Управление PMAC контроллерами'
    ));
    
    results.push(await checkService(
        'Knowledge Base Service', 
        3002, 
        'База знаний и векторная база данных'
    ));
    
    results.push(await checkService(
        'Data Collection Service', 
        3008, 
        'Сбор данных с PMAC контроллеров'
    ));
    
    // Выводим итоговые результаты
    console.log('\n📋 Итоговые результаты тестирования');
    console.log('=' * 60);
    
    const services = [
        'Analytics Service (порт 3003)',
        'MCP Server (порт 3000)', 
        'PMAC Control Service (порт 3001)',
        'Knowledge Base Service (порт 3002)',
        'Data Collection Service (порт 3008)'
    ];
    
    services.forEach((service, index) => {
        const status = results[index] ? '✅' : '❌';
        console.log(`   ${status} ${service}`);
    });
    
    const workingServices = results.filter(r => r).length;
    const totalServices = results.length;
    
    console.log(`\n📊 Работает: ${workingServices}/${totalServices} сервисов`);
    
    if (workingServices === totalServices) {
        console.log('\n🎉 Все сервисы работают!');
    } else if (workingServices > 0) {
        console.log('\n⚠️  Частично работает. Рекомендации:');
        
        if (!results[0]) {
            console.log('   - Analytics Service: cd services/analytics && python simple_analytics_service.py');
        }
        
        if (!results[1]) {
            console.log('   - MCP Server: cd services/mcp-server && npm run dev-simple');
        }
        
        if (!results[2]) {
            console.log('   - PMAC Control: cd services/pmac-control && npm run dev');
        }
        
        if (!results[3]) {
            console.log('   - Knowledge Base: cd services/knowledge-base && npm run dev');
        }
        
        if (!results[4]) {
            console.log('   - Data Collection: cd services/data-collection && npm run dev');
        }
    } else {
        console.log('\n❌ Ни один сервис не работает!');
        console.log('   Проверьте зависимости и конфигурацию.');
    }
    
    console.log('\n🎯 Рабочие сервисы:');
    if (results[0]) console.log('   - Analytics: http://localhost:3003/docs');
    if (results[1]) console.log('   - MCP Server: http://localhost:3000/health');
    if (results[2]) console.log('   - PMAC Control: http://localhost:3001/health');
    if (results[3]) console.log('   - Knowledge Base: http://localhost:3002/health');
    if (results[4]) console.log('   - Data Collection: http://localhost:3008/health');
}

// Запускаем тесты
runIndividualTests().catch(console.error);
