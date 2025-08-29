# PMAC Assistant System - Start All Services
# Author: PMAC Assistant Team
# Version: 1.0.0

# Force UTF-8 console for proper log output
try {
    [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
    $OutputEncoding = New-Object System.Text.UTF8Encoding
    chcp 65001 > $null 2>&1
    $PSDefaultParameterValues['Get-Content:Encoding'] = 'utf8'
    $env:NODE_ENV = 'development'
    $env:LC_ALL = 'C.UTF-8'
} catch {}

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
    param(
        $serviceName,
        $port,
        $maxWait = 45,
        $logFile = $null,
        $healthUrl = $null
    )
    Write-Host "Waiting for $serviceName on port $port..." -ForegroundColor Yellow
    $waitTime = 0
    while ($waitTime -lt $maxWait) {
        if (Test-Port $port) {
            Write-Host "OK $serviceName started on port $port" -ForegroundColor Green
            return $true
        }

        # Every 5 seconds show health and last log lines
        if (($waitTime % 5) -eq 0) {
            if ($healthUrl) {
                try {
                    $resp = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
                    Write-Host ("  health {0}: {1}" -f $healthUrl, $resp.StatusCode) -ForegroundColor DarkCyan
                } catch {
                    Write-Host ("  health {0}: error {1}" -f $healthUrl, $_.Exception.Message) -ForegroundColor DarkYellow
                }
            }
            if ($logFile) {
                if (Test-Path $logFile) {
                    Write-Host ("  tail {0}:" -f $logFile) -ForegroundColor DarkGray
                    try { Get-Content -Path $logFile -Tail 15 -Encoding UTF8 | ForEach-Object { Write-Host ("    " + $_) -ForegroundColor DarkGray } } catch {}
                } else {
                    Write-Host ("  tail {0}: (log not created yet)" -f $logFile) -ForegroundColor DarkGray
                }
            }
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

# Start services in background (single window mode)
Write-Host "`nStarting services (background)..." -ForegroundColor Cyan

function Start-BackgroundService {
    param(
        [string]$name,
        [string]$workingDir,
        [string]$buildCmd,
        [string]$startCmd,
        [string]$logFile
    )
    Write-Host "$name → starting..." -ForegroundColor Blue

    # Prepare log file
    if (Test-Path $logFile) { Clear-Content -Path $logFile -ErrorAction SilentlyContinue } else { New-Item -ItemType File -Path $logFile -Force | Out-Null }

    # Build command and redirect both stdout and stderr to the same log file
    if ($buildCmd -eq "") {
        $cmdCore = "cd '$workingDir'; $startCmd"
    } else {
        $cmdCore = "cd '$workingDir'; $buildCmd; if (`$LASTEXITCODE -eq 0) { $startCmd } else { Write-Error '$name build failed' }"
    }
    $cmd = "& { $cmdCore } *> '$logFile' 2>&1"

    Start-Process -FilePath powershell -WindowStyle Hidden -ArgumentList "-NoLogo","-NoProfile","-Command", $cmd | Out-Null
}

$dcLog = Join-Path $PWD "logs/data-collection.log"
$mcpLog = Join-Path $PWD "logs/mcp-server.log"
$pmacLog = Join-Path $PWD "logs/pmac-control.log"
$kbLog = Join-Path $PWD "logs/knowledge-base.log"
$anLog = Join-Path $PWD "logs/analytics.log"
$feLog = Join-Path $PWD "logs/web-frontend.log"

Start-BackgroundService -name "1. Data Collection" -workingDir (Join-Path $PWD "services/data-collection") -buildCmd "npm run build" -startCmd "chcp 65001; `$OutputEncoding = [System.Text.Encoding]::UTF8; `$env:LC_ALL = 'C.UTF-8'; npm start" -logFile $dcLog
Start-Sleep 1
Start-BackgroundService -name "2. MCP Server" -workingDir (Join-Path $PWD "services/mcp-server") -buildCmd "npm run build" -startCmd "chcp 65001; `$OutputEncoding = [System.Text.Encoding]::UTF8; `$env:LC_ALL = 'C.UTF-8'; npm start" -logFile $mcpLog
Start-Sleep 1
Start-BackgroundService -name "3. PMAC Control" -workingDir (Join-Path $PWD "services/pmac-control") -buildCmd "npm run build" -startCmd "chcp 65001; `$OutputEncoding = [System.Text.Encoding]::UTF8; `$env:LC_ALL = 'C.UTF-8'; npm start" -logFile $pmacLog
Start-Sleep 1
Start-BackgroundService -name "4. Knowledge Base" -workingDir (Join-Path $PWD "services/knowledge-base") -buildCmd "npm run build" -startCmd "chcp 65001; `$OutputEncoding = [System.Text.Encoding]::UTF8; `$env:NODE_OPTIONS = '--max-old-space-size=4096'; `$env:LC_ALL = 'C.UTF-8'; npm start" -logFile $kbLog
Start-Sleep 1
Start-BackgroundService -name "5. Analytics" -workingDir (Join-Path $PWD "services/analytics") -buildCmd "" -startCmd "$Env:PYTHONIOENCODING='utf-8'; python -X utf8 simple_analytics_service.py" -logFile $anLog
Start-Sleep 1
Start-BackgroundService -name "6. Web Frontend" -workingDir (Join-Path $PWD "packages/web-frontend") -buildCmd "" -startCmd "chcp 65001; `$OutputEncoding = [System.Text.Encoding]::UTF8; `$env:NODE_ENV = 'development'; `$env:LC_ALL = 'C.UTF-8'; npm run dev" -logFile $feLog
Start-Sleep 2

# Wait for all services to start
Write-Host "`nWaiting for all services to start..." -ForegroundColor Yellow

 

$services = @(
    @{Name="Data Collection"; Port=3002; Log=(Join-Path $PWD "logs/data-collection.log"); Health="http://localhost:3002/health"},
    @{Name="MCP Server"; Port=3004; Log=(Join-Path $PWD "logs/mcp-server.log"); Health="http://localhost:3004/health"},
    @{Name="PMAC Control"; Port=3001; Log=(Join-Path $PWD "logs/pmac-control.log"); Health="http://localhost:3001/health"},
    @{Name="Knowledge Base"; Port=3005; Log=(Join-Path $PWD "logs/knowledge-base.log"); Health="http://localhost:3005/health"},
    @{Name="Analytics"; Port=3003; Log=(Join-Path $PWD "logs/analytics.log"); Health="http://localhost:3003/health"},
    @{Name="Web Frontend"; Port=3000; Log=(Join-Path $PWD "logs/web-frontend.log"); Health=$null}
)

$allStarted = $true
foreach ($service in $services) {
    $timeout = if ($service.Name -eq "Knowledge Base") { 60 } else { 45 }
    if (-not (Wait-ForService $service.Name $service.Port $timeout $service.Log $service.Health)) {
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

# Live combined logs in this window (Ctrl+C to stop)
Write-Host "`n==================== LIVE LOGS ====================" -ForegroundColor Cyan
Write-Host "Following logs: `n - $dcLog`n - $mcpLog`n - $pmacLog`n - $kbLog`n - $anLog`n - $feLog" -ForegroundColor Gray
Write-Host "====================================================" -ForegroundColor Cyan

Get-Content -Path @($dcLog,$mcpLog,$pmacLog,$kbLog,$anLog,$feLog) -Tail 50 -Wait -Encoding UTF8
