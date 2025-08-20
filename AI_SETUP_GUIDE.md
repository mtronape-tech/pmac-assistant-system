# 🤖 Руководство по настройке AI для PMAC Assistant

## 🚀 Конфигурация Moonshot AI (kimi-k2:free)

Уже настроена! Файл `.env` создан в `services/knowledge-base/` с конфигурацией для модели `moonshotai/kimi-k2:free`.

### Что нужно сделать:
1. **Получите API ключ OpenRouter:** https://openrouter.ai/
2. **Откройте файл** `services/knowledge-base/.env`
3. **Замените** `OPENROUTER_API_KEY=` на `OPENROUTER_API_KEY=ваш_ключ_здесь`
4. **Перезапустите** Knowledge Base сервис

## 🔧 Альтернативные решения

### Вариант 1: OpenAI (рекомендуется)

1. **Получите API ключ OpenAI:**
   - Зайдите на https://platform.openai.com
   - Создайте аккаунт или войдите
   - Перейдите в API Keys
   - Создайте новый API ключ

2. **Создайте файл `.env` в `services/knowledge-base/`:**
   ```bash
   # Knowledge Base Configuration
   KNOWLEDGE_BASE_PORT=3005
   KNOWLEDGE_BASE_HOST=0.0.0.0
   
   # AI Configuration
   AI_PROVIDER=openai
   OPENAI_API_KEY=sk-your-openai-api-key-here
   OPENAI_MODEL=gpt-3.5-turbo
   OPENAI_EMBEDDING_MODEL=text-embedding-3-small
   OPENAI_MAX_TOKENS=4000
   
   # Vectra (векторная база данных)
   VECTRA_DATA_PATH=./data
   VECTRA_INDEX_NAME=vectra
   
   # Файлы и обработка
   UPLOAD_DIR=./uploads
   MAX_FILE_SIZE=10485760
   ALLOWED_FILE_TYPES=pdf,doc,docx,txt,html,md
   CHUNK_SIZE=1000
   CHUNK_OVERLAP=200
   MAX_CONCURRENT_JOBS=3
   
   # Логирование
   LOG_LEVEL=info
   LOG_DIR=./logs
   NODE_ENV=development
   ```

### Вариант 2: Локальный AI (без интернета)

Отредактируйте `services/knowledge-base/src/services/openai-service.ts`:

```typescript
// В конструкторе добавьте fallback режим
constructor() {
  // ... существующий код ...
  
  // Если API ключи не настроены, используем локальный режим
  if (!config.ai.openai.apiKey && !config.ai.openrouter.apiKey) {
    logger.info('AI ключи не настроены, используем локальный режим');
    this.client = null;
  }
}
```

### Вариант 3: Альтернативные провайдеры

1. **Hugging Face (бесплатный):**
   - Получите ключ на https://huggingface.co
   - Измените baseURL в конфигурации

2. **Yandex GPT:**
   - Для российских пользователей
   - Получите ключ в Yandex Cloud

3. **GigaChat (Сбер):**
   - Российский AI провайдер
   - Получите ключ на https://developers.sber.ru

## 🚀 Быстрый запуск без AI

Если хотите протестировать систему без AI:

1. **Создайте минимальный `.env`:**
   ```bash
   cd services/knowledge-base
   echo KNOWLEDGE_BASE_PORT=3005 > .env
   echo AI_PROVIDER=openai >> .env
   echo OPENAI_API_KEY= >> .env
   ```

2. **Система будет работать в fallback режиме** с базовыми ответами

## 🔍 Проверка настройки

После настройки запустите:

```bash
# Перезапустите Knowledge Base
cd services/knowledge-base
npm run build
node dist/index.js

# Проверьте логи
tail -f logs/combined.log
```

## 🎯 Тестирование

1. Откройте http://localhost:3000/chat
2. Задайте вопрос: "Привет"
3. Если получите ответ - AI работает!

## 🆘 Помощь

Если проблемы остаются:
1. Проверьте логи в `services/knowledge-base/logs/`
2. Убедитесь, что API ключ правильный
3. Проверьте подключение к интернету
4. Попробуйте другой AI провайдер
