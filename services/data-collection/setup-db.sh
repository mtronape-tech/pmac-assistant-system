#!/bin/bash

# Скрипт настройки PostgreSQL для Data Collection

echo "🗄️ Настройка PostgreSQL для PMAC Assistant..."

# Устанавливаем пароль для пользователя postgres
echo "📝 Устанавливаем пароль для пользователя postgres..."
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# Создаем базу данных
echo "🏗️ Создаем базу данных pmac_assistant..."
sudo -u postgres createdb pmac_assistant

# Устанавливаем TimescaleDB (если доступно)
echo "⏰ Пытаемся установить TimescaleDB..."
sudo -u postgres psql -d pmac_assistant -c "CREATE EXTENSION IF NOT EXISTS timescaledb;" || echo "⚠️ TimescaleDB недоступен, используем обычный PostgreSQL"

# Настраиваем подключения (разрешаем подключения с localhost)
echo "🔧 Настраиваем подключения..."

# Резервная копия конфигурации
sudo cp /etc/postgresql/16/main/pg_hba.conf /etc/postgresql/16/main/pg_hba.conf.backup

# Добавляем строку для локальных подключений с паролем
echo "host    all             all             127.0.0.1/32            md5" | sudo tee -a /etc/postgresql/16/main/pg_hba.conf

# Настраиваем postgresql.conf для прослушивания на localhost
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /etc/postgresql/16/main/postgresql.conf

# Перезапускаем PostgreSQL
echo "🔄 Перезапускаем PostgreSQL..."
sudo systemctl restart postgresql

# Проверяем подключение
echo "✅ Проверяем подключение..."
if PGPASSWORD=postgres psql -h localhost -U postgres -d pmac_assistant -c "SELECT version();" > /dev/null 2>&1; then
    echo "🎉 PostgreSQL настроен успешно!"
    echo "📋 Параметры подключения:"
    echo "   Host: localhost"
    echo "   Port: 5432"
    echo "   Database: pmac_assistant"
    echo "   Username: postgres"
    echo "   Password: postgres"
else
    echo "❌ Ошибка подключения к базе данных"
    exit 1
fi
