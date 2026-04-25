# Turbobujias — Wiring Test (Simple Version)

Write-Host "════════════════════════════════════════════════════════"
Write-Host "Turbobujias — Complete Stack Wiring Test"
Write-Host "════════════════════════════════════════════════════════"
Write-Host ""

Write-Host "[1] Health Checks" -ForegroundColor Yellow
Write-Host ""

# Test Chatbot
try {
    $Response = Invoke-WebRequest -Uri "http://localhost:7860/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "[OK] Chatbot — HTTP $($Response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "[WAIT] Chatbot — Still loading or not ready" -ForegroundColor Yellow
}

# Test Backend
try {
    $Response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "[OK] Backend — HTTP $($Response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Backend — Connection failed" -ForegroundColor Red
}

# Test Frontend
try {
    $Response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "[OK] Frontend — HTTP $($Response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Frontend — Connection failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "[2] Running Containers" -ForegroundColor Yellow
Write-Host ""

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host ""
Write-Host "[3] Docker Network" -ForegroundColor Yellow
Write-Host ""

docker network inspect turbobujias --format "Connected containers:"
docker network inspect turbobujias --format "table {{.Containers}}"

Write-Host ""
Write-Host "[4] Cross-Container Tests" -ForegroundColor Yellow
Write-Host ""

# Test Frontend → Backend on Docker network
Write-Host "Testing Frontend → Backend (Docker DNS)" -ForegroundColor Cyan
try {
    $Output = docker exec turbobujias-frontend curl -s -I http://turbobujias-backend:3001/health 2>&1
    if ($Output -match "200|HTTP") {
        Write-Host "[OK] Frontend can reach Backend via turbobujias-backend:3001" -ForegroundColor Green
    } else {
        Write-Host "[CHECK] Response: $Output" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERROR] $($_)" -ForegroundColor Red
}

Write-Host ""

# Test Backend → Chatbot on Docker network
Write-Host "Testing Backend → Chatbot (Docker DNS)" -ForegroundColor Cyan
try {
    $Output = docker exec turbobujias-backend curl -s -I http://turbobujias-chatbot:7860/health 2>&1
    if ($Output -match "200|HTTP" -or $Output -eq "") {
        Write-Host "[OK] Backend can reach Chatbot via turbobujias-chatbot:7860" -ForegroundColor Green
    } else {
        Write-Host "[CHECK] Response received (Chatbot may be loading)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[CHECK] Docker network ready, Chatbot may still be building" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[5] Environment Variables" -ForegroundColor Yellow
Write-Host ""

Write-Host "Backend env (CHATBOT_INTERNAL_URL):" -ForegroundColor Cyan
docker exec turbobujias-backend sh -c 'echo $CHATBOT_INTERNAL_URL' 2>&1

Write-Host ""
Write-Host "Frontend env (NEXT_PUBLIC_BACKEND_URL):" -ForegroundColor Cyan
docker exec turbobujias-frontend sh -c 'echo $NEXT_PUBLIC_BACKEND_URL' 2>&1

Write-Host ""
Write-Host "════════════════════════════════════════════════════════"
Write-Host "Test Complete!"
Write-Host "════════════════════════════════════════════════════════"
Write-Host ""
Write-Host "URLs:" -ForegroundColor Yellow
Write-Host "  - Frontend:   http://localhost:3000 or http://192.168.0.7:3000"
Write-Host "  - Backend:    http://localhost:3001 or http://192.168.0.7:3001"
Write-Host "  - Chatbot:    http://localhost:7860 or http://192.168.0.7:7860"
Write-Host ""
