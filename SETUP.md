# 🔧 Настройка PMAC Assistant System

## 📋 Предварительные требования

### Системные требования
- **OS**: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- **Node.js**: версия 18.0.0 или выше
- **npm**: версия 8.0.0 или выше
- **Python**: версия 3.11+ (для Analytics сервиса)
- **pip**: версия 21.0+ (для установки Python пакетов)
- **RAM**: минимум 4GB, рекомендуется 8GB+
- **Диск**: минимум 2GB свободного места

### Проверка версий
```bash
node --version    # Должно быть v18.0.0+
npm --version     # Должно быть 8.0.0+
python --version  # Должно быть 3.11+
pip --version     # Должно быть 21.0+
```

## 🚀 Установка

### 1. Клонирование репозитория
```bash
git clone https://github.com/mtronape-tech/pmac-assistant-system.git
cd pmac-assistant-system
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

## ⚙️ Конфигурация

### Настройка AI Provider

**Шаг 1: Создание конфигурационного файла**
```bash
# Windows
copy services\knowledge-base\config.ini.template services\knowledge-base\config.ini

# Linux/Mac
cp services/knowledge-base/config.ini.template services/knowledge-base/config.ini
```

**Шаг 2: Получение API ключа**
1. Перейдите на [OpenRouter](https://openrouter.ai/)
2. Зарегистрируйтесь или войдите в аккаунт
3. Перейдите в раздел "API Keys"
4. Создайте новый API ключ
5. Скопируйте ключ (начинается с `sk-or-v1-...`)

**Шаг 3: Редактирование config.ini**
Откройте `services/knowledge-base/config.ini` и замените:
```ini
[OpenRouter]
api_key=your_openrouter_api_key_here  # ← Вставьте ваш API ключ
```

### Проверка конфигурации
```bash
# Проверьте, что файл создан
ls services/knowledge-base/config.ini

# Проверьте содержимое (не должно содержать "your_api_key_here")
cat services/knowledge-base/config.ini
```

## 🔧 Сборка проекта

### Сборка всех сервисов
```bash
npm run build:all
```

### Сборка отдельных сервисов
```bash
# Knowledge Base
cd services/knowledge-base
npm run build

# MCP Server
cd services/mcp-server
npm run build

# PMAC Control
cd services/pmac-control
npm run build

# Data Collection
cd services/data-collection
npm run build

# Analytics
cd services/analytics
npm run build

# Web Frontend
cd services/web-frontend
npm run build
```

## 🚀 Запуск системы

### Автоматический запуск (рекомендуется)
```powershell
# Windows PowerShell
powershell -ExecutionPolicy Bypass -File .\start-all-services.ps1

# Linux/Mac
./start-all-services.sh
```

### Ручной запуск сервисов
```bash
# Терминал 1: Data Collection
cd services/data-collection && npm start

# Терминал 2: MCP Server
cd services/mcp-server && npm start

# Терминал 3: PMAC Control
cd services/pmac-control && npm start

# Терминал 4: Knowledge Base
cd services/knowledge-base && npm start

# Терминал 5: Analytics (Python)
cd services/analytics
# Активируйте виртуальное окружение:
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate
python -m uvicorn main:app --host 0.0.0.0 --port 3003

# Терминал 6: Web Frontend
cd services/web-frontend && npm start
```

## ✅ Проверка работоспособности

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

### Ожидаемые ответы
- **Data Collection**: `{"status":"healthy"}`
- **MCP Server**: `{"status":"healthy"}`
- **PMAC Control**: `{"success":true,"data":{"status":"healthy"}}`
- **Knowledge Base**: `{"success":true,"data":{"status":"healthy"}}`
- **Analytics**: `{"status":"healthy"}`
- **Web Frontend**: HTML страница

## 🐛 Устранение неполадок

### Проблема: "AI функции будут отключены"
**Причина:** Не создан или неправильно настроен `config.ini`
**Решение:**
```bash
# 1. Проверьте существование файла
ls services/knowledge-base/config.ini

# 2. Если файл не существует, создайте из шаблона
copy services\knowledge-base\config.ini.template services\knowledge-base\config.ini

# 3. Проверьте содержимое
cat services/knowledge-base/config.ini

# 4. Убедитесь, что api_key не содержит "your_api_key_here"
```

### Проблема: "Z.AI API ключ не настроен"
**Причина:** Неправильный API ключ в `config.ini`
**Решение:**
1. Проверьте API ключ на [OpenRouter](https://openrouter.ai/)
2. Обновите `config.ini` с правильным ключом
3. Перезапустите Knowledge Base сервис

### Проблема: "Port already in use"
**Причина:** Порт занят другим процессом
**Решение:**
```bash
# Windows
netstat -ano | findstr :3005
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3005
kill -9 <PID>
```

### Проблема: "ECONNREFUSED" в MCP Server
**Причина:** PMAC Control Service не запущен
**Решение:**
1. Убедитесь, что PMAC Control запущен на порту 3001
2. Проверьте логи MCP Server
3. Перезапустите оба сервиса

### Проблема: "ModuleNotFoundError" в Analytics
**Причина:** Python зависимости не установлены
**Решение:**
```bash
cd services/analytics
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
```

### Проблема: "Python not found" или "python: command not found"
**Причина:** Python не установлен или не добавлен в PATH
**Решение:**
1. Установите Python 3.11+ с [python.org](https://python.org/)
2. Убедитесь, что опция "Add Python to PATH" включена при установке
3. Перезапустите терминал

## 🔍 Логи и отладка

### Просмотр логов сервисов
```bash
# Knowledge Base
cd services/knowledge-base
npm start

# MCP Server
cd services/mcp-server
npm start
```

### Ключевые сообщения в логах
- ✅ `"AI сервис инициализирован успешно"`
- ✅ `"PMAC Control Service доступен"`
- ❌ `"Z.AI API ключ не настроен"`
- ❌ `"PMAC Control Service недоступен"`

## 🛑 Остановка системы

### Остановка всех сервисов
```powershell
# Windows
powershell -ExecutionPolicy Bypass -File .\stop-all-services.ps1

# Linux/Mac
./stop-all-services.sh
```

### Принудительная остановка
```bash
# Остановка процессов на портах
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

## 📚 Дополнительные ресурсы

- **README.md** - полная документация
- **QUICK_START.md** - быстрый старт
- **GitHub Issues** - отчеты о проблемах
- **OpenRouter Docs** - документация AI API

---

**Нужна помощь?** Создайте issue в репозитории с описанием проблемы и логами.
