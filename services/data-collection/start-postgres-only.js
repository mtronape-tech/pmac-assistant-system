// Запуск Data Collection только с PostgreSQL (без Redis)
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import pg from 'pg';

const { Client } = pg;
const app = express();
const server = createServer(app);
const PORT = 3001;

// In-memory storage вместо Redis
const inMemoryCache = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const dbConfig = {
    host: 'localhost',
    port: 5432,
    database: 'pmac_assistant',
    user: 'postgres',
    password: '3852',
};

let dbClient = null;

async function connectToDatabase() {
    try {
        dbClient = new Client(dbConfig);
        await dbClient.connect();
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
        mode: 'postgres-only',
        timestamp: new Date().toISOString(),
        services: {
            database: dbClient ? 'connected' : 'disconnected',
            redis: 'disabled (using in-memory)',
            pmac: 'enabled',
            websocket: 'enabled'
        }
    });
});

// Mock данные
let mockConfigs = [];
let mockJobs = [];

// Collection configurations endpoints
app.get('/api/collection/configs', async (req, res) => {
    if (dbClient) {
        try {
            const result = await dbClient.query('SELECT * FROM collection_configs ORDER BY created_at DESC');
            res.json(result.rows);
        } catch (error) {
            console.log('❌ DB Error:', error.message);
            res.json(mockConfigs);
        }
    } else {
        res.json(mockConfigs);
    }
});

app.post('/api/collection/configs', async (req, res) => {
    const config = {
        id: Date.now().toString(),
        ...req.body,
        created_at: new Date(),
        updated_at: new Date()
    };
    
    if (dbClient) {
        try {
            const result = await dbClient.query(
                `INSERT INTO collection_configs (machine_id, variables, schedule, enabled, created_at, updated_at) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [config.machine_id, JSON.stringify(config.variables), config.schedule, config.enabled, config.created_at, config.updated_at]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.log('❌ DB Error:', error.message);
            mockConfigs.push(config);
            res.status(201).json(config);
        }
    } else {
        mockConfigs.push(config);
        res.status(201).json(config);
    }
});

// Data endpoints
app.get('/api/data/:machineId', async (req, res) => {
    const { machineId } = req.params;
    const { from, to, variables } = req.query;
    
    if (dbClient) {
        try {
            const result = await dbClient.query(
                `SELECT * FROM pmac_data 
                 WHERE machine_id = $1 
                 AND ($2::timestamp IS NULL OR timestamp >= $2) 
                 AND ($3::timestamp IS NULL OR timestamp <= $3)
                 ORDER BY timestamp DESC LIMIT 100`,
                [machineId, from, to]
            );
            res.json(result.rows);
        } catch (error) {
            console.log('❌ DB Error:', error.message);
            // Fallback к mock данным
            const data = Array.from({ length: 10 }, (_, i) => ({
                id: i + 1,
                machine_id: machineId,
                timestamp: new Date(Date.now() - i * 60000).toISOString(),
                variable_type: variables?.split(',')[0] || 'P1',
                value: Math.random() * 100,
                collection_job_id: '1'
            }));
            res.json(data);
        }
    } else {
        // Mock data
        const data = Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            machine_id: machineId,
            timestamp: new Date(Date.now() - i * 60000).toISOString(),
            variable_type: variables?.split(',')[0] || 'P1',
            value: Math.random() * 100,
            collection_job_id: '1'
        }));
        res.json(data);
    }
});

app.get('/api/data/:machineId/latest', (req, res) => {
    const { machineId } = req.params;
    
    const latestData = [
        { variable_type: 'P1', value: Math.random() * 100, timestamp: new Date() },
        { variable_type: 'P2', value: Math.random() * 100, timestamp: new Date() },
        { variable_type: 'I1', value: Math.floor(Math.random() * 1000), timestamp: new Date() }
    ];
    
    res.json(latestData);
});

// WebSocket setup
const wss = new WebSocketServer({ server, path: '/ws/data-stream' });

wss.on('connection', (ws, req) => {
    console.log('🔗 WebSocket клиент подключен');
    
    ws.send(JSON.stringify({
        type: 'connection',
        message: 'Подключение установлено (PostgreSQL mode)',
        timestamp: new Date().toISOString()
    }));
    
    // Симуляция потока данных каждые 2 секунды
    const interval = setInterval(() => {
        if (ws.readyState === 1) { // OPEN
            const data = {
                type: 'data',
                machineId: 'pmac-001',
                timestamp: new Date().toISOString(),
                variables: [
                    { type: 'P1', value: Math.random() * 100 },
                    { type: 'P2', value: Math.random() * 100 },
                    { type: 'I1', value: Math.floor(Math.random() * 1000) }
                ]
            };
            ws.send(JSON.stringify(data));
        }
    }, 2000);
    
    ws.on('close', () => {
        console.log('❌ WebSocket клиент отключен');
        clearInterval(interval);
    });
    
    ws.on('error', (error) => {
        console.log('❌ WebSocket ошибка:', error.message);
        clearInterval(interval);
    });
});

// WebSocket stats endpoint
app.get('/api/websocket/stats', (req, res) => {
    res.json({
        connectedClients: wss.clients.size,
        totalConnections: wss.clients.size // simplified
    });
});

// Start server
async function startServer() {
    console.log('🚀 Запуск Data Collection (PostgreSQL-only режим)...');
    
    const dbConnected = await connectToDatabase();
    if (dbConnected) {
        console.log('💾 База данных: PostgreSQL (localhost:5432)');
    } else {
        console.log('💾 База данных: Mock режим (в памяти)');
    }
    
    console.log('🔄 Redis: Отключен (используется in-memory кеш)');
    
    server.listen(PORT, () => {
        console.log(`🌐 API: http://localhost:${PORT}`);
        console.log(`🔗 WebSocket: ws://localhost:${PORT}/ws/data-stream`);
        console.log(`💡 Режим: PostgreSQL-Only`);
        console.log('🎯 Готов к тестированию!');
    });
}

server.on('error', (error) => {
    console.error('❌ Ошибка сервера:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Завершение работы сервера...');
    if (dbClient) {
        dbClient.end();
    }
    server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});

startServer();
