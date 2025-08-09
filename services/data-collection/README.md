# Data Collection Service

Сервис сбора данных для системы PMAC Assistant. Отвечает за автоматический сбор данных с контроллера PMAC, их обработку и сохранение в базу данных TimescaleDB.

## Основные функции

- **Автоматический сбор данных**: Планируемый сбор переменных PMAC, статуса системы и диагностической информации
- **Гибкая конфигурация**: Настройка различных типов сбора с индивидуальными интервалами и параметрами
- **Масштабируемость**: Поддержка пакетной обработки и оптимизации производительности
- **Надежность**: Система повторных попыток, мониторинг и восстановление после сбоев
- **Кэширование**: Использование Redis для оптимизации производительности

## Архитектура

### Компоненты

1. **Collection Scheduler** - Планировщик задач сбора данных
2. **PMAC Collector** - Коллектор данных с контроллера PMAC
3. **Database Service** - Сервис работы с PostgreSQL/TimescaleDB
4. **Redis Service** - Сервис кэширования и очередей
5. **REST API** - HTTP API для управления

### Типы сбора данных

- **VARIABLES** - Сбор переменных P, Q, I, M, L
- **STATUS** - Сбор статуса системы и осей
- **DIAGNOSTICS** - Сбор диагностической информации
- **SYSTEM_INFO** - Сбор системной информации

## API Endpoints

### Конфигурация

```http
GET    /api/configurations          # Список конфигураций
GET    /api/configurations/:id      # Получить конфигурацию
POST   /api/configurations          # Создать конфигурацию
PUT    /api/configurations/:id      # Обновить конфигурацию
DELETE /api/configurations/:id      # Удалить конфигурацию
```

### Управление сбором

```http
POST /api/collections/start         # Запустить сбор
POST /api/collections/stop          # Остановить сбор
```

### Задания

```http
GET /api/jobs                       # Список заданий
GET /api/jobs/running               # Активные задания
```

### Данные

```http
GET /api/data-points                # Получить данные
```

### Статистика

```http
GET /api/stats                      # Статистика сервиса
GET /api/health                     # Проверка здоровья
```

## Конфигурация

### Переменные окружения

```bash
# Сервер
PORT=3003
HOST=0.0.0.0

# База данных
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pmac_assistant
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# PMAC Control Service
PMAC_CONTROL_BASE_URL=http://localhost:3002
PMAC_CONTROL_ENABLED=true
PMAC_CONTROL_TIMEOUT=5000

# Сбор данных
COLLECTION_ENABLED=true
COLLECTION_INTERVAL=1000
COLLECTION_BATCH_SIZE=100
COLLECTION_RETENTION_DAYS=30
COLLECTION_MAX_RETRIES=3

# Логирование
LOG_LEVEL=info
LOG_FORMAT=json
```

### Пример конфигурации сбора

```json
{
  "name": "Variable Collection",
  "type": "variables",
  "enabled": true,
  "interval": 1000,
  "batchSize": 50,
  "timeout": 10000,
  "retryAttempts": 3,
  "retryDelay": 5000,
  "variables": [
    {
      "type": "P",
      "address": 1,
      "name": "Position1",
      "description": "Axis 1 Position"
    },
    {
      "type": "Q",
      "address": 1,
      "name": "Velocity1",
      "description": "Axis 1 Velocity"
    }
  ]
}
```

## Установка и запуск

### Разработка

```bash
# Установка зависимостей
npm install

# Сборка
npm run build

# Разработка (с hot reload)
npm run dev

# Запуск
npm start
```

### Docker

```bash
# Сборка
docker build -f Dockerfile.dev -t pmac-data-collection .

# Запуск
docker run -p 3003:3003 --env-file .env pmac-data-collection
```

### Docker Compose

```yaml
data-collection:
  build:
    context: ./services/data-collection
    dockerfile: Dockerfile.dev
  ports:
    - "3003:3003"
  environment:
    - DB_HOST=postgres
    - REDIS_HOST=redis
    - PMAC_CONTROL_BASE_URL=http://pmac-control:3002
  depends_on:
    - postgres
    - redis
    - pmac-control
```

## Мониторинг

### Метрики

- Количество выполненных заданий
- Скорость сбора данных
- Процент ошибок
- Среднее время выполнения
- Использование ресурсов

### Логирование

Сервис использует Winston для структурированного логирования:

- **Error**: Критические ошибки
- **Warn**: Предупреждения и восстановления
- **Info**: Общая информация о работе
- **Debug**: Детальная отладочная информация

### Здоровье сервиса

```http
GET /health
```

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "uptime": 3600,
  "services": {
    "database": true,
    "redis": true,
    "scheduler": {
      "totalJobsScheduled": 1000,
      "activeJobs": 5,
      "completedJobs": 995,
      "failedJobs": 0
    }
  }
}
```

## Разработка

### Структура проекта

```
src/
├── config/           # Конфигурация
├── controllers/      # HTTP контроллеры
├── services/         # Бизнес-логика
├── collectors/       # Коллекторы данных
├── types/           # TypeScript типы
├── utils/           # Утилиты
└── index.ts         # Точка входа
```

### Тестирование

```bash
# Запуск тестов
npm test

# Тесты с покрытием
npm run test:coverage

# Линтинг
npm run lint
```

## Производительность

### Оптимизация

- Пакетная обработка данных
- Кэширование конфигураций в Redis
- Асинхронная обработка заданий
- Оптимизация запросов к базе данных

### Масштабирование

- Горизонтальное масштабирование через Redis
- Балансировка нагрузки между инстансами
- Партиционирование данных по времени
- Автоматическая очистка старых данных

## Безопасность

- Валидация всех входящих данных
- Логирование всех операций
- Мониторинг подозрительной активности
- Защита от SQL-инъекций через параметризованные запросы
