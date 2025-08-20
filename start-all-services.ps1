# PMAC Assistant System - Start All Services
# Author: PMAC Assistant Team
# Version: 1.0.0

Write-Host "Starting PMAC Assistant System" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# Check if we are in the project root
if (-not (Test-Path "services")) {
    Write-Host "Error: Run script from project root directory" -ForegroundColor Red
    exit 1
}

# Function to test port
function Test-Port {
    param($port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Function to wait for service startup
function Wait-ForService {
    param($serviceName, $port, $maxWait = 30)
    Write-Host "Waiting for $serviceName on port $port..." -ForegroundColor Yellow
    $waitTime = 0
    while ($waitTime -lt $maxWait) {
        if (Test-Port $port) {
            Write-Host "OK $serviceName started on port $port" -ForegroundColor Green
            return $true
        }
        Start-Sleep 1
        $waitTime++
    }
    Write-Host "Timeout waiting for $serviceName" -ForegroundColor Red
    return $false
}

# Stop existing processes on required ports
Write-Host "Stopping existing processes..." -ForegroundColor Yellow
$ports = @(3000, 3001, 3002, 3003, 3004, 3005)
foreach ($port in $ports) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    foreach ($processId in $processes) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Host "   Stopped process $processId on port $port" -ForegroundColor Gray
        }
        catch {
            # Ignore errors
        }
    }
}

# Create logs directory
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# Start services in background
Write-Host "`nStarting services..." -ForegroundColor Cyan

 

# 1. Data Collection Service (port 3002)
Write-Host "1. Starting Data Collection Service..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/services/data-collection'; npm run build; if (`$LASTEXITCODE -eq 0) { npm start } else { Write-Host 'Build failed!' -ForegroundColor Red; Read-Host 'Press Enter to close' }"
Start-Sleep 5

# 2. MCP Server (port 3004)
Write-Host "2. Starting MCP Server..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/services/mcp-server'; npm run build; if (`$LASTEXITCODE -eq 0) { npm start } else { Write-Host 'Build failed!' -ForegroundColor Red; Read-Host 'Press Enter to close' }"
Start-Sleep 5

# 3. PMAC Control Service (port 3001)
Write-Host "3. Starting PMAC Control Service..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/services/pmac-control'; npm run build; if (`$LASTEXITCODE -eq 0) { npm start } else { Write-Host 'Build failed!' -ForegroundColor Red; Read-Host 'Press Enter to close' }"
Start-Sleep 5

# 4. Knowledge Base Service (port 3005)
Write-Host "4. Starting Knowledge Base Service..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/services/knowledge-base'; npm run build; if (`$LASTEXITCODE -eq 0) { npm start } else { Write-Host 'Build failed!' -ForegroundColor Red; Read-Host 'Press Enter to close' }"
Start-Sleep 5

# 5. Analytics Service (port 3003) - Python
Write-Host "5. Starting Analytics Service..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/services/analytics'; python simple_analytics_service.py"
Start-Sleep 5

# 6. Web Frontend (port 3000)
Write-Host "6. Starting Web Frontend..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/packages/web-frontend'; npm run dev"
Start-Sleep 5

# Wait for all services to start
Write-Host "`nWaiting for all services to start..." -ForegroundColor Yellow

 

$services = @(
    @{Name="Data Collection"; Port=3002},
    @{Name="MCP Server"; Port=3004},
    @{Name="PMAC Control"; Port=3001},
    @{Name="Knowledge Base"; Port=3005},
    @{Name="Analytics"; Port=3003},
    @{Name="Web Frontend"; Port=3000}
)

$allStarted = $true
foreach ($service in $services) {
    if (-not (Wait-ForService $service.Name $service.Port)) {
        $allStarted = $false
    }
}

# Show final status
Write-Host "`nService startup status:" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

if ($allStarted) {
    Write-Host "All services started successfully!" -ForegroundColor Green
    Write-Host "`nAvailable URLs:" -ForegroundColor Cyan
    Write-Host "   Web Frontend:     http://localhost:3000" -ForegroundColor White
    Write-Host "   PMAC Control:     http://localhost:3001" -ForegroundColor White
    Write-Host "   Data Collection:  http://localhost:3002" -ForegroundColor White
    Write-Host "   Analytics:        http://localhost:3003" -ForegroundColor White
    Write-Host "   MCP Server:       http://localhost:3004" -ForegroundColor White
    Write-Host "   Knowledge Base:   http://localhost:3005" -ForegroundColor White
    
    Write-Host "`nAPI Documentation:" -ForegroundColor Cyan
    Write-Host "   Analytics API:    http://localhost:3003/docs" -ForegroundColor White
    
    Write-Host "`nTo stop all services use: stop-all-services.ps1" -ForegroundColor Yellow
} else {
    Write-Host "Some services failed to start" -ForegroundColor Red
    Write-Host "Check logs in separate PowerShell windows" -ForegroundColor Yellow
}

Write-Host "`nSystem is ready!" -ForegroundColor Green
