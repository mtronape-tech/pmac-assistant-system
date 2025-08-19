# 🚀 PMAC Assistant System - Управление сервисами

## 📋 Обзор системы

PMAC Assistant System состоит из 6 основных сервисов:

| Сервис | Порт | Описание | Статус |
|--------|------|----------|--------|
| 🌐 **Web Frontend** | 3000 | Веб-интерфейс системы | ✅ |
| 🎛️ **PMAC Control** | 3001 | Управление PMAC контроллером | ❌ |
| 📡 **Data Collection** | 3002 | Сбор данных с контроллера | ❌ |
| 📊 **Analytics** | 3003 | Аналитика и визуализация | ✅ |
| 🤖 **MCP Server** | 3004 | AI-сервер для интеграции | ❌ |
| 📚 **Knowledge Base** | 3005 | База знаний и документация | ❌ |

## 🛠️ Быстрый старт

### Запуск всех сервисов
```powershell
# Способ 1: Через npm
npm run dev

# Способ 2: Напрямую через PowerShell
.\start-all-services.ps1
```

### Остановка всех сервисов
```powershell
# Способ 1: Через npm
npm run stop

# Способ 2: Напрямую через PowerShell
.\stop-all-services.ps1
```

### Проверка статуса
```powershell
# Способ 1: Через npm
npm run status

# Способ 2: Напрямую через PowerShell
.\check-services-status.ps1
```

## 🌐 Доступные URL

После запуска всех сервисов будут доступны:

- **Главная страница**: http://localhost:3000
- **PMAC Control**: http://localhost:3001
- **Data Collection**: http://localhost:3002
- **Analytics**: http://localhost:3003
- **MCP Server**: http://localhost:3004
- **Knowledge Base**: http://localhost:3005

### 📚 API Документация
- **Analytics API**: http://localhost:3003/docs

## 🔧 Индивидуальный запуск сервисов

Если нужно запустить только определенный сервис:

### Web Frontend
```powershell
cd packages/web-frontend
npm run dev
```

### Data Collection
```powershell
cd services/data-collection
npm run dev
```

### MCP Server
```powershell
cd services/mcp-server
npm run dev
```

### PMAC Control
```powershell
cd services/pmac-control
npm run dev
```

### Knowledge Base
```powershell
cd services/knowledge-base
npm run dev
```

### Analytics (Python)
```powershell
cd services/analytics
python simple_analytics_service.py
```

## 📊 Мониторинг

### Проверка процессов
```powershell
# Показать все процессы Node.js
tasklist | findstr node

# Показать все процессы Python
tasklist | findstr python

# Проверить занятые порты
netstat -ano | findstr :300
```

### Логи сервисов
Логи каждого сервиса сохраняются в папке `logs/` в корне проекта.

## 🚨 Устранение неполадок

### Порт уже занят
Если порт занят другим процессом:
```powershell
# Найти процесс на порту
netstat -ano | findstr :3000

# Остановить процесс по PID
taskkill /PID <PID> /F
```

### Сервис не запускается
1. Проверьте, что все зависимости установлены
2. Убедитесь, что порт свободен
3. Проверьте логи в папке `logs/`

### Node.js процессы
```powershell
# Остановить все процессы Node.js
taskkill /IM node.exe /F
```

### Python процессы
```powershell
# Остановить все процессы Python
taskkill /IM python.exe /F
```

## 📝 Требования

- **Node.js**: версия 18.0.0 или выше
- **npm**: версия 9.0.0 или выше
- **Python**: версия 3.8 или выше
- **PowerShell**: версия 5.1 или выше

## 🔄 Обновление системы

```powershell
# Обновить зависимости всех сервисов
npm install

# Пересобрать все сервисы
npm run build

# Перезапустить систему
npm run stop
npm run dev
```

## 📞 Поддержка

При возникновении проблем:
1. Проверьте статус сервисов: `npm run status`
2. Остановите все сервисы: `npm run stop`
3. Запустите заново: `npm run dev`
4. Проверьте логи в папке `logs/`

---

**🎯 Система готова к работе!**
