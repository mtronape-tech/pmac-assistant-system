# PMAC Assistant System - Остановка всех сервисов
# Автор: PMAC Assistant Team
# Версия: 1.0.0

Write-Host "🛑 Остановка PMAC Assistant System" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Red

# Порты всех сервисов
$ports = @(3000, 3001, 3002, 3003, 3004, 3005)
$serviceNames = @{
    3000 = "Web Frontend"
    3001 = "PMAC Control"
    3002 = "Data Collection"
    3003 = "Analytics"
    3004 = "MCP Server"
    3005 = "Knowledge Base"
}

# Останавливаем процессы на каждом порту
foreach ($port in $ports) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    if ($processes) {
        foreach ($processId in $processes) {
            try {
                $processName = (Get-Process -Id $processId -ErrorAction SilentlyContinue).ProcessName
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                Write-Host "✅ Остановлен $($serviceNames[$port]) (PID: $processId, $processName)" -ForegroundColor Green
            }
            catch {
                Write-Host "❌ Не удалось остановить процесс $processId на порту $port" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "ℹ️  $($serviceNames[$port]) не запущен" -ForegroundColor Gray
    }
}

# Останавливаем все процессы Node.js и Python, связанные с проектом
Write-Host "`n🔍 Поиск и остановка связанных процессов..." -ForegroundColor Yellow

# Останавливаем процессы Node.js
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
foreach ($process in $nodeProcesses) {
    try {
        $commandLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
        if ($commandLine -and ($commandLine.Contains("pmac") -or $commandLine.Contains("RAG"))) {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            Write-Host "✅ Остановлен Node.js процесс (PID: $($process.Id))" -ForegroundColor Green
        }
    }
    catch {
        # Игнорируем ошибки
    }
}

# Останавливаем процессы Python
$pythonProcesses = Get-Process -Name "python" -ErrorAction SilentlyContinue
foreach ($process in $pythonProcesses) {
    try {
        $commandLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
        if ($commandLine -and ($commandLine.Contains("analytics") -or $commandLine.Contains("simple_analytics_service"))) {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            Write-Host "✅ Остановлен Python процесс (PID: $($process.Id))" -ForegroundColor Green
        }
    }
    catch {
        # Игнорируем ошибки
    }
}

# Проверяем, что все порты свободны
Write-Host "`n🔍 Проверка освобождения портов..." -ForegroundColor Yellow
$stillOccupied = @()

foreach ($port in $ports) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($processes) {
        $stillOccupied += $port
        Write-Host "⚠️  Порт $port все еще занят" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Порт $port свободен" -ForegroundColor Green
    }
}

if ($stillOccupied.Count -eq 0) {
    Write-Host "`n🎉 Все сервисы успешно остановлены!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Некоторые порты все еще заняты: $($stillOccupied -join ', ')" -ForegroundColor Yellow
    Write-Host "Возможно, потребуется перезагрузка системы" -ForegroundColor Yellow
}

Write-Host "`n💡 Для запуска всех сервисов используйте: start-all-services.ps1" -ForegroundColor Cyan
