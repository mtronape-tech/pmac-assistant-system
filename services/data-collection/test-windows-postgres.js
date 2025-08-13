import pg from 'pg';

const { Client } = pg;

async function testWindowsPostgreSQL() {
    console.log('🔧 Тестирование подключения к Windows PostgreSQL...\n');
    
    // Стандартные настройки для Windows PostgreSQL
    const connectionConfigs = [
        {
            name: 'Default (postgres user)',
            config: {
                host: 'localhost',
                port: 5432,
                database: 'postgres',
                user: 'postgres',
                password: 'postgres', // Обычно задается при установке
                connectionTimeoutMillis: 5000,
            }
        },
        {
            name: 'Custom database (pmac_assistant)',
            config: {
                host: 'localhost',
                port: 5432,
                database: 'pmac_assistant',
                user: 'postgres',
                password: 'postgres',
                connectionTimeoutMillis: 5000,
            }
        }
    ];

    for (const { name, config } of connectionConfigs) {
        console.log(`📡 Тестируем: ${name}`);
        const client = new Client(config);
        
        try {
            await client.connect();
            console.log('✅ Подключение успешно');
            
            const result = await client.query('SELECT NOW() as current_time, version(), current_database()');
            console.log(`   ⏰ Время: ${result.rows[0].current_time}`);
            console.log(`   📋 Версия: ${result.rows[0].version.split(' ').slice(0, 2).join(' ')}`);
            console.log(`   🗄️  База данных: ${result.rows[0].current_database}`);
            
            // Проверяем доступные базы данных
            const dbResult = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false');
            console.log(`   📂 Доступные БД: ${dbResult.rows.map(row => row.datname).join(', ')}`);
            
            await client.end();
            console.log('');
        } catch (error) {
            console.log(`❌ Ошибка подключения: ${error.message}`);
            console.log(`   🔧 Код ошибки: ${error.code}`);
            if (error.code === 'ECONNREFUSED') {
                console.log('   💡 Совет: Проверьте, что PostgreSQL запущен');
            } else if (error.code === '28P01') {
                console.log('   💡 Совет: Неверный пароль');
            } else if (error.code === '3D000') {
                console.log('   💡 Совет: База данных не существует');
            }
            console.log('');
        }
    }
}

// Также проверим порты
async function checkPorts() {
    console.log('🔍 Проверка портов...');
    
    try {
        const { spawn } = await import('child_process');
        const netstat = spawn('netstat', ['-an']);
        
        let output = '';
        netstat.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        netstat.on('close', (code) => {
            const postgresLines = output.split('\n').filter(line => line.includes(':5432'));
            if (postgresLines.length > 0) {
                console.log('✅ PostgreSQL слушает на порту 5432:');
                postgresLines.forEach(line => console.log(`   ${line.trim()}`));
            } else {
                console.log('❌ PostgreSQL не найден на порту 5432');
            }
        });
    } catch (error) {
        console.log(`❌ Ошибка проверки портов: ${error.message}`);
    }
}

console.log('🪟 Тестирование PostgreSQL на Windows\n');
checkPorts();
setTimeout(() => testWindowsPostgreSQL(), 1000);
