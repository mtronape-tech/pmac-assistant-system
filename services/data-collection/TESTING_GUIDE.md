# 🧪 Руководство по тестированию Data Collection Service

## 🚀 Быстрый запуск автоматических тестов

### Полностью автоматическое тестирование
```bash
cd services/data-collection
npm run test:auto
```

Этот скрипт автоматически:
- ✅ Проверит зависимости
- 🤖 Запустит мок PMAC сервер
- 🔨 Соберет проект
- 🚀 Запустит Data Collection сервис
- 🧪 Выполнит все тесты
- 🧹 Очистит процессы

---

## 🔧 Ручное тестирование

### 1. Подготовка окружения

**Убедитесь, что запущены:**
- PostgreSQL (порт 5432)
- Redis (порт 6379)
- База данных `pmac_assistant` создана

**Проверка PostgreSQL:**
```bash
psql -h localhost -U postgres -d pmac_assistant -c "SELECT NOW();"
```

**Проверка Redis:**
```bash
redis-cli ping
```

### 2. Установка зависимостей
```bash
cd services/data-collection
npm install
```

### 3. Запуск мок PMAC сервера
```bash
# В отдельном терминале
npm run mock:pmac
```

Мок сервер будет доступен на `http://localhost:3007`

### 4. Запуск Data Collection сервиса
```bash
# В отдельном терминале
npm run dev
```

Сервис будет доступен на `http://localhost:3001`

### 5. Запуск тестов

**Полное тестирование REST API:**
```bash
npm run test:full
```

**Тестирование WebSocket:**
```bash
npm run test:websocket
```

---

## 📊 Тестовые сценарии

### 🌐 REST API тесты

**Health Check:**
```bash
curl http://localhost:3001/health
```

**Получение конфигураций:**
```bash
curl http://localhost:3001/api/configurations
```

**Создание тестовой конфигурации:**
```bash
curl -X POST http://localhost:3001/api/configurations \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-config",
    "name": "Тестовая конфигурация",
    "type": "variables",
    "enabled": true,
    "interval": 5000,
    "variables": [
      {"type": "P", "address": 100, "name": "Test Position"},
      {"type": "I", "address": 1, "name": "Test Counter"}
    ]
  }'
```

**Получение данных:**
```bash
curl "http://localhost:3001/api/data-points?machineId=pmac-001&startTime=2024-01-01T00:00:00Z&endTime=2024-12-31T23:59:59Z"
```

**Статистика качества:**
```bash
curl http://localhost:3001/api/quality/stats
curl http://localhost:3001/api/quality/metrics/pmac-001
curl http://localhost:3001/api/quality/alerts
```

### 🔌 WebSocket тесты

**Подключение к WebSocket:**
```javascript
const ws = new WebSocket('ws://localhost:3001/ws/data-stream');

ws.on('open', () => {
  // Создание подписки
  ws.send(JSON.stringify({
    type: 'subscribe',
    subscriptionId: 'test-sub-1',
    payload: {
      machineId: 'pmac-001',
      variableType: 'P',
      interval: 3000
    }
  }));
});
```

**Тестирование фильтрации:**
```javascript
// Подписка на конкретную переменную
ws.send(JSON.stringify({
  type: 'subscribe',
  subscriptionId: 'specific-var',
  payload: {
    machineId: 'pmac-001',
    variableType: 'P',
    variableAddress: 100,
    interval: 1000
  }
}));
```

### 🗄️ База данных тесты

**Проверка таблиц:**
```sql
-- Подключение к БД
psql -h localhost -U postgres -d pmac_assistant

-- Проверка структуры
\dt

-- Проверка данных
SELECT COUNT(*) FROM pmac_data;
SELECT * FROM pmac_data ORDER BY timestamp DESC LIMIT 10;

-- Проверка конфигураций
SELECT * FROM collection_configs;

-- Проверка задач
SELECT * FROM collection_jobs ORDER BY start_time DESC LIMIT 10;
```

**Тестирование TimescaleDB функций:**
```sql
-- Проверка hypertable
SELECT * FROM timescaledb_information.hypertables WHERE hypertable_name = 'pmac_data';

-- Тестирование агрегации
SELECT 
  time_bucket('5 minutes', timestamp) as bucket,
  AVG(value) as avg_value,
  COUNT(*) as count
FROM pmac_data 
WHERE machine_id = 'pmac-001' 
  AND timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY bucket 
ORDER BY bucket;
```

---

## 🎯 Ожидаемые результаты

### ✅ Успешные тесты должны показать:

**Health Check:**
```json
{
  "status": "healthy",
  "services": {
    "database": true,
    "redis": true,
    "scheduler": true
  }
}
```

**WebSocket подключение:**
- Получение ping сообщения
- Успешное создание подписки
- Регулярное получение данных
- Корректная отмена подписки

**Качество данных:**
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "activeAlerts": 0,
    "qualityThresholds": {
      "minQualityPercentage": 95,
      "maxErrorRate": 5
    }
  }
}
```

### ❌ Возможные проблемы:

**Ошибка подключения к БД:**
```
Failed to connect to PostgreSQL: connection refused
```
*Решение:* Запустите PostgreSQL и создайте базу данных

**Ошибка подключения к Redis:**
```
Redis connection failed: ECONNREFUSED
```
*Решение:* Запустите Redis сервер

**WebSocket ошибки:**
```
WebSocket connection failed
```
*Решение:* Убедитесь, что Data Collection сервис запущен

---

## 🔍 Отладка

### Логи сервиса
```bash
# Увеличить уровень логирования
LOG_LEVEL=debug npm run dev
```

### Проверка процессов
```bash
# Проверить запущенные порты
netstat -tlnp | grep :300
lsof -i :3001
lsof -i :3007
```

### Мониторинг базы данных
```sql
-- Активные подключения
SELECT * FROM pg_stat_activity WHERE datname = 'pmac_assistant';

-- Размер таблиц
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public';
```

---

## 📈 Метрики производительности

### Ожидаемые показатели:
- **Время отклика API:** < 100ms
- **WebSocket latency:** < 50ms
- **Batch вставка:** 1000+ записей/сек
- **Использование памяти:** < 512MB
- **CPU при нагрузке:** < 50%

### Тестирование нагрузки:
```bash
# Множественные подключения WebSocket
for i in {1..10}; do
  node test-websocket-client.js &
done
```

---

## 🎉 Успешное завершение

При успешном прохождении всех тестов вы увидите:
```
🎯 Результат: 5/5 тестов пройдено
🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Data Collection Service работает корректно.
```

Это означает, что модуль готов для интеграции с другими компонентами системы!
