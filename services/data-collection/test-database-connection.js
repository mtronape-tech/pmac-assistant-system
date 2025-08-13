import pg from 'pg';
import redis from 'redis';

const { Client } = pg;

async function testDatabaseConnection() {
    console.log('🔧 Тестирование подключения к базе данных...\n');
    
    // Test PostgreSQL
    console.log('🗄️ PostgreSQL подключение...');
    const pgClient = new Client({
        host: '172.21.118.8',
        port: 5432,
        database: 'pmac_assistant',
        user: 'postgres',
        password: 'postgres',
        connectionTimeoutMillis: 10000,
        query_timeout: 5000,
    });

    try {
        await pgClient.connect();
        console.log('✅ PostgreSQL подключен');
        
        const result = await pgClient.query('SELECT NOW() as current_time, version()');
        console.log(`   ⏰ Время: ${result.rows[0].current_time}`);
        console.log(`   📋 Версия: ${result.rows[0].version.split(' ').slice(0, 2).join(' ')}`);
        
        await pgClient.end();
    } catch (error) {
        console.log(`❌ PostgreSQL ошибка: ${error.message}`);
        console.log(`   🔧 Код ошибки: ${error.code}`);
        console.log(`   📍 Детали: ${error.detail || 'Нет деталей'}`);
    }

    // Test Redis
    console.log('\n🔄 Redis подключение...');
    const redisClient = redis.createClient({
        socket: {
            host: '172.21.118.8',
            port: 6379,
            connectTimeout: 10000,
        }
    });

    try {
        await redisClient.connect();
        console.log('✅ Redis подключен');
        
        const pong = await redisClient.ping();
        console.log(`   🏓 Ping: ${pong}`);
        
        const info = await redisClient.info('server');
        const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
        console.log(`   📋 Версия: ${version}`);
        
        await redisClient.disconnect();
    } catch (error) {
        console.log(`❌ Redis ошибка: ${error.message}`);
        console.log(`   🔧 Код ошибки: ${error.code}`);
    }
}

testDatabaseConnection().catch(console.error);
