# MCP Server - PMAC Assistant System

MCP (Model Context Protocol) сервер для интеллектуального помощника наладчика станков с ЧПУ на базе контроллера Turbo PMAC.

## Описание

Этот сервер предоставляет набор инструментов для:
- Управления переменными PMAC контроллера
- Анализа данных и трендов
- Поиска в базе знаний
- Генерации рекомендаций
- Мониторинга безопасности

## Архитектура

```
MCP Server
├── PMAC Tools (чтение/запись переменных, статус, команды)
├── Knowledge Base Tools (поиск документов, добавление)
├── Analytics Tools (анализ трендов, обнаружение аномалий)
├── Recommendation Tools (генерация рекомендаций)
├── Database Service (PostgreSQL + TimescaleDB)
├── Redis Service (кэширование, сессии)
└── PMAC Simulator (для разработки и тестирования)
```

## Установка и запуск

### Предварительные требования

- Node.js 18+
- PostgreSQL с расширением TimescaleDB
- Redis
- Docker (опционально)

### Установка зависимостей

```bash
cd services/mcp-server
npm install
```

### Конфигурация

Создайте файл `.env` в корне проекта:

```env
# Сервер
PORT=3001
NODE_ENV=development

# База данных
DATABASE_URL=postgresql://pmac_user:pmac_password@localhost:5432/pmac_assistant

# Redis
REDIS_URL=redis://localhost:6379

# PMAC
PMAC_MODE=simulation
PMAC_SIMULATION_DELAY=100

# Логирование
LOG_LEVEL=info
```

### Запуск в режиме разработки

```bash
npm run dev
```

### Запуск в продакшене

```bash
npm run build
npm start
```

### Запуск через Docker

```bash
docker build -f Dockerfile.dev -t pmac-mcp-server .
docker run -p 3001:3001 pmac-mcp-server
```

## Доступные инструменты

### PMAC Tools

#### `read_pmac_variable`
Читает значение переменной PMAC по типу и адресу.

**Параметры:**
- `variableType` (P|Q|I|M|L) - Тип переменной PMAC
- `address` (number) - Адрес переменной (1-8192)
- `machineId` (string, опционально) - ID машины

**Пример:**
```json
{
  "name": "read_pmac_variable",
  "arguments": {
    "variableType": "P",
    "address": 1,
    "machineId": "machine-001"
  }
}
```

#### `write_pmac_variable`
Записывает значение в переменную PMAC.

**Параметры:**
- `variableType` (P|Q|I|M|L) - Тип переменной PMAC
- `address` (number) - Адрес переменной (1-8192)
- `value` (number) - Значение для записи
- `machineId` (string, опционально) - ID машины
- `confirm` (boolean, опционально) - Подтверждение операции

#### `get_pmac_status`
Получает текущий статус контроллера PMAC.

**Параметры:**
- `machineId` (string, опционально) - ID машины

#### `execute_pmac_command`
Выполняет команду на контроллере PMAC.

**Параметры:**
- `command` (string) - Команда PMAC для выполнения
- `machineId` (string, опционально) - ID машины
- `confirm` (boolean, опционально) - Подтверждение операции

#### `get_pmac_history`
Получает исторические данные переменных PMAC.

**Параметры:**
- `variableType` (P|Q|I|M|L, опционально) - Тип переменной
- `address` (number, опционально) - Адрес переменной
- `machineId` (string, опционально) - ID машины
- `hours` (number, опционально) - Количество часов назад
- `limit` (number, опционально) - Максимальное количество записей

### Knowledge Base Tools

#### `search_documents`
Ищет информацию в базе знаний.

**Параметры:**
- `query` (string) - Поисковый запрос
- `limit` (number, опционально) - Максимальное количество результатов

#### `add_document`
Добавляет новый документ в базу знаний.

**Параметры:**
- `title` (string) - Заголовок документа
- `content` (string) - Содержимое документа
- `type` (manual|reference|tutorial|configuration, опционально) - Тип документа
- `category` (string, опционально) - Категория документа
- `tags` (string[], опционально) - Теги документа

### Analytics Tools

#### `analyze_trends`
Анализирует тренды в данных PMAC.

**Параметры:**
- `variableType` (P|Q|I|M|L) - Тип переменной для анализа
- `address` (number) - Адрес переменной
- `hours` (number, опционально) - Количество часов для анализа
- `machineId` (string, опционально) - ID машины

#### `detect_anomalies`
Обнаруживает аномалии в данных PMAC.

**Параметры:**
- `variableType` (P|Q|I|M|L) - Тип переменной для анализа
- `address` (number) - Адрес переменной
- `hours` (number, опционально) - Количество часов для анализа
- `machineId` (string, опционально) - ID машины
- `threshold` (number, опционально) - Порог для обнаружения аномалий

#### `export_data`
Экспортирует данные PMAC в различных форматах.

**Параметры:**
- `variableType` (P|Q|I|M|L, опционально) - Тип переменной
- `address` (number, опционально) - Адрес переменной
- `hours` (number, опционально) - Количество часов назад
- `machineId` (string, опционально) - ID машины
- `format` (json|csv|summary, опционально) - Формат экспорта

### Recommendation Tools

#### `generate_recommendations`
Генерирует рекомендации на основе текущего состояния PMAC.

**Параметры:**
- `machineId` (string, опционально) - ID машины
- `focus` (performance|safety|maintenance|optimization, опционально) - Фокус рекомендаций
- `hours` (number, опционально) - Количество часов для анализа

#### `analyze_performance`
Анализирует производительность PMAC и предлагает улучшения.

**Параметры:**
- `machineId` (string, опционально) - ID машины
- `hours` (number, опционально) - Количество часов для анализа

#### `check_safety`
Проверяет безопасность операций PMAC.

**Параметры:**
- `machineId` (string, опционально) - ID машины
- `hours` (number, опционально) - Количество часов для анализа

## Тестирование

### Запуск тестового клиента

```bash
node test-mcp-client.js
```

### Проверка здоровья сервера

```bash
curl http://localhost:3001/health
```

## API Endpoints

### MCP Protocol
- `POST /mcp` - Клиент-серверная коммуникация
- `GET /mcp` - Сервер-клиентские уведомления (SSE)
- `DELETE /mcp` - Завершение сессии

### Health Check
- `GET /health` - Проверка состояния сервера

## Безопасность

- DNS rebinding protection включена по умолчанию
- Подтверждение для критических операций
- Валидация входных параметров
- Логирование всех операций

## Мониторинг

Сервер предоставляет подробное логирование через Winston:
- Консольный вывод
- Файлы логов в папке `logs/`
- Уровни логирования: error, warn, info, debug

## Разработка

### Структура проекта

```
src/
├── index.ts              # Основной файл сервера
├── config.ts             # Конфигурация
├── services/             # Сервисы
│   ├── database.ts       # Работа с базой данных
│   ├── redis.ts          # Работа с Redis
│   └── pmac-simulator.ts # Симулятор PMAC
├── tools/                # Инструменты MCP
│   ├── pmac-tools.ts     # Инструменты PMAC
│   ├── knowledge-tools.ts # Инструменты базы знаний
│   ├── analytics-tools.ts # Инструменты аналитики
│   └── recommendation-tools.ts # Инструменты рекомендаций
└── utils/
    └── logger.ts         # Система логирования
```

### Добавление новых инструментов

1. Создайте новый файл в папке `tools/`
2. Экспортируйте функцию настройки инструментов
3. Импортируйте и вызовите функцию в `index.ts`

### Расширение симулятора PMAC

Для добавления новых функций в симулятор отредактируйте `services/pmac-simulator.ts`.

## Лицензия

MIT License
