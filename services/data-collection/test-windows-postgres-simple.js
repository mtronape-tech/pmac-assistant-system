import pg from 'pg';

const { Client } = pg;

async function testWindowsPostgreSQL() {
    console.log('🪟 Тестирование Windows PostgreSQL без пароля...\n');
    
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'pmac_assistant',
        user: 'postgres',
        password: '3852',
        connectionTimeoutMillis: 5000,
    });
    
    try {
        await client.connect();
        console.log('✅ Подключение к Windows PostgreSQL успешно!');
        
        const result = await client.query('SELECT NOW() as current_time, version(), current_database()');
        console.log(`   ⏰ Время: ${result.rows[0].current_time}`);
        console.log(`   📋 Версия: ${result.rows[0].version.split(' ').slice(0, 3).join(' ')}`);
        console.log(`   🗄️  База данных: ${result.rows[0].current_database}`);
        
        // Проверяем таблицы
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log(`   📋 Таблицы: ${tablesResult.rows.length} шт.`);
        if (tablesResult.rows.length > 0) {
            tablesResult.rows.forEach(row => console.log(`      - ${row.table_name}`));
        }
        
        await client.end();
        
        console.log('\n🎉 Windows PostgreSQL полностью готов к работе!');
        console.log('💡 Можно использовать localhost:5432 вместо WSL IP');
        
    } catch (error) {
        console.log(`❌ Ошибка подключения: ${error.message}`);
        console.log(`   🔧 Код ошибки: ${error.code}`);
    }
}

testWindowsPostgreSQL();
