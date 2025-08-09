# Knowledge Base Service

Микросервис для управления базой знаний PMAC Assistant System. Предоставляет функционал для загрузки, обработки, индексации и поиска документации по PMAC системам.

## Основные возможности

- **Загрузка документов**: Поддержка PDF, DOC, DOCX, TXT, HTML, Markdown файлов
- **Обработка текста**: Автоматическое извлечение текста и метаданных
- **Векторный поиск**: Семантический поиск с использованием Weaviate
- **AI-ответы**: Генерация ответов на вопросы с использованием OpenAI
- **Чанкинг**: Интеллектуальное разбиение документов на части
- **API**: RESTful API для интеграции с другими сервисами

## Технологический стек

- **Node.js + TypeScript**: Основная платформа
- **Express.js**: Web-фреймворк
- **Weaviate**: Векторная база данных
- **AI Providers**: OpenAI или OpenRouter для генерации эмбеддингов и AI-ответов
- **Multer**: Загрузка файлов
- **PDF-Parse**: Обработка PDF документов
- **Cheerio**: Обработка HTML документов
- **Winston**: Логирование

## Установка и запуск

### Локальная разработка

1. Установите зависимости:
```bash
npm install
```

2. Настройте переменные окружения (создайте `.env` файл):
```env
# Сервер
KNOWLEDGE_BASE_PORT=3002
KNOWLEDGE_BASE_HOST=0.0.0.0

# Weaviate
WEAVIATE_URL=http://localhost:8080
WEAVIATE_CLASS_NAME=PMACDocument

# AI Configuration
AI_PROVIDER=openrouter  # openai или openrouter

# OpenAI (если используется)
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# OpenRouter (рекомендуется - есть бесплатные модели)
OPENROUTER_API_KEY=your_openrouter_api_key
AI_MODEL=openai/gpt-oss-20b:free  # Бесплатная модель от OpenAI
EMBEDDING_MODEL=openai/text-embedding-3-small

# Загрузка файлов
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,doc,docx,txt,html,md

# Обработка
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
MAX_CONCURRENT_JOBS=3

# Логирование
LOG_LEVEL=info
LOG_DIR=./logs
```

3. Запустите в режиме разработки:
```bash
npm run dev
```

### Docker

```bash
docker build -f Dockerfile.dev -t knowledge-base-dev .
docker run -p 3002:3002 knowledge-base-dev
```

## API Endpoints

### Health Check
```
GET /health
```

### Документация API
```
GET /api
```

### Поиск документов
```
POST /search
Content-Type: application/json

{
  "query": "как настроить PMAC контроллер",
  "limit": 10,
  "threshold": 0.7,
  "includeContent": true,
  "filters": {
    "documentTypes": ["pdf", "html"],
    "categories": ["manual", "guide"],
    "tags": ["configuration"],
    "language": "ru"
  }
}
```

### AI-ответ на вопрос
```
POST /ask
Content-Type: application/json

{
  "query": "Как подключить ось к контроллеру PMAC?",
  "maxSources": 5,
  "includeReasoning": true
}
```

### Загрузка документа
```
POST /documents/upload
Content-Type: multipart/form-data

FormData:
- file: выбранный файл
- title: заголовок документа (опционально)
- category: категория документа (опционально)
- tags: теги через запятую (опционально)
- author: автор документа (опционально)
```

### Статус обработки
```
GET /processing/{jobId}
```

### Удаление документа
```
DELETE /documents/{documentId}
```

### Статистика
```
GET /stats
```

## AI Провайдеры

Сервис поддерживает два AI провайдера:

### OpenRouter (рекомендуется)

[OpenRouter](https://openrouter.ai/) предоставляет доступ к множеству AI моделей, включая **бесплатные**:

- **Бесплатная модель**: `openai/gpt-oss-20b:free` - 21B параметров модель от OpenAI под Apache 2.0 лицензией
- **Функциональность**: Поддерживает функции, инструменты, структурированные выходы
- **Эмбеддинги**: Используются через OpenAI API для `text-embedding-3-small`

Для использования OpenRouter:
1. Зарегистрируйтесь на https://openrouter.ai/
2. Получите API ключ в настройках аккаунта
3. Установите `AI_PROVIDER=openrouter` и `OPENROUTER_API_KEY`

### OpenAI

Классический провайдер с высоким качеством, но платный:
- Требует API ключ OpenAI
- Все модели платные (GPT-4, GPT-3.5, эмбеддинги)
- Установите `AI_PROVIDER=openai` и `OPENAI_API_KEY`

## Конфигурация

Сервис настраивается через переменные окружения:

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `KNOWLEDGE_BASE_PORT` | Порт сервера | 3002 |
| `KNOWLEDGE_BASE_HOST` | Хост сервера | 0.0.0.0 |
| `WEAVIATE_URL` | URL Weaviate | http://localhost:8080 |
| `WEAVIATE_API_KEY` | API ключ Weaviate | - |
| `AI_PROVIDER` | AI провайдер | openrouter |
| `OPENAI_API_KEY` | API ключ OpenAI | - |
| `OPENAI_MODEL` | Модель OpenAI | gpt-4 |
| `OPENROUTER_API_KEY` | API ключ OpenRouter | - |
| `AI_MODEL` | Модель для OpenRouter | openai/gpt-oss-20b:free |
| `EMBEDDING_MODEL` | Модель эмбеддингов | text-embedding-3-small |
| `UPLOAD_DIR` | Директория загрузок | ./uploads |
| `MAX_FILE_SIZE` | Максимальный размер файла | 10485760 (10MB) |
| `CHUNK_SIZE` | Размер чанка | 1000 |
| `CHUNK_OVERLAP` | Перекрытие чанков | 200 |

## Обработка документов

### Поддерживаемые форматы

- **PDF**: Извлечение текста и метаданных
- **DOC/DOCX**: Обработка Microsoft Word документов
- **TXT**: Простые текстовые файлы
- **HTML**: Извлечение контента из веб-страниц
- **Markdown**: Поддержка разметки Markdown

### Процесс обработки

1. **Загрузка**: Файл сохраняется на диск
2. **Извлечение текста**: Текст извлекается в зависимости от типа файла
3. **Чанкинг**: Текст разбивается на логические части
4. **Генерация эмбеддингов**: Создаются векторные представления
5. **Индексация**: Данные сохраняются в Weaviate
6. **Завершение**: Статус обработки обновляется

### Качество обработки

Система автоматически оценивает качество обработанного контента:
- Длина и структура текста
- Наличие технической терминологии
- Качество чанкинга
- Оценка от 0.0 до 1.0

## Архитектура

```
├── src/
│   ├── config/           # Конфигурация
│   ├── controllers/      # HTTP контроллеры
│   ├── services/         # Бизнес-логика
│   │   ├── weaviate-service.ts
│   │   └── openai-service.ts
│   ├── processors/       # Обработка документов
│   │   ├── document-processor.ts
│   │   ├── text-processor.ts
│   │   ├── pdf-processor.ts
│   │   └── html-processor.ts
│   ├── types/           # TypeScript типы
│   ├── utils/           # Утилиты
│   └── index.ts         # Главный файл
```

## Логирование

Сервис использует Winston для структурированного логирования:
- `logs/combined.log` - все логи
- `logs/error.log` - только ошибки
- `logs/exceptions.log` - необработанные исключения

## Мониторинг

### Health Check

Endpoint `/health` предоставляет информацию о состоянии:
- Подключение к Weaviate
- Подключение к OpenAI
- Использование памяти
- Время работы сервиса

### Метрики

Endpoint `/stats` предоставляет статистику:
- Количество документов
- Статистика обработки
- Использование ресурсов

## Безопасность

- Валидация типов файлов
- Ограничение размера файлов
- Санитизация входных данных
- Обработка ошибок без утечки информации

## Разработка

### Скрипты

- `npm run dev` - запуск в режиме разработки
- `npm run build` - сборка проекта
- `npm run start` - запуск продакшен версии
- `npm run lint` - проверка кода
- `npm test` - запуск тестов

### Добавление нового процессора

1. Создайте класс, наследующий `BaseDocumentProcessor`
2. Реализуйте методы `canProcess`, `extractText`, `extractMetadata`
3. Зарегистрируйте процессор в `KnowledgeController.setupProcessors()`

## Интеграция

Сервис интегрируется с:
- **MCP Server**: Предоставляет инструменты для работы с базой знаний
- **API Gateway**: Обеспечивает единую точку входа
- **Web Frontend**: Пользовательский интерфейс для управления документами

## Производительность

- Асинхронная обработка документов
- Пакетная генерация эмбеддингов
- Кэширование результатов поиска
- Ограничение количества одновременных задач

## Устранение неполадок

### Частые проблемы

1. **Weaviate недоступен**: Проверьте URL и статус Weaviate
2. **OpenAI API ошибки**: Проверьте API ключ и квоты
3. **Ошибки загрузки**: Проверьте типы файлов и размеры
4. **Медленная обработка**: Проверьте загрузку системы и настройки чанкинга

### Логи

Проверьте логи в директории `logs/` для диагностики проблем.
