# 🚀 Быстрый старт PMAC Assistant System

## ⚡ Запуск за 5 минут

### 1. Клонирование и установка
```bash
git clone <your-repo-url>
cd pmac-assistant-system

# Node.js зависимости
npm install
npm run install:all

# Python зависимости (для Analytics)
# Windows:
powershell -ExecutionPolicy Bypass -File .\install-python-deps.ps1
# Linux/Mac:
chmod +x install-python-deps.sh && ./install-python-deps.sh
```

### 2. Настройка AI (обязательно!)
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
api_key=your_openrouter_api_key_here  # ← Вставьте ваш API ключ
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
- **Python 3.11+** обязателен для Analytics сервиса
- **API ключ** для AI функций обязателен
- **Порты 3000-3005** должны быть свободны
- **config.ini** создается из шаблона `config.ini.template`

## 🔧 Решение проблем

### Проблема: "AI функции будут отключены"
**Решение:** Проверьте, что создали `config.ini` из шаблона и вставили правильный API ключ

### Проблема: "Z.AI API ключ не настроен"
**Решение:** Убедитесь, что в `config.ini` указан правильный `api_key`

---
**Подробная документация:** [README.md](README.md)
