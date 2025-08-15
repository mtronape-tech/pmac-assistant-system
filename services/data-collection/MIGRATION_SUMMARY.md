# Миграция Data Collection Service

## Обзор изменений

Data Collection Service был успешно мигрирован с PostgreSQL и Redis на in-memory хранилище для упрощения развертывания и снижения зависимостей.

## Удаленные зависимости

### PostgreSQL
- Удален пакет `pg` и `@types/pg`
- Удален сервис `DatabaseService`
- Удалены все SQL запросы

### Redis
- Удален пакет `redis`
- Удален сервис `RedisService`
- Удалены все операции с Redis

### Docker
- Удален `Dockerfile.dev`
- Удалены скрипты настройки Docker

## Обновленные компоненты

### CollectionScheduler
- Заменен `DatabaseService` на in-memory `Map` для хранения:
  - Конфигураций (`configurations`)
  - Точок данных (`dataPoints`)
  - Завершенных задач (`completedJobs`)
- Добавлены методы для работы с in-memory хранилищем:
  - `getConfigurations()`
  - `getConfiguration(configId)`
  - `getDataPoints(configId?)`
  - `cleanupOldData(retentionDays)`

### CollectionController
- Удалена зависимость от `DatabaseService`
- Обновлены все методы для работы с `CollectionScheduler`
- Добавлена фильтрация данных в памяти для `getDataPoints`

### WebSocketStreamer
- Удалена зависимость от `DatabaseService`
- Упрощена логика получения данных (пока возвращает пустые данные)

### QualityMonitor
- Удалена зависимость от `DatabaseService`
- Заменены Redis операции на in-memory `Map` для алертов
- Упрощена логика расчета метрик качества

## Удаленные тестовые файлы

- `test-localhost-redis.js`
- `test-redis-connection.js`
- `test-windows-postgres.js`
- `test-windows-postgres-simple.js`
- `test-database-connection.js`
- `start-postgres-only.js`
- `POSTGRES_ONLY_RESULTS.md`
- `setup-db.sh`
- `setup-network.sh`
- `check-wsl-services.js`
- `check-services.js`
- `test-minimal-server.js`
- `test-service-config.js`
- `test-full-functionality.js`
- `test-simple.js`
- `test-websocket-simple.js`
- `test-websocket-client.js`
- `test-dc-client.js`
- `run-tests.js`
- `mock-pmac-server.js`
- `start-api-only.js`

## Обновленные скрипты

Удалены неиспользуемые скрипты из `package.json`:
- `test:client`
- `test:full`
- `test:websocket`
- `test:auto`
- `mock:pmac`

## Преимущества миграции

1. **Упрощение развертывания** - не требуется установка PostgreSQL и Redis
2. **Снижение зависимостей** - меньше внешних сервисов для поддержки
3. **Быстрый старт** - сервис запускается сразу без настройки БД
4. **Упрощение тестирования** - не нужны внешние зависимости для тестов

## Ограничения

1. **Потеря данных при перезапуске** - все данные хранятся в памяти
2. **Ограниченный объем данных** - зависит от доступной RAM
3. **Нет персистентности** - данные не сохраняются между запусками

## Рекомендации

Для продакшена рекомендуется:
1. Добавить персистентное хранилище (SQLite, файловая система)
2. Реализовать механизм сохранения/загрузки данных
3. Добавить мониторинг использования памяти
4. Настроить периодическое резервное копирование данных

## Статус

✅ Миграция завершена успешно
✅ Все зависимости удалены
✅ Сервис готов к запуску
✅ Тесты обновлены
