#!/bin/bash

# Bash скрипт для установки Python зависимостей
# PMAC Assistant System

echo "🐍 Установка Python зависимостей для Analytics сервиса..."

# Проверяем наличие Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 не найден! Установите Python 3.11+"
    echo "Ubuntu/Debian: sudo apt install python3 python3-venv python3-pip"
    echo "macOS: brew install python3"
    exit 1
fi

# Проверяем версию Python
python_version=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
required_version="3.11"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "❌ Требуется Python 3.11+, текущая версия: $python_version"
    exit 1
fi

echo "✅ Python найден: версия $python_version"

# Переходим в директорию Analytics
cd services/analytics

# Проверяем наличие requirements.txt
if [ ! -f "requirements.txt" ]; then
    echo "❌ Файл requirements.txt не найден!"
    exit 1
fi

# Создаем виртуальное окружение
echo "🔧 Создание виртуального окружения..."
if [ -d "venv" ]; then
    echo "⚠️  Виртуальное окружение уже существует, удаляем..."
    rm -rf venv
fi

python3 -m venv venv
if [ $? -ne 0 ]; then
    echo "❌ Ошибка создания виртуального окружения"
    exit 1
fi

# Активируем виртуальное окружение
echo "🔧 Активация виртуального окружения..."
source venv/bin/activate

# Обновляем pip
echo "🔧 Обновление pip..."
pip install --upgrade pip

# Устанавливаем зависимости
echo "📦 Установка Python зависимостей..."
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ Python зависимости установлены успешно!"
    echo "🎯 Для активации виртуального окружения выполните:"
    echo "   cd services/analytics"
    echo "   source venv/bin/activate"
else
    echo "❌ Ошибка установки зависимостей"
    exit 1
fi

# Возвращаемся в корневую директорию
cd ../..

echo "🎉 Установка Python зависимостей завершена!"
