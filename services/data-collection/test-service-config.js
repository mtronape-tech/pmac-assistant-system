// Тест с точно такой же конфигурацией как в сервисе
import pg from 'pg';

const { Pool } = pg;

async function testServiceConfig() {
    console.log('🔧 Тест конфигурации PostgreSQL из сервиса...\n');
    
    // Точно такая же конфигурация как в DatabaseService
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'pmac_assistant',
        user: 'postgres',
        password: '3852',
        ssl: false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        query_timeout: 5000,
    });

    pool.on('error', (err) => {
        console.log('❌ PostgreSQL pool error:', err.message);
    });

    try {
        console.log('🔗 Подключаемся к PostgreSQL...');
        const client = await pool.connect();
        console.log('✅ Pool подключен!');
        
        console.log('🔍 Выполняем тестовый запрос...');
        const result = await client.query('SELECT NOW() as current_time, current_database()');
        console.log(`   ⏰ Время: ${result.rows[0].current_time}`);
        console.log(`   🗄️  База данных: ${result.rows[0].current_database}`);
        
        client.release();
        console.log('✅ Client освобожден');
        
        await pool.end();
        console.log('✅ Pool закрыт');
        
        console.log('\n🎉 Конфигурация сервиса работает корректно!');
        
    } catch (error) {
        console.log(`❌ Ошибка подключения: ${error.message}`);
        console.log(`   🔧 Код ошибки: ${error.code}`);
        console.log(`   📍 Stack: ${error.stack}`);
        
        try {
            await pool.end();
        } catch (endError) {
            console.log(`❌ Ошибка закрытия pool: ${endError.message}`);
        }
    }
}

testServiceConfig();
