import redis from 'redis';

async function testLocalhostRedis() {
    console.log('🔄 Тестирование подключения к localhost Redis...\n');
    
    const client = redis.createClient({
        socket: {
            host: 'localhost',
            port: 6379,
            connectTimeout: 15000,
            commandTimeout: 10000,
        },
        retry_delay_on_failover: 100,
        max_attempts: 3
    });

    client.on('error', (err) => {
        console.log('❌ Redis Client Error:', err.message);
    });

    try {
        console.log('🔗 Подключаемся к localhost:6379...');
        await client.connect();
        console.log('✅ Redis/Memurai подключен успешно!');
        
        const pong = await client.ping();
        console.log(`   🏓 Ping: ${pong}`);
        
        // Тест записи/чтения
        await client.set('test_key', 'Hello from Windows Redis!');
        const value = await client.get('test_key');
        console.log(`   📝 Тест записи/чтения: ${value}`);
        
        // Очистка
        await client.del('test_key');
        
        // Информация о сервере
        const info = await client.info('server');
        const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
        const name = info.match(/redis_mode:([^\r\n]+)/)?.[1] || 'Unknown';
        console.log(`   📋 Версия: ${version}`);
        console.log(`   🏷️  Тип: ${name}`);
        
        await client.disconnect();
        console.log('✅ localhost Redis тест завершен успешно!');
        console.log('🎉 Можно использовать localhost:6379 для Data Collection');
        
    } catch (error) {
        console.log(`❌ Ошибка Redis: ${error.message}`);
        console.log(`   💡 Попробуем проверить, запущен ли Memurai`);
        
        // Проверим какие процессы слушают порт 6379
        try {
            const { spawn } = await import('child_process');
            const netstat = spawn('netstat', ['-an']);
            
            let output = '';
            netstat.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            netstat.on('close', (code) => {
                const redisLines = output.split('\n').filter(line => line.includes(':6379'));
                if (redisLines.length > 0) {
                    console.log('✅ Найден процесс на порту 6379:');
                    redisLines.forEach(line => console.log(`   ${line.trim()}`));
                } else {
                    console.log('❌ Никто не слушает порт 6379');
                    console.log('💡 Нужно запустить Redis/Memurai');
                }
            });
        } catch (netstatError) {
            console.log(`❌ Ошибка проверки портов: ${netstatError.message}`);
        }
    }
}

testLocalhostRedis();
