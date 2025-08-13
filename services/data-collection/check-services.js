#!/usr/bin/env node

/**
 * Проверка доступности PostgreSQL и Redis
 */

import pg from 'pg';
import { createClient } from 'redis';

async function checkPostgreSQL() {
  console.log('🗄️ Проверка PostgreSQL...');
  
  try {
    const client = new pg.Client({
      host: 'localhost',
      port: 5432,
      database: 'pmac_assistant',
      user: 'postgres',
      password: 'postgres',
    });
    
    await client.connect();
    const result = await client.query('SELECT NOW(), version()');
    await client.end();
    
    console.log('✅ PostgreSQL доступен');
    console.log(`   📅 Время сервера: ${result.rows[0].now}`);
    console.log(`   📋 Версия: ${result.rows[0].version.split(' ').slice(0, 2).join(' ')}`);
    
    // Проверяем TimescaleDB
    const timescaleClient = new pg.Client({
      host: 'localhost',
      port: 5432,
      database: 'pmac_assistant',
      user: 'postgres',
      password: 'postgres',
    });
    
    await timescaleClient.connect();
    try {
      const tsResult = await timescaleClient.query('SELECT extversion FROM pg_extension WHERE extname = \'timescaledb\'');
      if (tsResult.rows.length > 0) {
        console.log(`   ⏰ TimescaleDB: v${tsResult.rows[0].extversion}`);
      } else {
        console.log('   ⚠️ TimescaleDB не установлен');
      }
    } catch (error) {
      console.log('   ⚠️ TimescaleDB не доступен');
    }
    await timescaleClient.end();
    
    return true;
  } catch (error) {
    console.log('❌ PostgreSQL недоступен:', error.message);
    console.log('ℹ️  Запустите: docker-compose up -d postgres');
    return false;
  }
}

async function checkRedis() {
  console.log('\n🔄 Проверка Redis...');
  
  try {
    const client = createClient({
      socket: { host: 'localhost', port: 6379 }
    });
    
    await client.connect();
    const pong = await client.ping();
    const info = await client.info('server');
    await client.quit();
    
    console.log('✅ Redis доступен');
    console.log(`   🏓 Ping: ${pong}`);
    
    // Извлекаем версию из info
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    if (versionMatch) {
      console.log(`   📋 Версия: ${versionMatch[1]}`);
    }
    
    return true;
  } catch (error) {
    console.log('❌ Redis недоступен:', error.message);
    console.log('ℹ️  Запустите: docker-compose up -d redis');
    return false;
  }
}

async function checkAll() {
  console.log('🔧 Проверка сервисов для Data Collection\n');
  
  const pgOk = await checkPostgreSQL();
  const redisOk = await checkRedis();
  
  console.log('\n📋 === ИТОГИ ===');
  console.log(`PostgreSQL: ${pgOk ? '✅ Готов' : '❌ Не готов'}`);
  console.log(`Redis: ${redisOk ? '✅ Готов' : '❌ Не готов'}`);
  
  if (pgOk && redisOk) {
    console.log('\n🎉 Все сервисы готовы к работе!');
    console.log('🚀 Можете запускать полные тесты: npm run test:full');
  } else {
    console.log('\n⚠️  Некоторые сервисы не готовы');
    console.log('📋 Команды для запуска:');
    if (!pgOk) console.log('   docker-compose up -d postgres');
    if (!redisOk) console.log('   docker-compose up -d redis');
  }
}

checkAll().catch(console.error);
