# PowerShell скрипт для установки Python зависимостей
# PMAC Assistant System

Write-Host "🐍 Установка Python зависимостей для Analytics сервиса..." -ForegroundColor Green

# Проверяем наличие Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python найден: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python не найден! Установите Python 3.11+ с python.org" -ForegroundColor Red
    Write-Host "Убедитесь, что опция 'Add Python to PATH' включена при установке" -ForegroundColor Yellow
    exit 1
}

# Проверяем версию Python
$version = python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>&1
if ($version -lt "3.11") {
    Write-Host "❌ Требуется Python 3.11+, текущая версия: $version" -ForegroundColor Red
    exit 1
}

# Переходим в директорию Analytics
Set-Location "services/analytics"

# Проверяем наличие requirements.txt
if (-not (Test-Path "requirements.txt")) {
    Write-Host "❌ Файл requirements.txt не найден!" -ForegroundColor Red
    exit 1
}

# Создаем виртуальное окружение
Write-Host "🔧 Создание виртуального окружения..." -ForegroundColor Yellow
if (Test-Path "venv") {
    Write-Host "⚠️  Виртуальное окружение уже существует, удаляем..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "venv"
}

python -m venv venv
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка создания виртуального окружения" -ForegroundColor Red
    exit 1
}

# Активируем виртуальное окружение
Write-Host "🔧 Активация виртуального окружения..." -ForegroundColor Yellow
& "venv\Scripts\Activate.ps1"

# Обновляем pip
Write-Host "🔧 Обновление pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip

# Устанавливаем зависимости
Write-Host "📦 Установка Python зависимостей..." -ForegroundColor Yellow
pip install -r requirements.txt

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Python зависимости установлены успешно!" -ForegroundColor Green
    Write-Host "🎯 Для активации виртуального окружения выполните:" -ForegroundColor Cyan
    Write-Host "   cd services/analytics" -ForegroundColor White
    Write-Host "   venv\Scripts\activate" -ForegroundColor White
} else {
    Write-Host "❌ Ошибка установки зависимостей" -ForegroundColor Red
    exit 1
}

# Возвращаемся в корневую директорию
Set-Location "../.."

Write-Host "🎉 Установка Python зависимостей завершена!" -ForegroundColor Green
