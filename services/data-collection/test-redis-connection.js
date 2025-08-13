import redis from 'redis';

async function testRedisConnection() {
    console.log('🔄 Тестирование подключения к WSL Redis...\n');
    
    const client = redis.createClient({
        socket: {
            host: '172.21.118.8',
            port: 6379,
            connectTimeout: 10000,
            commandTimeout: 5000,
        }
    });

    client.on('error', (err) => {
        console.log('❌ Redis Client Error:', err.message);
    });

    try {
        console.log('🔗 Подключаемся к Redis...');
        await client.connect();
        console.log('✅ Redis подключен успешно!');
        
        const pong = await client.ping();
        console.log(`   🏓 Ping: ${pong}`);
        
        // Тест записи/чтения
        await client.set('test_key', 'test_value');
        const value = await client.get('test_key');
        console.log(`   📝 Тест записи/чтения: ${value}`);
        
        // Очистка
        await client.del('test_key');
        
        // Информация о сервере
        const info = await client.info('server');
        const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
        console.log(`   📋 Версия Redis: ${version}`);
        
        await client.disconnect();
        console.log('✅ Redis тест завершен успешно!');
        
    } catch (error) {
        console.log(`❌ Ошибка Redis: ${error.message}`);
        console.log(`   🔧 Тип ошибки: ${error.code || 'Unknown'}`);
        if (error.code === 'ECONNREFUSED') {
            console.log('   💡 Redis не запущен или не доступен');
        } else if (error.code === 'ETIMEDOUT') {
            console.log('   💡 Таймаут подключения - проверьте сеть');
        }
    }
}

testRedisConnection();
