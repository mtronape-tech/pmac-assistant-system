# PMAC Assistant System - RAG с AI

Система для работы с документами PMAC с использованием Retrieval-Augmented Generation (RAG) и AI моделей.

## 🚀 Возможности

- **Document Processing**: Загрузка и обработка PDF, DOC, DOCX, TXT, HTML, MD файлов
- **AI Integration**: Интеграция с OpenAI, OpenRouter и Z.AI моделями
- **Vector Search**: Семантический поиск по документам с использованием Vectra
- **PMAC Control**: Управление PMAC устройствами через MCP Server
- **Analytics**: Аналитика и мониторинг системы
- **Web Interface**: Веб-интерфейс для взаимодействия с системой

## 🛠️ Требования

- **Node.js**: версия 18+ (для поддержки fetch API)
- **npm**: версия 8+
- **Python**: версия 3.11+ (для Analytics сервиса)
- **pip**: версия 21.0+ (для установки Python пакетов)
- **PowerShell**: для Windows (или bash для Linux/Mac)

## 📦 Установка

### 1. Клонирование репозитория
```bash
git clone <your-repo-url>
cd RAG
```

### 2. Установка зависимостей

#### Node.js зависимости
```bash
# Установка корневых зависимостей
npm install

# Установка зависимостей для всех сервисов
npm run install:all
```

#### Python зависимости (для Analytics сервиса)

**Автоматическая установка (рекомендуется):**
```bash
# Windows PowerShell
powershell -ExecutionPolicy Bypass -File .\install-python-deps.ps1

# Linux/Mac
chmod +x install-python-deps.sh
./install-python-deps.sh
```

**Ручная установка:**
```bash
# Перейдите в директорию Analytics
cd services/analytics

# Создайте виртуальное окружение (рекомендуется)
python -m venv venv

# Активация виртуального окружения
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Установка зависимостей
pip install -r requirements.txt

# Возврат в корневую директорию
cd ../..
```

## 🔧 Конфигурация

### AI Provider настройка

**Создайте файл конфигурации из шаблона:**
```bash
# Windows
copy services\knowledge-base\config.ini.template services\knowledge-base\config.ini

# Linux/Mac
cp services/knowledge-base/config.ini.template services/knowledge-base/config.ini
```

**Отредактируйте `services/knowledge-base/config.ini`:**

```ini
[AI]
provider=openrouter

[OpenRouter]
api_key=your_openrouter_api_key_here
base_url=https://openrouter.ai/api/v1
model=z-ai/glm-4.5-air:free
embedding_model=text-embedding-3-small
max_tokens=4000

[Server]
port=3005
host=0.0.0.0

[Vectra]
data_path=./data
index_name=vectra

[Processing]
chunk_size=1200
chunk_overlap=200
max_concurrent_jobs=3
job_timeout=300000

[Upload]
max_file_size=10485760
allowed_file_types=pdf,doc,docx,txt,html,md
upload_dir=./uploads
```

### Получение API ключа

1. Зарегистрируйтесь на [OpenRouter](https://openrouter.ai/)
2. Получите API ключ
3. Вставьте ключ в `config.ini`

## 🚀 Запуск системы

### Быстрый запуск всех сервисов
```powershell
# Windows PowerShell
powershell -ExecutionPolicy Bypass -File .\start-all-services.ps1
```

### Ручной запуск сервисов

#### 1. Data Collection Service (порт 3002)
```bash
cd services/data-collection
npm run build
npm start
```

#### 2. MCP Server (порт 3004)
```bash
cd services/mcp-server
npm run build
npm start
```

#### 3. PMAC Control Service (порт 3001)
```bash
cd services/pmac-control
npm run build
npm start
```

#### 4. Knowledge Base Service (порт 3005)
```bash
cd services/knowledge-base
npm run build
npm start
```

#### 5. Analytics Service (порт 3003)
```bash
cd services/analytics
npm run build
npm start
```

#### 6. Web Frontend (порт 3000)
```bash
cd services/web-frontend
npm run build
npm start
```

## 📊 Проверка статуса

### Health Check всех сервисов
```bash
# Data Collection
curl http://localhost:3002/health

# MCP Server
curl http://localhost:3004/health

# PMAC Control
curl http://localhost:3001/health

# Knowledge Base
curl http://localhost:3005/health

# Analytics
curl http://localhost:3003/health

# Web Frontend
curl http://localhost:3000
```

### Скрипт проверки статуса
```powershell
powershell -ExecutionPolicy Bypass -File .\check-services-status.ps1
```

## 🛑 Остановка системы

### Остановка всех сервисов
```powershell
powershell -ExecutionPolicy Bypass -File .\stop-all-services.ps1
```

## 🔍 Использование

### 1. Загрузка документов
```bash
curl -X POST -F "file=@document.pdf" http://localhost:3005/documents/upload
```

### 2. Поиск по документам
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"query":"поисковый запрос"}' \
  http://localhost:3005/search
```

### 3. AI вопросы
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"query":"ваш вопрос"}' \
  http://localhost:3005/ask
```

### 4. Веб-интерфейс
Откройте браузер и перейдите на `http://localhost:3000`

## 🏗️ Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │  PMAC Control   │    │  Data Collection│
│   (Port 3000)   │    │   (Port 3001)   │    │   (Port 3002)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   MCP Server    │
                    │   (Port 3004)   │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Knowledge Base │
                    │   (Port 3005)   │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │    Analytics    │
                    │   (Port 3003)   │
                    └─────────────────┘
```

## 🔧 Разработка

### Сборка проекта
```bash
# Сборка всех сервисов
npm run build:all

# Сборка конкретного сервиса
cd services/service-name
npm run build
```

### Разработка с hot reload
```bash
cd services/service-name
npm run dev
```

### Тестирование
```bash
npm test
```

## 📁 Структура проекта

```
RAG/
├── services/
│   ├── analytics/           # Аналитика и мониторинг
│   ├── data-collection/     # Сбор данных
│   ├── knowledge-base/      # База знаний с AI
│   ├── mcp-server/          # MCP сервер
│   ├── pmac-control/        # Управление PMAC
│   └── web-frontend/        # Веб-интерфейс
├── packages/
│   └── shared-types/        # Общие типы
├── scripts/                  # Скрипты запуска
├── config.ini               # Конфигурация AI
└── README.md                # Документация
```

## 🐛 Устранение неполадок

### Порт уже используется
```bash
# Windows
netstat -ano | findstr :3005
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3005
kill -9 <PID>
```

### Проблемы с AI
1. Проверьте API ключ в `config.ini`
2. Убедитесь, что модель доступна в OpenRouter
3. Проверьте логи сервиса

### Проблемы с PMAC Control
1. Проверьте подключение к PMAC устройству
2. Убедитесь, что порт 3001 свободен
3. Проверьте логи MCP Server

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи сервисов
2. Убедитесь, что все зависимости установлены
3. Проверьте конфигурацию в `config.ini`
4. Создайте issue в репозитории

## 📄 Лицензия

MIT License

---

**PMAC Assistant System** - мощная система для работы с документами PMAC с использованием современных AI технологий.
