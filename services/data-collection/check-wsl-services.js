#!/usr/bin/env node

/**
 * Проверка подключения к сервисам WSL по IP адресу
 */

import pg from 'pg';
import { createClient } from 'redis';

const WSL_IP = '172.21.118.8'; // IP из предыдущего вывода

async function checkPostgreSQL() {
  console.log('🗄️ Проверка PostgreSQL через WSL IP...');
  
  try {
    const client = new pg.Client({
      host: WSL_IP,
      port: 5432,
      database: 'pmac_assistant',
      user: 'postgres',
      password: 'postgres',
    });
    
    await client.connect();
    const result = await client.query('SELECT NOW(), version()');
    await client.end();
    
    console.log('✅ PostgreSQL доступен через WSL IP');
    console.log(`   📅 Время сервера: ${result.rows[0].now}`);
    console.log(`   📋 Версия: ${result.rows[0].version.split(' ').slice(0, 2).join(' ')}`);
    
    return true;
  } catch (error) {
    console.log('❌ PostgreSQL недоступен:', error.message);
    return false;
  }
}

async function checkRedis() {
  console.log('\n🔄 Проверка Redis через WSL IP...');
  
  try {
    const client = createClient({
      socket: { host: WSL_IP, port: 6379 }
    });
    
    await client.connect();
    const pong = await client.ping();
    const info = await client.info('server');
    await client.quit();
    
    console.log('✅ Redis доступен через WSL IP');
    console.log(`   🏓 Ping: ${pong}`);
    
    // Извлекаем версию из info
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    if (versionMatch) {
      console.log(`   📋 Версия: ${versionMatch[1]}`);
    }
    
    return true;
  } catch (error) {
    console.log('❌ Redis недоступен:', error.message);
    return false;
  }
}

async function checkAll() {
  console.log(`🔧 Проверка сервисов WSL через IP: ${WSL_IP}\n`);
  
  const pgOk = await checkPostgreSQL();
  const redisOk = await checkRedis();
  
  console.log('\n📋 === ИТОГИ ===');
  console.log(`PostgreSQL: ${pgOk ? '✅ Готов' : '❌ Не готов'}`);
  console.log(`Redis: ${redisOk ? '✅ Готов' : '❌ Не готов'}`);
  
  if (pgOk && redisOk) {
    console.log('\n🎉 Все сервисы доступны через WSL IP!');
    console.log('🔧 Обновите конфигурацию test.env:');
    console.log(`   DB_HOST=${WSL_IP}`);
    console.log(`   REDIS_HOST=${WSL_IP}`);
  } else {
    console.log('\n⚠️  Некоторые сервисы не готовы');
    console.log('📋 Возможные причины:');
    console.log('   • Сервисы не запущены в WSL');
    console.log('   • Firewall блокирует подключения');
    console.log('   • Неправильная конфигурация сети');
  }
}

checkAll().catch(console.error);
