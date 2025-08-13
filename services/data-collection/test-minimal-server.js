// Минимальный сервер только с PostgreSQL для тестирования конфигураций
import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL pool
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

// Тест подключения к БД
async function testDBConnection() {
    try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('✅ PostgreSQL подключен');
        return true;
    } catch (error) {
        console.log('❌ PostgreSQL ошибка:', error.message);
        return false;
    }
}

// Health endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        mode: 'minimal-test',
        timestamp: new Date().toISOString(),
        services: {
            database: 'connected',
            redis: 'disabled',
            pmac: 'disabled',
            websocket: 'disabled'
        }
    });
});

// Получить конфигурации
app.get('/api/collection/configs', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(`
            SELECT id, name, type, enabled, interval_ms, batch_size,
                   timeout_ms, retry_attempts, retry_delay_ms, variables, metadata,
                   created_at, updated_at
            FROM collection_configs
            ORDER BY created_at DESC
        `);
        client.release();
        
        const configs = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            type: row.type,
            enabled: row.enabled,
            interval: row.interval_ms,
            batchSize: row.batch_size,
            timeout: row.timeout_ms,
            retryAttempts: row.retry_attempts,
            retryDelay: row.retry_delay_ms,
            variables: typeof row.variables === 'string' ? JSON.parse(row.variables) : row.variables || [],
            metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
        
        res.json({
            success: true,
            data: configs,
            count: configs.length,
        });
    } catch (error) {
        console.log('❌ DB Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get configurations',
            error: error.message,
        });
    }
});

// Создать конфигурацию
app.post('/api/collection/configs', async (req, res) => {
    try {
        const configData = req.body;
        
        // Generate ID
        const config = {
            id: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: configData.name || 'Test Config',
            type: configData.type || 'scheduled',
            enabled: configData.enabled || true,
            interval: configData.interval || 5000,
            batchSize: configData.batchSize || 100,
            timeout: configData.timeout || 5000,
            retryAttempts: configData.retryAttempts || 3,
            retryDelay: configData.retryDelay || 1000,
            variables: configData.variables || [],
            metadata: configData.metadata || {},
        };

        // Save to database
        const client = await pool.connect();
        const query = `
            INSERT INTO collection_configs (
                id, name, type, enabled, interval_ms, batch_size, 
                timeout_ms, retry_attempts, retry_delay_ms, variables, metadata,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
            RETURNING id, name, type, enabled, interval_ms, batch_size,
                      timeout_ms, retry_attempts, retry_delay_ms, variables, metadata,
                      created_at, updated_at
        `;
        
        const values = [
            config.id,
            config.name,
            config.type,
            config.enabled,
            config.interval,
            config.batchSize,
            config.timeout,
            config.retryAttempts,
            config.retryDelay,
            JSON.stringify(config.variables),
            JSON.stringify(config.metadata),
        ];
        
        const result = await client.query(query, values);
        client.release();
        
        const savedConfig = result.rows[0];
        console.log('✅ Конфигурация сохранена:', savedConfig.id);
        
        res.status(201).json({
            success: true,
            message: 'Configuration created successfully',
            data: {
                id: savedConfig.id,
                name: savedConfig.name,
                type: savedConfig.type,
                enabled: savedConfig.enabled,
                interval: savedConfig.interval_ms,
                batchSize: savedConfig.batch_size,
                timeout: savedConfig.timeout_ms,
                retryAttempts: savedConfig.retry_attempts,
                retryDelay: savedConfig.retry_delay_ms,
                variables: typeof savedConfig.variables === 'string' ? JSON.parse(savedConfig.variables) : savedConfig.variables,
                metadata: typeof savedConfig.metadata === 'string' ? JSON.parse(savedConfig.metadata) : savedConfig.metadata,
                createdAt: savedConfig.created_at,
                updatedAt: savedConfig.updated_at,
            },
        });
    } catch (error) {
        console.log('❌ Save Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to create configuration',
            error: error.message,
        });
    }
});

// Start server
async function startServer() {
    console.log('🚀 Запуск минимального тестового сервера...');
    
    const dbConnected = await testDBConnection();
    if (!dbConnected) {
        console.log('❌ Не удается подключиться к БД, сервер не запущен');
        process.exit(1);
    }
    
    app.listen(PORT, () => {
        console.log(`🌐 Сервер запущен на http://localhost:${PORT}`);
        console.log(`💾 База данных: PostgreSQL (localhost:5432)`);
        console.log(`🎯 Готов к тестированию конфигураций!`);
    });
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Завершение работы сервера...');
    await pool.end();
    process.exit(0);
});

startServer().catch(console.error);
