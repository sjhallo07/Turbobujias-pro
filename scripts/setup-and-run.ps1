# Turbobujias - Complete Local Setup and Run (PowerShell)
# For Windows users

$ErrorActionPreference = "Stop"

Write-Host "========================================================"
Write-Host "Turbobujias Local Development Setup (Windows)"
Write-Host "========================================================"
Write-Host ""

# Step 1: Check Docker
Write-Host "[1/5] Checking Docker installation..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "[OK] Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker not found. Install from: https://www.docker.com/products/docker-desktop" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Setup .env
Write-Host "[2/5] Setting up .env file..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "[OK] Created .env from .env.example" -ForegroundColor Green
        Write-Host ""
        Write-Host "[IMPORTANT] Edit .env with your credentials:" -ForegroundColor Yellow
        Write-Host "  Required (choose ONE LLM provider):"
        Write-Host "    - GITHUB_TOKEN=your_github_pat"
        Write-Host "    - GEMINI_API_KEY=your_gemini_key"
        Write-Host "    - HF_TOKEN=your_huggingface_token"
        Write-Host ""
        Write-Host "  Optional but recommended:"
        Write-Host "    - SUPABASE_URL=your_supabase_url"
        Write-Host "    - SUPABASE_ANON_KEY=your_key"
        Write-Host ""
        
        # Prompt to edit
        $response = Read-Host "Open .env now in Notepad? (y/n)"
        if ($response -eq "y" -or $response -eq "Y") {
            notepad .env
        }
    } else {
        Write-Host "[ERROR] .env.example not found" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[OK] .env already exists" -ForegroundColor Green
}
Write-Host ""

# Step 3: Verify .env is ignored
Write-Host "[3/5] Verifying .env is git-ignored..." -ForegroundColor Yellow
$gitignoreContent = Get-Content .gitignore -Raw
if ($gitignoreContent -match "^\.env$") {
    Write-Host "[OK] .env is in .gitignore" -ForegroundColor Green
} else {
    Write-Host "[WARNING] .env not in .gitignore, adding..." -ForegroundColor Yellow
    Add-Content .gitignore ".env"
    Write-Host "[OK] Added .env to .gitignore" -ForegroundColor Green
}
Write-Host ""

# Step 4: Check .env has credentials
Write-Host "[4/5] Checking .env has LLM credentials..." -ForegroundColor Yellow
$envContent = Get-Content .env -Raw
if ($envContent -match "GITHUB_TOKEN\s*=" -or $envContent -match "GEMINI_API_KEY\s*=" -or $envContent -match "HF_TOKEN\s*=") {
    Write-Host "[OK] LLM credentials found in .env" -ForegroundColor Green
} else {
    Write-Host "[ERROR] No LLM credentials found in .env" -ForegroundColor Red
    Write-Host "   Edit .env and add at least one of:"
    Write-Host "   - GITHUB_TOKEN=..."
    Write-Host "   - GEMINI_API_KEY=..."
    Write-Host "   - HF_TOKEN=..."
    exit 1
}
Write-Host ""

# Step 5: Choose build type
Write-Host "[5/5] Building Docker image..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Build options:"
Write-Host "  1) Simple (faster, for development) - 5 min"
Write-Host "  2) Optimized (slower, for production) - 10+ min"
Write-Host "  3) Skip build (use existing image)"
Write-Host ""

$buildChoice = Read-Host "Choose [1-3]"

$image = ""
switch ($buildChoice) {
    "1" {
        $dockerfile = "Dockerfile.simple"
        $context = "turbobujias-ai"
        Write-Host "Building with $dockerfile..." -ForegroundColor Yellow
        docker build -t turbobujias-ai:dev -f "$context/$dockerfile" "$context"
        $image = "turbobujias-ai:dev"
    }
    "2" {
        $dockerfile = "Dockerfile"
        $context = "turbobujias-ai"
        Write-Host "Building with $dockerfile (this takes 10+ minutes)..." -ForegroundColor Yellow
        docker build -t turbobujias-ai:latest -f "$context/$dockerfile" "$context"
        $image = "turbobujias-ai:latest"
    }
    "3" {
        $image = "turbobujias-ai:latest"
        Write-Host "Skipping build, using existing image" -ForegroundColor Yellow
    }
    default {
        Write-Host "Invalid choice" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "[OK] Setup complete!" -ForegroundColor Green
Write-Host ""

# Step 6: Run
Write-Host "========================================================"
Write-Host "Starting Turbobujias Chatbot" -ForegroundColor Green
Write-Host "========================================================"
Write-Host ""
Write-Host "Web URL: http://localhost:7860"
Write-Host ""
Write-Host "Tips:"
Write-Host "  - Edit app.py and refresh browser for live changes"
Write-Host "  - Press Ctrl+C to stop"
Write-Host "  - Check logs in another terminal:"
Write-Host "    docker compose -f docker-compose.local.yml logs -f chatbot"
Write-Host ""

# Run with docker-compose
docker compose -f docker-compose.local.yml up

Write-Host ""
Write-Host "[OK] Container stopped" -ForegroundColor Green
