// Запуск Data Collection в режиме только API (без БД)
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const app = express();
const server = createServer(app);
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock данные
let mockConfigs = [];
let mockJobs = [];
let mockData = [];

// Health endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        mode: 'api-only',
        timestamp: new Date().toISOString(),
        services: {
            database: 'disabled',
            redis: 'disabled',
            pmac: 'enabled',
            websocket: 'enabled'
        }
    });
});

// Collection configurations endpoints
app.get('/api/collection/configs', (req, res) => {
    res.json(mockConfigs);
});

app.post('/api/collection/configs', (req, res) => {
    const config = {
        id: Date.now().toString(),
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    mockConfigs.push(config);
    res.status(201).json(config);
});

app.get('/api/collection/configs/:id', (req, res) => {
    const config = mockConfigs.find(c => c.id === req.params.id);
    if (!config) {
        return res.status(404).json({ error: 'Configuration not found' });
    }
    res.json(config);
});

app.put('/api/collection/configs/:id', (req, res) => {
    const index = mockConfigs.findIndex(c => c.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Configuration not found' });
    }
    mockConfigs[index] = {
        ...mockConfigs[index],
        ...req.body,
        updatedAt: new Date()
    };
    res.json(mockConfigs[index]);
});

app.delete('/api/collection/configs/:id', (req, res) => {
    const index = mockConfigs.findIndex(c => c.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Configuration not found' });
    }
    mockConfigs.splice(index, 1);
    res.status(204).send();
});

// Collection jobs endpoints
app.get('/api/collection/jobs', (req, res) => {
    res.json(mockJobs);
});

app.get('/api/collection/jobs/:id', (req, res) => {
    const job = mockJobs.find(j => j.id === req.params.id);
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
});

// Data endpoints
app.get('/api/data/:machineId', (req, res) => {
    const { machineId } = req.params;
    const { from, to, variables } = req.query;
    
    // Mock data generation
    const data = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        machineId,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        variableType: variables?.split(',')[0] || 'P1',
        value: Math.random() * 100,
        collectionJobId: '1'
    }));
    
    res.json(data);
});

app.get('/api/data/:machineId/latest', (req, res) => {
    const { machineId } = req.params;
    
    const latestData = [
        { variableType: 'P1', value: Math.random() * 100, timestamp: new Date() },
        { variableType: 'P2', value: Math.random() * 100, timestamp: new Date() },
        { variableType: 'I1', value: Math.floor(Math.random() * 1000), timestamp: new Date() }
    ];
    
    res.json(latestData);
});

// WebSocket setup
const wss = new WebSocketServer({ server, path: '/ws/data-stream' });

wss.on('connection', (ws, req) => {
    console.log('🔗 WebSocket клиент подключен');
    
    ws.send(JSON.stringify({
        type: 'connection',
        message: 'Подключение установлено',
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
server.listen(PORT, () => {
    console.log(`🚀 Data Collection API-Only сервер запущен на порту ${PORT}`);
    console.log(`🌐 API: http://localhost:${PORT}`);
    console.log(`🔗 WebSocket: ws://localhost:${PORT}/ws/data-stream`);
    console.log(`💡 Режим: API-Only (без базы данных)`);
});

server.on('error', (error) => {
    console.error('❌ Ошибка сервера:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Завершение работы сервера...');
    server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});
