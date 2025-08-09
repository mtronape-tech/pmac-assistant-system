# PMAC Control Service

Микросервис для управления PMAC контроллерами в рамках PMAC Assistant System.

## Описание

PMAC Control Service предоставляет RESTful API для взаимодействия с контроллерами Turbo PMAC, включая:

- Чтение и запись переменных PMAC (P, Q, I, M, L)
- Выполнение команд контроллера
- Получение статуса системы и координат
- Управление подключениями к контроллерам
- Симуляция PMAC для разработки и тестирования

## Возможности

### Типы переменных PMAC

- **P-переменные**: Глобальные параметры системы (P1-P8191)
- **Q-переменные**: Локальные переменные программ (Q1-Q8191)  
- **I-переменные**: Системные переменные контроллера (I1-I8191)
- **M-переменные**: Переменные движения и координат (M1-M8191)
- **L-переменные**: Переменные координат и траекторий (L1-L8191)

### Поддерживаемые подключения

- **Симуляция**: Встроенный симулятор PMAC для разработки
- **TCP**: Подключение через Ethernet (планируется)
- **Serial**: Подключение через последовательный порт (планируется)
- **USB**: Подключение через USB (планируется)

## API Endpoints

### Статус и данные

```http
GET /health                 # Health check сервиса
GET /pmac/status           # Полный статус PMAC контроллера
GET /pmac/data             # Текущие данные контроллера
```

### Работа с переменными

```http
GET /pmac/variable?type=P&address=1    # Чтение переменной
POST /pmac/variable                     # Запись переменной
POST /pmac/variables/read               # Чтение множественных переменных
POST /pmac/variables/write              # Запись множественных переменных
```

### Команды

```http
POST /pmac/command          # Выполнение команды
```

### Управление подключениями

```http
GET /connections                        # Список подключений
POST /connections                       # Создание подключения
POST /connections/:id/connect           # Подключение
POST /connections/:id/disconnect        # Отключение
POST /connections/:id/switch            # Переключение активного подключения
```

## Примеры использования

### Чтение переменной

```bash
curl "http://localhost:3001/pmac/variable?type=P&address=1"
```

```json
{
  "success": true,
  "data": {
    "variable": "P1",
    "value": 123.45,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### Запись переменной

```bash
curl -X POST "http://localhost:3001/pmac/variable" \
  -H "Content-Type: application/json" \
  -d '{"type": "P", "address": 1, "value": 100.5}'
```

```json
{
  "success": true,
  "data": {
    "variable": "P1",
    "value": 100.5,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### Выполнение команды

```bash
curl -X POST "http://localhost:3001/pmac/command" \
  -H "Content-Type: application/json" \
  -d '{"command": "START"}'
```

```json
{
  "success": true,
  "data": {
    "command": "START",
    "result": "Контроллер запущен",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### Чтение множественных переменных

```bash
curl -X POST "http://localhost:3001/pmac/variables/read" \
  -H "Content-Type: application/json" \
  -d '{
    "variables": [
      {"type": "P", "address": 1},
      {"type": "P", "address": 2},
      {"type": "I", "address": 1}
    ]
  }'
```

```json
{
  "success": true,
  "data": {
    "variables": {
      "P1": 123.45,
      "P2": 678.90,
      "I1": 1000.0
    },
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### Получение статуса

```bash
curl "http://localhost:3001/pmac/status"
```

```json
{
  "success": true,
  "data": {
    "controllerState": "running",
    "communicationStatus": "connected",
    "coordinates": {
      "x": 10.5,
      "y": 20.3,
      "z": 5.0
    },
    "axes": {
      "x": {
        "position": 10.5,
        "velocity": 2.5,
        "status": "enabled"
      }
    },
    "system": {
      "temperature": 28.5,
      "voltage": 24.2,
      "errorCodes": [],
      "uptime": 3600
    }
  }
}
```

## Установка и запуск

### Разработка

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Сборка
npm run build

# Запуск продакшн версии
npm start
```

### Docker

```bash
# Сборка образа
docker build -t pmac-control-service .

# Запуск контейнера
docker run -p 3001:3001 pmac-control-service
```

## Конфигурация

Конфигурация осуществляется через переменные окружения:

```env
# Сервер
PMAC_CONTROL_PORT=3001
PMAC_CONTROL_HOST=0.0.0.0

# PMAC подключение
PMAC_MODE=simulation                # simulation | real
PMAC_CONNECTION_TYPE=tcp            # tcp | serial | usb
PMAC_HOST=localhost
PMAC_PORT=1025
PMAC_SERIAL_PORT=/dev/ttyUSB0
PMAC_BAUD_RATE=9600

# Симуляция
PMAC_SIM_DELAY=100                  # Задержка ответа в мс
PMAC_SIM_ERROR_RATE=0.01            # Частота ошибок (0.01 = 1%)
PMAC_SIM_UPDATE_INTERVAL=1000       # Интервал обновления данных в мс

# Безопасность
PMAC_CRITICAL_VARS=P1,P2,P3,I1,I2,I3    # Критические переменные
PMAC_MAX_VALUE=10000                      # Максимальное значение
PMAC_MIN_VALUE=-10000                     # Минимальное значение

# Логирование
LOG_LEVEL=info                      # debug | info | warn | error
LOG_DIR=./logs
```

## Архитектура

### Компоненты

1. **PMACConnectionManager**: Управление подключениями к контроллерам
2. **AdvancedPMACSimulator**: Симулятор PMAC для тестирования
3. **PMACController**: REST API контроллер
4. **PMACConnectionBase**: Абстракция для различных типов подключений

### Схема потоков данных

```
HTTP Request → PMACController → PMACConnectionManager → PMACConnection → PMAC/Simulator
```

### Обработка ошибок

- Валидация входных данных через Zod схемы
- Автоматическое переподключение при сбоях
- Логирование всех операций
- Graceful shutdown при остановке сервиса

## События и мониторинг

Сервис генерирует события для мониторинга:

- `connected`: Установлено подключение
- `disconnected`: Подключение разорвано
- `connectionError`: Ошибка подключения
- `dataUpdated`: Обновлены данные
- `stateChanged`: Изменилось состояние контроллера
- `systemError`: Системная ошибка

## Тестирование

```bash
# Запуск тестов
npm test

# Запуск тестов с покрытием
npm run test:coverage

# Линтинг
npm run lint
```

## Безопасность

- Валидация всех входных данных
- Ограничения на критические переменные
- Проверка диапазонов значений
- Логирование всех операций записи
- Таймауты для предотвращения зависания

## Производительность

- Пакетные операции для множественных переменных
- Кэширование соединений
- Асинхронная обработка запросов
- Оптимизированная сериализация данных

## Мониторинг

### Метрики

- Время отклика API
- Количество активных соединений
- Частота ошибок
- Использование ресурсов

### Логи

Все операции логируются с уровнями:

- `debug`: Детальная информация
- `info`: Общая информация о работе
- `warn`: Предупреждения
- `error`: Ошибки

### Health Check

```bash
curl http://localhost:3001/health
```

## Интеграция

### С MCP Server

PMAC Control Service интегрируется с MCP Server через HTTP API для предоставления инструментов управления PMAC в рамках Model Context Protocol.

### С Data Collection Service

Сервис может передавать данные в Data Collection Service для сохранения в TimescaleDB и последующего анализа.

### С Analytics Service

Предоставляет данные для анализа производительности и выявления аномалий в работе контроллера.

## Roadmap

- [ ] Реализация TCP подключения к реальным PMAC
- [ ] Реализация Serial подключения
- [ ] Реализация USB подключения
- [ ] WebSocket для real-time данных
- [ ] Графический интерфейс для мониторинга
- [ ] Расширенная система алертов
- [ ] Интеграция с Prometheus/Grafana
- [ ] Поддержка кластеризации
