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
- **Databases**: SQLite, Redis (опционально), Vector Database (опционально)
- **AI/ML**: OpenAI/Anthropic, Scikit-learn, TensorFlow
- **Infrastructure**: Local development environment

## Быстрый старт

### Предварительные требования

- Python 3.11+
- Node.js 18+
- Git

### Установка и запуск

1. **Клонируйте репозиторий:**
   ```bash
   git clone <repository-url>
   cd RAG
   ```

2. **Установите зависимости Python для аналитики:**
   ```bash
   cd services/analytics
   pip install -r requirements.txt
   ```

3. **Установите зависимости Node.js для MCP Server:**
   ```bash
   cd ../mcp-server
   npm install
   ```

4. **Запустите сервис аналитики:**
   ```bash
   cd ../analytics
   python simple_analytics_service.py
   ```

5. **В новом терминале запустите MCP Server:**
   ```bash
   cd services/mcp-server
   node start-simple.js
   ```

6. **Откройте веб-интерфейсы:**
   - **Аналитика:** http://localhost:3003/docs
   - **MCP Server:** http://localhost:3001

## Особенности новой архитектуры

- ✅ **Без Docker** - все сервисы работают локально
- ✅ **SQLite** - простая файловая база данных
- ✅ **Быстрый запуск** - не нужно ждать запуска контейнеров
- ✅ **Простая разработка** - работает на любой машине

## Документация

- [Техническое задание](./pmac-assistant-system/requirements.md)
- [Дизайн системы](./pmac-assistant-system/design.md)
- [План реализации](./pmac-assistant-system/tasks.md)

## Лицензия

MIT License
