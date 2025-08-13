#!/bin/bash

# Скрипт настройки сетевого доступа к PostgreSQL и Redis из Windows

echo "🌐 Настройка сетевого доступа к сервисам..."

# Получаем IP адрес WSL
WSL_IP=$(hostname -I | awk '{print $1}')
echo "📍 IP адрес WSL: $WSL_IP"

# Настраиваем PostgreSQL для прослушивания на всех интерфейсах
echo "🗄️ Настраиваем PostgreSQL..."
sudo sed -i "s/listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/16/main/postgresql.conf

# Добавляем разрешение для подключений из Windows
echo "# Allow connections from Windows" | sudo tee -a /etc/postgresql/16/main/pg_hba.conf
echo "host    all             all             0.0.0.0/0               md5" | sudo tee -a /etc/postgresql/16/main/pg_hba.conf

# Настраиваем Redis для прослушивания на всех интерфейсах
echo "🔄 Настраиваем Redis..."
sudo sed -i 's/bind 127.0.0.1 ::1/bind 0.0.0.0/' /etc/redis/redis.conf
sudo sed -i 's/protected-mode yes/protected-mode no/' /etc/redis/redis.conf

# Перезапускаем сервисы
echo "🔄 Перезапускаем сервисы..."
sudo systemctl restart postgresql
sudo systemctl restart redis-server

# Показываем информацию о подключении
echo ""
echo "✅ Настройка завершена!"
echo "📋 Информация для подключения из Windows:"
echo "🗄️ PostgreSQL:"
echo "   Host: $WSL_IP (или localhost через проброс портов)"
echo "   Port: 5432"
echo "   Database: pmac_assistant"
echo "   Username: postgres"
echo "   Password: postgres"
echo ""
echo "🔄 Redis:"
echo "   Host: $WSL_IP (или localhost через проброс портов)"
echo "   Port: 6379"
echo ""
echo "⚠️  Если не работает, выполните проброс портов:"
echo "   netsh interface portproxy add v4tov4 listenport=5432 listenaddress=0.0.0.0 connectport=5432 connectaddress=$WSL_IP"
echo "   netsh interface portproxy add v4tov4 listenport=6379 listenaddress=0.0.0.0 connectport=6379 connectaddress=$WSL_IP"
