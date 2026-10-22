# AeroSaga One-Click Launcher for Windows PowerShell
# Starts Backend, Gateway, Simulator, and Frontend in separate windows

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "       AeroSaga Mission Control Launcher     " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Check Docker
Write-Host "[1/5] Checking Docker Temporal Cluster..." -ForegroundColor Yellow
$dockerRunning = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Docker does not appear to be running. Please start Docker Desktop if not already started." -ForegroundColor Red
} else {
    Write-Host "Starting Docker containers (temporal, postgres, temporal-ui)..." -ForegroundColor Green
    docker compose up -d
}

# 2. Launch Backend (Port 8082)
Write-Host "[2/5] Starting Temporal Backend Worker (Port 8082)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; Write-Host '--- AEROSAGA BACKEND WORKER ---' -ForegroundColor Cyan; mvn spring-boot:run"

# 3. Launch Gateway (Port 8081)
Write-Host "[3/5] Starting Telemetry Gateway (Port 8081)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\gateway'; Write-Host '--- AEROSAGA TELEMETRY GATEWAY ---' -ForegroundColor Cyan; mvn spring-boot:run"

# Wait a brief moment for gateway & backend to initialize
Start-Sleep -Seconds 3

# 4. Launch Simulator
Write-Host "[4/5] Starting Drone Simulator (50 Drones)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\simulator'; Write-Host '--- AEROSAGA DRONE SIMULATOR ---' -ForegroundColor Cyan; node drone-sim.js"

# 5. Launch Frontend (Port 3000)
Write-Host "[5/5] Starting React Cesium 3D Dashboard (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; Write-Host '--- AEROSAGA 3D DASHBOARD ---' -ForegroundColor Cyan; npm start"

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host " All AeroSaga services launched successfully! " -ForegroundColor Green
Write-Host " - 3D Dashboard:   http://localhost:3000     " -ForegroundColor White
Write-Host " - Gateway API:    http://localhost:8081     " -ForegroundColor White
Write-Host " - Temporal UI:    http://localhost:8088     " -ForegroundColor White
Write-Host "=============================================" -ForegroundColor Green
 # Status output formatting
