# 🚀 Быстрый старт PMAC Assistant System

## ⚡ Запуск за 5 минут

### 1. Клонирование и установка
```bash
git clone <your-repo-url>
cd RAG
npm install
npm run install:all
```

### 2. Настройка AI (обязательно!)
Создайте файл `services/knowledge-base/config.ini`:
```ini
[AI]
provider=openrouter

[OpenRouter]
api_key=your_api_key_here
base_url=https://openrouter.ai/api/v1
model=z-ai/glm-4.5-air:free
embedding_model=text-embedding-3-small
max_tokens=4000
```

**Получить API ключ:** [OpenRouter](https://openrouter.ai/)

### 3. Запуск системы
```powershell
# Windows
powershell -ExecutionPolicy Bypass -File .\start-all-services.ps1

# Linux/Mac
./start-all-services.sh
```

### 4. Проверка работы
```bash
# Все сервисы должны показать "healthy"
curl http://localhost:3000    # Web Frontend
curl http://localhost:3001    # PMAC Control  
curl http://localhost:3002    # Data Collection
curl http://localhost:3003    # Analytics
curl http://localhost:3004    # MCP Server
curl http://localhost:3005    # Knowledge Base
```

## 🌐 Веб-интерфейс
Откройте: **http://localhost:3000**

## 📚 API документация
- **Analytics API**: http://localhost:3003/docs
- **Knowledge Base API**: http://localhost:3005/api

## 🛑 Остановка
```powershell
powershell -ExecutionPolicy Bypass -File .\stop-all-services.ps1
```

## ❗ Важно
- **Node.js 18+** обязателен
- **API ключ** для AI функций обязателен
- **Порты 3000-3005** должны быть свободны

---
**Подробная документация:** [README.md](README.md)
