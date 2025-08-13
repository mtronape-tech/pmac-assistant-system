# Скрипт запуска Data Collection с переменными среды

Write-Host "🚀 Запуск Data Collection Service..." -ForegroundColor Green

# Загружаем переменные из test.env
if (Test-Path "test.env") {
    Write-Host "📝 Загружаем переменные из test.env..." -ForegroundColor Yellow
    
    Get-Content "test.env" | ForEach-Object {
        if ($_ -match '^([^#].*)=(.*)') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, 'Process')
            Write-Host "   $name = $value" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "❌ Файл test.env не найден!" -ForegroundColor Red
    exit 1
}

# Проверяем подключение к базе данных
Write-Host "🔧 Проверяем подключение к сервисам..." -ForegroundColor Yellow

try {
    $socket = New-Object System.Net.Sockets.TcpClient
    $socket.Connect($env:DB_HOST, 5432)
    $socket.Close()
    Write-Host "✅ PostgreSQL доступен" -ForegroundColor Green
} catch {
    Write-Host "❌ PostgreSQL недоступен на $($env:DB_HOST):5432" -ForegroundColor Red
    Write-Host "   Убедитесь, что WSL PostgreSQL запущен" -ForegroundColor Yellow
    exit 1
}

try {
    $socket = New-Object System.Net.Sockets.TcpClient
    $socket.Connect($env:REDIS_HOST, 6379)
    $socket.Close()
    Write-Host "✅ Redis доступен" -ForegroundColor Green
} catch {
    Write-Host "❌ Redis недоступен на $($env:REDIS_HOST):6379" -ForegroundColor Red
    Write-Host "   Убедитесь, что WSL Redis запущен" -ForegroundColor Yellow
    exit 1
}

# Включаем PMAC Control для тестирования
$env:PMAC_CONTROL_ENABLED = "true"

Write-Host "🎯 Все готово! Запускаем сервис..." -ForegroundColor Green
Write-Host ""

# Запускаем сервис
npm run dev
