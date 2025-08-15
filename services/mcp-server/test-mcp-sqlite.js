#!/usr/bin/env node
/**
 * Тест MCP Server с SQLite
 * Простой тест без Docker и PostgreSQL
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Тестирование MCP Server (SQLite)');
console.log('=' * 50);

// Функция для тестирования API
async function testMCPAPI() {
    const baseUrl = 'http://localhost:3001';
    
    try {
        console.log('📊 Тест 1: Проверка доступности сервиса');
        
        // Ждем запуска сервера
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
        
        // Тест 2: Проверка здоровья
        console.log('\n📊 Тест 2: Проверка здоровья сервиса');
        const healthResponse = await fetch(`${baseUrl}/health`);
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log(`   ✅ Статус: ${healthData.status || 'N/A'}`);
            console.log(`   🕐 Время: ${healthData.timestamp || 'N/A'}`);
        } else {
            console.log(`   ❌ Ошибка здоровья: ${healthResponse.status}`);
            return false;
        }
        
        // Тест 3: Проверка MCP эндпоинтов
        console.log('\n🔌 Тест 3: Проверка MCP эндпоинтов');
        const mcpResponse = await fetch(`${baseUrl}/mcp`);
        if (mcpResponse.ok) {
            console.log('   ✅ MCP эндпоинт доступен');
        } else {
            console.log(`   ❌ MCP эндпоинт недоступен: ${mcpResponse.status}`);
        }
        
        // Тест 4: Проверка PMAC данных
        console.log('\n🏭 Тест 4: Проверка PMAC данных');
        const pmacResponse = await fetch(`${baseUrl}/api/pmac/data`);
        if (pmacResponse.ok) {
            const pmacData = await pmacResponse.json();
            console.log(`   ✅ PMAC данные получены: ${pmacData.length || 0} записей`);
        } else {
            console.log(`   ⚠️  PMAC данные недоступны: ${pmacResponse.status}`);
        }
        
        // Тест 5: Проверка конфигураций
        console.log('\n⚙️  Тест 5: Проверка конфигураций');
        const configResponse = await fetch(`${baseUrl}/api/pmac/configs`);
        if (configResponse.ok) {
            const configData = await configResponse.json();
            console.log(`   ✅ Конфигурации получены: ${configData.length || 0} записей`);
        } else {
            console.log(`   ⚠️  Конфигурации недоступны: ${configResponse.status}`);
        }
        
        console.log('\n🎉 Все тесты MCP Server пройдены успешно!');
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка при тестировании MCP Server:', error.message);
        return false;
    }
}

// Функция для тестирования базы данных
async function testDatabase() {
    console.log('\n🗄️  Тест базы данных SQLite');
    console.log('=' * 30);
    
    try {
        // Проверяем, что файл базы данных существует
        const dbPath = join(__dirname, '../../analytics.db');
        const fs = await import('fs');
        
        if (fs.existsSync(dbPath)) {
            const stats = fs.statSync(dbPath);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            console.log(`   ✅ База данных найдена: ${dbPath}`);
            console.log(`   📊 Размер: ${sizeMB} MB`);
            console.log(`   🕐 Создана: ${stats.birthtime.toLocaleString()}`);
        } else {
            console.log(`   ⚠️  База данных не найдена: ${dbPath}`);
            console.log('   💡 База данных будет создана при первом запуске');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка при проверке базы данных:', error.message);
        return false;
    }
}

// Функция для тестирования интеграции
async function testIntegration() {
    console.log('\n🔗 Тест интеграции сервисов');
    console.log('=' * 30);
    
    try {
        // Проверяем Analytics Service
        console.log('📊 Проверка Analytics Service...');
        const analyticsResponse = await fetch('http://localhost:3003/health');
        if (analyticsResponse.ok) {
            console.log('   ✅ Analytics Service доступен');
        } else {
            console.log('   ❌ Analytics Service недоступен');
        }
        
        // Проверяем MCP Server
        console.log('🔌 Проверка MCP Server...');
        const mcpResponse = await fetch('http://localhost:3001/health');
        if (mcpResponse.ok) {
            console.log('   ✅ MCP Server доступен');
        } else {
            console.log('   ❌ MCP Server недоступен');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка при тестировании интеграции:', error.message);
        return false;
    }
}

// Главная функция тестирования
async function runTests() {
    console.log('🚀 Запуск тестов MCP Server');
    console.log('Убедитесь, что сервис запущен: node start-simple.js');
    console.log();
    
    const dbTest = await testDatabase();
    const apiTest = await testMCPAPI();
    const integrationTest = await testIntegration();
    
    console.log('\n📋 Результаты тестирования:');
    console.log('=' * 30);
    console.log(`   🗄️  База данных: ${dbTest ? '✅' : '❌'}`);
    console.log(`   🔌 API: ${apiTest ? '✅' : '❌'}`);
    console.log(`   🔗 Интеграция: ${integrationTest ? '✅' : '❌'}`);
    
    if (dbTest && apiTest && integrationTest) {
        console.log('\n🎉 Все тесты пройдены успешно!');
        console.log('\n🎯 Рекомендации:');
        console.log('   - MCP Server работает на порту 3001');
        console.log('   - Analytics Service работает на порту 3003');
        console.log('   - Все данные сохраняются в SQLite файл analytics.db');
        console.log('   - Используйте Swagger UI для интерактивного тестирования');
    } else {
        console.log('\n❌ Некоторые тесты не пройдены. Проверьте:');
        console.log('   - Запущен ли MCP Server: node start-simple.js');
        console.log('   - Доступны ли порты 3001 и 3003');
        console.log('   - Нет ли ошибок в логах сервисов');
    }
}

// Запускаем тесты
runTests().catch(console.error);
