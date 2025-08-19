# PMAC Assistant System - Check Services Status
# Author: PMAC Assistant Team
# Version: 1.0.0

Write-Host "Check PMAC Assistant System Status" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Services configuration
$services = @(
    @{Name="Web Frontend"; Port=3000; URL="http://localhost:3000"},
    @{Name="PMAC Control"; Port=3001; URL="http://localhost:3001"},
    @{Name="Data Collection"; Port=3002; URL="http://localhost:3002"},
    @{Name="Analytics"; Port=3003; URL="http://localhost:3003"},
    @{Name="MCP Server"; Port=3004; URL="http://localhost:3004"},
    @{Name="Knowledge Base"; Port=3005; URL="http://localhost:3005"}
)

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

# Function to test HTTP response
function Test-HTTPResponse {
    param($url)
    try {
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 5 -ErrorAction Stop
        return $response.StatusCode
    }
    catch {
        return $null
    }
}

# Check each service
$runningServices = 0
$totalServices = $services.Count

Write-Host "`nService Status:" -ForegroundColor Yellow

foreach ($service in $services) {
    $isPortOpen = Test-Port $service.Port
    
    if ($isPortOpen) {
        $httpStatus = Test-HTTPResponse $service.URL
        if ($httpStatus -eq 200) {
            Write-Host "OK $($service.Name) - PORT $($service.Port) - HTTP $httpStatus" -ForegroundColor Green
            $runningServices++
        } else {
            Write-Host "WARN $($service.Name) - PORT $($service.Port) - HTTP $httpStatus" -ForegroundColor Yellow
            $runningServices++
        }
    } else {
        Write-Host "FAIL $($service.Name) - PORT $($service.Port) - NOT RUNNING" -ForegroundColor Red
    }
}

# Show statistics
Write-Host "`nStatistics:" -ForegroundColor Cyan
Write-Host "   Total services: $totalServices" -ForegroundColor White
Write-Host "   Running: $runningServices" -ForegroundColor Green
Write-Host "   Stopped: $($totalServices - $runningServices)" -ForegroundColor Red

# Calculate percentage
$percentage = [math]::Round(($runningServices / $totalServices) * 100, 1)
Write-Host "   Running percentage: $percentage%" -ForegroundColor Cyan

# Recommendations
Write-Host "`nRecommendations:" -ForegroundColor Yellow

if ($runningServices -eq $totalServices) {
    Write-Host "   All services are running! System is working correctly." -ForegroundColor Green
} elseif ($runningServices -gt 0) {
    Write-Host "   Partially running. For full functionality start all services." -ForegroundColor Yellow
    Write-Host "   Use: .\start-all-services.ps1" -ForegroundColor Cyan
} else {
    Write-Host "   No services are running. System is not working." -ForegroundColor Red
    Write-Host "   Use: .\start-all-services.ps1" -ForegroundColor Cyan
}

# Show available URLs for running services
if ($runningServices -gt 0) {
    Write-Host "`nAvailable URLs:" -ForegroundColor Cyan
    foreach ($service in $services) {
        if (Test-Port $service.Port) {
            Write-Host "   $($service.Name): $($service.URL)" -ForegroundColor White
        }
    }
}

Write-Host "`nCheck completed!" -ForegroundColor Green
