# Простой скрипт запуска Data Collection

Write-Host "🚀 Запуск Data Collection Service..." -ForegroundColor Green

# Устанавливаем переменные среды
$env:DB_HOST = "172.21.118.8"
$env:DB_PORT = "5432"
$env:DB_NAME = "pmac_assistant"
$env:DB_USER = "postgres"
$env:DB_PASSWORD = "postgres"
$env:DB_SSL = "false"

$env:REDIS_HOST = "172.21.118.8"
$env:REDIS_PORT = "6379"
$env:REDIS_DB = "1"

$env:PMAC_CONTROL_ENABLED = "true"
$env:PMAC_CONTROL_BASE_URL = "http://localhost:3007"

$env:PORT = "3001"
$env:HOST = "localhost"

$env:LOG_LEVEL = "debug"

Write-Host "📝 Переменные среды установлены" -ForegroundColor Green
Write-Host "🎯 Запускаем сервис..." -ForegroundColor Green

# Запускаем сервис
npm run dev
