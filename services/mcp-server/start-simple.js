#!/usr/bin/env node
/**
 * Простой запуск MCP Server без Docker
 * Использует SQLite вместо PostgreSQL
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Запуск MCP Server (простая версия)');
console.log('=' * 50);

// Устанавливаем переменные окружения для SQLite
process.env.DATABASE_PATH = join(__dirname, '../../analytics.db');
process.env.REDIS_ENABLED = 'false';
process.env.WEAVIATE_ENABLED = 'false';
process.env.NODE_ENV = 'development';

console.log('📊 Конфигурация:');
console.log(`   База данных: ${process.env.DATABASE_PATH}`);
console.log(`   Redis: отключен`);
console.log(`   Weaviate: отключен`);
console.log(`   Режим: ${process.env.NODE_ENV}`);

// Запускаем сервер в режиме разработки
const server = spawn('npm', ['run', 'dev-simple'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

server.on('error', (error) => {
  console.error('❌ Ошибка запуска сервера:', error);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`\n🛑 MCP Server остановлен с кодом: ${code}`);
  process.exit(code);
});

// Обработка сигналов завершения
process.on('SIGINT', () => {
  console.log('\n⏹️  Получен сигнал SIGINT, останавливаем сервер...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Получен сигнал SIGTERM, останавливаем сервер...');
  server.kill('SIGTERM');
});
