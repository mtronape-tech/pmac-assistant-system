#!/usr/bin/env node
/**
 * Общий тест всех сервисов проекта
 * Тестирует Analytics Service и MCP Server с SQLite
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Тестирование всех сервисов PMAC Assistant System');
console.log('=' * 60);
console.log('📊 Архитектура: SQLite + Node.js + Python');
console.log('🌐 Без Docker и PostgreSQL');
console.log();

// Функция для тестирования Analytics Service
async function testAnalyticsService() {
    console.log('📊 Тест 1: Analytics Service (Python + SQLite)');
    console.log('=' * 50);
    
    const baseUrl = 'http://localhost:3003';
    
    try {
        // Ждем запуска сервиса
        console.log('⏳ Ожидание запуска Analytics Service...');
        for (let attempt = 1; attempt <= 30; attempt++) {
            try {
                const response = await fetch(`${baseUrl}/health`);
                if (response.ok) {
                    console.log('✅ Analytics Service запущен!');
                    break;
                }
            } catch (error) {
                if (attempt < 30) {
                    console.log(`   Попытка ${attempt}/30...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    console.log('❌ Analytics Service не запустился за 30 секунд');
                    return false;
                }
            }
        }
        
        // Тестируем основные эндпоинты
        const endpoints = [
            { path: '/health', name: 'Health Check' },
            { path: '/api/analytics/machines', name: 'Machines List' },
            { path: '/api/analytics/statistics/PMAC_001', name: 'Statistics' },
            { path: '/api/analytics/trends/PMAC_001', name: 'Trends' },
            { path: '/api/analytics/correlation/PMAC_001', name: 'Correlation' },
            { path: '/api/analytics/charts/time-series/PMAC_001', name: 'Charts' }
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(`${baseUrl}${endpoint.path}`);
                if (response.ok) {
                    console.log(`   ✅ ${endpoint.name}: доступен`);
                } else {
                    console.log(`   ❌ ${endpoint.name}: ошибка ${response.status}`);
                }
            } catch (error) {
                console.log(`   ❌ ${endpoint.name}: недоступен`);
            }
        }
        
        // Проверяем документацию
        console.log('\n📚 Проверка API документации:');
        const docsEndpoints = ['/docs', '/redoc', '/openapi.json'];
        for (const doc of docsEndpoints) {
            try {
                const response = await fetch(`${baseUrl}${doc}`);
                if (response.ok) {
                    console.log(`   ✅ ${doc}: доступен`);
                } else {
                    console.log(`   ❌ ${doc}: ошибка ${response.status}`);
                }
            } catch (error) {
                console.log(`   ❌ ${doc}: недоступен`);
            }
        }
        
        console.log('✅ Analytics Service тестирование завершено');
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка при тестировании Analytics Service:', error.message);
        return false;
    }
}

// Функция для тестирования MCP Server
async function testMCPServer() {
    console.log('\n🔌 Тест 2: MCP Server (Node.js + SQLite)');
    console.log('=' * 50);
    
    const baseUrl = 'http://localhost:3000';
    
    try {
        // Ждем запуска сервиса
        console.log('⏳ Ожидание запуска MCP Server...');
        for (let attempt = 1; attempt <= 30; attempt++) {
            try {
                const response = await fetch(`${baseUrl}/health`);
                if (response.ok) {
                    console.log('✅ MCP Server запущен!');
                    break;
                }
            } catch (error) {
                if (attempt < 30) {
                    console.log(`   Попытка ${attempt}/30...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    console.log('❌ MCP Server не запустился за 30 секунд');
                    return false;
                }
            }
        }
        
        // Тестируем основные эндпоинты
        const endpoints = [
            { path: '/health', name: 'Health Check' },
            { path: '/mcp', name: 'MCP Endpoint' },
            { path: '/api/pmac/data', name: 'PMAC Data' },
            { path: '/api/pmac/configs', name: 'PMAC Configs' }
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(`${baseUrl}${endpoint.path}`);
                if (response.ok) {
                    console.log(`   ✅ ${endpoint.name}: доступен`);
                } else {
                    console.log(`   ⚠️  ${endpoint.name}: ошибка ${response.status}`);
                }
            } catch (error) {
                console.log(`   ❌ ${endpoint.name}: недоступен`);
            }
        }
        
        console.log('✅ MCP Server тестирование завершено');
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка при тестировании MCP Server:', error.message);
        return false;
    }
}

// Функция для проверки базы данных
async function checkDatabase() {
    console.log('\n🗄️  Тест 3: База данных SQLite');
    console.log('=' * 50);
    
    try {
        const fs = await import('fs');
        const dbPath = join(__dirname, 'analytics.db');
        
        if (fs.existsSync(dbPath)) {
            const stats = fs.statSync(dbPath);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            console.log(`   ✅ База данных найдена: ${dbPath}`);
            console.log(`   📊 Размер: ${sizeMB} MB`);
            console.log(`   🕐 Создана: ${stats.birthtime.toLocaleString()}`);
            console.log(`   🔄 Изменена: ${stats.mtime.toLocaleString()}`);
            return true;
        } else {
            console.log(`   ⚠️  База данных не найдена: ${dbPath}`);
            console.log('   💡 База данных будет создана при первом запуске сервисов');
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка при проверке базы данных:', error.message);
        return false;
    }
}

// Функция для проверки портов
async function checkPorts() {
    console.log('\n🌐 Тест 4: Проверка портов');
    console.log('=' * 50);
    
    const ports = [
        { port: 3000, service: 'MCP Server' },
        { port: 3003, service: 'Analytics Service' }
    ];
    
    let allPortsOk = true;
    
    for (const { port, service } of ports) {
        try {
            const response = await fetch(`http://localhost:${port}/health`, { 
                signal: AbortSignal.timeout(5000) 
            });
            if (response.ok) {
                console.log(`   ✅ Порт ${port} (${service}): открыт`);
            } else {
                console.log(`   ⚠️  Порт ${port} (${service}): ответ ${response.status}`);
                allPortsOk = false;
            }
        } catch (error) {
            console.log(`   ❌ Порт ${port} (${service}): закрыт или недоступен`);
            allPortsOk = false;
        }
    }
    
    return allPortsOk;
}

// Главная функция тестирования
async function runAllTests() {
    console.log('🧪 Запуск комплексного тестирования...');
    console.log();
    
    const results = {
        analytics: await testAnalyticsService(),
        mcp: await testMCPServer(),
        database: await checkDatabase(),
        ports: await checkPorts()
    };
    
    // Выводим итоговые результаты
    console.log('\n📋 Итоговые результаты тестирования');
    console.log('=' * 60);
    console.log(`   📊 Analytics Service: ${results.analytics ? '✅' : '❌'}`);
    console.log(`   🔌 MCP Server: ${results.mcp ? '✅' : '❌'}`);
    console.log(`   🗄️  База данных: ${results.database ? '✅' : '❌'}`);
    console.log(`   🌐 Порты: ${results.ports ? '✅' : '❌'}`);
    
    const allPassed = Object.values(results).every(result => result);
    
    if (allPassed) {
        console.log('\n🎉 Все тесты пройдены успешно!');
        console.log('\n🎯 Система готова к работе:');
        console.log('   - Analytics Service: http://localhost:3003/docs');
        console.log('   - MCP Server: http://localhost:3000');
        console.log('   - База данных: analytics.db (SQLite)');
        console.log('   - Архитектура: без Docker, только локальные сервисы');
    } else {
        console.log('\n❌ Некоторые тесты не пройдены.');
        console.log('\n🔧 Рекомендации по исправлению:');
        
        if (!results.analytics) {
            console.log('   - Запустите Analytics Service: cd services/analytics && python simple_analytics_service.py');
        }
        
        if (!results.mcp) {
            console.log('   - Запустите MCP Server: cd services/mcp-server && npm run dev-simple');
        }
        
        if (!results.database) {
            console.log('   - База данных будет создана автоматически при первом запуске');
        }
        
        if (!results.ports) {
            console.log('   - Проверьте, что порты 3000 и 3003 не заняты другими сервисами');
        }
    }
    
    console.log('\n📚 Документация:');
    console.log('   - README.md: инструкции по установке и запуску');
    console.log('   - Swagger UI: http://localhost:3003/docs');
    console.log('   - ReDoc: http://localhost:3003/redoc');
}

// Запускаем все тесты
runAllTests().catch(console.error);
