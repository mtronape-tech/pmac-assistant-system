# PMAC Assistant System

Интеллектуальный помощник для наладчиков станков с ЧПУ на базе контроллера Turbo PMAC.

## 🎯 Описание

Система помощника наладчика станков с ЧПУ (PMAC Assistant System) представляет собой модульную веб-платформу с микросервисной архитектурой. Система обеспечивает интеллектуальное взаимодействие с контроллером PMAC через ИИ помощника, управление переменными, сбор и анализ данных в реальном времени, а также предоставление рекомендаций.

## 🏗️ Архитектура системы

Система состоит из 6 микросервисов:

| Сервис | Порт | Технология | Описание |
|--------|------|------------|----------|
| 🌐 **Web Frontend** | 3000 | Next.js + TypeScript | Веб-интерфейс системы |
| 🎛️ **PMAC Control** | 3001 | Node.js + TypeScript | Управление контроллером PMAC |
| 📡 **Data Collection** | 3002 | Node.js + TypeScript | Сбор данных в реальном времени |
| 📊 **Analytics** | 3003 | Python + FastAPI | Аналитика и визуализация |
| 🤖 **MCP Server** | 3004 | Node.js + TypeScript | AI интеграция и инструменты |
| 📚 **Knowledge Base** | 3005 | Node.js + TypeScript | База знаний с векторным поиском |

## 🛠️ Технологический стек

- **Backend**: Node.js 20+, TypeScript, Python 3.11+
- **Frontend**: Next.js 14, React, TypeScript, ShadcnUI
- **Databases**: SQLite, Vectra (векторная БД)
- **AI/ML**: OpenAI/OpenRouter, векторные эмбеддинги
- **Инфраструктура**: Локальная разработка без Docker

## 🚀 Быстрый старт

### Предварительные требования

- **Node.js 20+** (рекомендуется LTS версия)
- **Python 3.11+** (для Analytics сервиса)
- **Git** для клонирования репозитория
- **PowerShell** (Windows) или **Bash** (Linux/macOS)

### Установка и запуск

1. **Клонируйте репозиторий:**
   ```bash
   git clone https://github.com/mtronape-tech/pmac-assistant-system.git
   cd pmac-assistant-system
   ```

2. **Установите зависимости для всех сервисов:**
   ```bash
   # Установка Node.js зависимостей
   npm install
   
   # Установка Python зависимостей для Analytics
   cd services/analytics
   pip install -r requirements.txt
   cd ../..
   ```

3. **Запустите все сервисы одной командой:**
   ```powershell
   # Windows PowerShell
   .\start-all-services.ps1
   
   # Или через npm
   npm run dev
   ```

4. **Проверьте статус сервисов:**
   ```powershell
   .\check-services-status.ps1
   ```

### 🌐 Доступные интерфейсы

После запуска будут доступны:

- **🏠 Главная страница:** http://localhost:3000
- **🎛️ PMAC Control:** http://localhost:3001
- **📡 Data Collection:** http://localhost:3002  
- **📊 Analytics API:** http://localhost:3003/docs
- **🤖 MCP Server:** http://localhost:3004
- **📚 Knowledge Base:** http://localhost:3005/api

## ✨ Особенности архитектуры

- ✅ **Без Docker** - все сервисы работают локально
- ✅ **SQLite** - простая файловая база данных 
- ✅ **Быстрый запуск** - система готова за 30 секунд
- ✅ **Простая разработка** - работает на любой машине
- ✅ **AI-Ready** - интегрирован с OpenAI/OpenRouter
- ✅ **Микросервисы** - каждый компонент независим
- ✅ **Real-time** - WebSocket для данных в реальном времени
- ✅ **Fallback режимы** - работает даже без внешних сервисов

## 📖 Функциональность

### 🎛️ PMAC Control
- Чтение/запись переменных P, Q, I, M, L
- Выполнение команд контроллера
- Мониторинг статуса системы и осей
- Встроенный симулятор для разработки

### 📡 Data Collection  
- Автоматический сбор данных с контроллера
- Настраиваемые интервалы сбора
- WebSocket streaming в реальном времени
- Мониторинг качества данных

### 📊 Analytics
- Визуализация данных (Plotly, Matplotlib)
- Анализ трендов и аномалий
- Автоматическая генерация отчетов
- RESTful API с Swagger документацией

### 🤖 MCP Server
- AI интеграция через MCP Protocol
- Умные инструменты для работы с PMAC
- Генерация рекомендаций
- Интеграция с базой знаний

### 📚 Knowledge Base
- Загрузка документации (PDF, DOC, TXT, HTML)
- Поиск и фильтрация документов
- Автоматическая категоризация
- Векторный поиск с Vectra
- AI-ответы на вопросы
- Автоматическая обработка документов

### 🌐 Web Frontend
- Современный интерфейс на Next.js
- Адаптивный дизайн
- Real-time обновления
- Интуитивная навигация

## 🔧 Управление системой

```powershell
# Запуск всех сервисов
.\start-all-services.ps1

# Проверка статуса
.\check-services-status.ps1

# Остановка всех сервисов  
.\stop-all-services.ps1
```

## 📚 Документация

- [📋 Управление сервисами](./SERVICES_README.md)
- [📝 Техническое задание](./pmac-assistant-system/requirements.md)
- [🏗️ Дизайн системы](./pmac-assistant-system/design.md)
- [📋 План реализации](./pmac-assistant-system/tasks.md)
- [✅ Результаты тестирования](./TESTING_SUMMARY.md)

## 🤝 Участие в разработке

1. Форкните репозиторий
2. Создайте ветку для новой функции
3. Внесите изменения и напишите тесты
4. Отправьте Pull Request

## 📄 Лицензия

MIT License - см. файл [LICENSE](LICENSE)
