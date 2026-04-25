# Turbobujias — Local Testing Quick Start
# PowerShell version for Windows

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("up", "down", "logs", "restart", "test")]
    [string]$Command = "up"
)

# Configuration
$ComposeFile = "docker-compose.full-stack.yml"
$LocalIP = "192.168.0.7"
$Ports = @{
    "Frontend" = 3000
    "Chatbot" = 7860
}

# Colors
$Green = [ConsoleColor]::Green
$Yellow = [ConsoleColor]::Yellow
$Red = [ConsoleColor]::Red

function Show-Header {
    Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "Turbobujias Local Testing" -ForegroundColor Cyan
    Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
}

function Show-URLs {
    Write-Host "Available URLs:" -ForegroundColor Green
    Write-Host ""
    Write-Host "Localhost:" -ForegroundColor Yellow
    Write-Host "  - Chatbot:  http://localhost:7860" -ForegroundColor White
    Write-Host "  - Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "Local Network IP ($LocalIP):" -ForegroundColor Yellow
    Write-Host "  - Chatbot:  http://${LocalIP}:7860" -ForegroundColor White
    Write-Host "  - Frontend: http://${LocalIP}:3000" -ForegroundColor White
    Write-Host ""
}

function Start-Services {
    Show-Header
    Write-Host "[1/3] Checking Docker Desktop..." -ForegroundColor Yellow
    
    try {
        docker version | Out-Null
        Write-Host "[OK] Docker is running" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Docker Desktop not running. Please start it." -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "[2/3] Checking .env file..." -ForegroundColor Yellow
    
    if (-not (Test-Path ".env")) {
        Write-Host "[WARNING] .env not found. Please create it:" -ForegroundColor Yellow
        Write-Host "  cp .env.example .env" -ForegroundColor Gray
        Write-Host "  Edit .env and add GITHUB_TOKEN or GEMINI_API_KEY" -ForegroundColor Gray
        exit 1
    }
    
    Write-Host "[OK] .env found" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "[3/3] Starting services..." -ForegroundColor Yellow
    Write-Host ""
    
    docker compose -f $ComposeFile up
}

function Stop-Services {
    Show-Header
    Write-Host "Stopping services..." -ForegroundColor Yellow
    docker compose -f $ComposeFile down
    Write-Host "[OK] Services stopped" -ForegroundColor Green
}

function Show-Logs {
    Show-Header
    Write-Host "Showing live logs (Ctrl+C to exit)..." -ForegroundColor Yellow
    Write-Host ""
    docker compose -f $ComposeFile logs -f
}

function Restart-Services {
    Show-Header
    Write-Host "Restarting services..." -ForegroundColor Yellow
    docker compose -f $ComposeFile restart
    Write-Host "[OK] Services restarted" -ForegroundColor Green
    Write-Host ""
    Show-URLs
}

function Test-Services {
    Show-Header
    Write-Host "Testing services..." -ForegroundColor Yellow
    Write-Host ""
    
    $Tests = @(
        @{ Name = "Chatbot (Localhost)"; URL = "http://localhost:7860/health" },
        @{ Name = "Chatbot (Local IP)"; URL = "http://${LocalIP}:7860/health" },
        @{ Name = "Frontend (Localhost)"; URL = "http://localhost:3000" },
        @{ Name = "Frontend (Local IP)"; URL = "http://${LocalIP}:3000" }
    )
    
    foreach ($Test in $Tests) {
        try {
            $Response = Invoke-WebRequest -Uri $Test.URL -TimeoutSec 5 -ErrorAction Stop
            Write-Host "[OK] $($Test.Name) - HTTP $($Response.StatusCode)" -ForegroundColor Green
        } catch {
            Write-Host "[FAIL] $($Test.Name) - Connection refused" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Test Results:" -ForegroundColor Yellow
    Write-Host "  If all tests pass, services are ready for deployment!" -ForegroundColor White
}

# Execute command
switch ($Command) {
    "up" { Start-Services }
    "down" { Stop-Services }
    "logs" { Show-Logs }
    "restart" { Restart-Services }
    "test" { Test-Services }
    default { Start-Services }
}
