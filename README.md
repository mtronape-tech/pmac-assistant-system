# PMAC Assistant System

Интеллектуальный помощник для наладчиков станков с ЧПУ на базе контроллера Turbo PMAC.

## Описание

Система помощника наладчика станков с ЧПУ (PMAC Assistant System) представляет собой модульную веб-платформу, построенную на основе MCP (Model Context Protocol) сервера. Система обеспечивает интеллектуальное взаимодействие с контроллером PMAC через ИИ помощника, управление переменными, сбор и анализ данных, а также предоставление рекомендаций.

## Архитектура

Система состоит из следующих основных модулей:

- **MCP Server Core** - Центральный компонент для управления ИИ моделями
- **PMAC Control Module** - Управление контроллером PMAC и его переменными
- **Knowledge Base Module** - Управление документацией и интеграция с ИИ
- **Data Collection Module** - Сбор данных с контроллера PMAC в реальном времени
- **Analytics Module** - Анализ данных и построение графиков
- **Recommendation Module** - Генерация рекомендаций на основе ИИ и ML
- **Web Frontend** - Пользовательский интерфейс системы
- **API Gateway** - REST API и WebSocket сервер

## Технологический стек

- **Backend**: Node.js, TypeScript, Go, Python
- **Frontend**: Next.js, TypeScript, ShadcnUI
- **Databases**: PostgreSQL, TimescaleDB, Redis, Vector Database
- **AI/ML**: OpenAI/Anthropic, Scikit-learn, TensorFlow
- **Infrastructure**: Docker, Docker Compose

## Быстрый старт

### Предварительные требования

- Docker и Docker Compose
- Node.js 18+
- Git

### Установка и запуск

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd RAG
```

2. Запустите систему в режиме разработки:
```bash
docker-compose -f docker-compose.dev.yml up
```

3. Откройте веб-интерфейс: http://localhost:3000

## Документация

- [Техническое задание](./pmac-assistant-system/requirements.md)
- [Дизайн системы](./pmac-assistant-system/design.md)
- [План реализации](./pmac-assistant-system/tasks.md)

## Лицензия

MIT License
