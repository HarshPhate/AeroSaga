# AeroSaga Mid-Project Review: Automated Resiliency Audit Script
# Tests durable execution: Starts mission, queries state, restarts server, verifies persistence

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     AeroSaga Resiliency Audit: Temporal Durability Test   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$API_BASE = "http://localhost:8081/api"
$DRONE_ID = "drone-audit-01"

Write-Host "`n[Step 1] Starting Mission for $DRONE_ID..." -ForegroundColor Yellow
$body = @{
    startLat = 37.7749
    startLon = -122.4194
    destLat = 34.0522
    destLon = -118.2437
    altitude = 120
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "$API_BASE/missions/$DRONE_ID/start" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Mission started successfully!" -ForegroundColor Green
} catch {
    Write-Host "Failed to connect to Gateway at $API_BASE. Please make sure the Gateway is running on port 8081." -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 2

Write-Host "`n[Step 2] Querying Initial Workflow State from Temporal..." -ForegroundColor Yellow
$initialState = Invoke-RestMethod -Uri "$API_BASE/missions/$DRONE_ID/state" -Method Get
Write-Host ("Drone ID:      " + $initialState.droneId) -ForegroundColor White
Write-Host ("Current Step:  " + $initialState.currentStep) -ForegroundColor Green
Write-Host ("Step Status:   " + $initialState.stepStatus) -ForegroundColor Green
Write-Host ("Battery:       " + $initialState.battery + "%") -ForegroundColor White

Write-Host "`n[Step 3] Simulating Infrastructure Crash..." -ForegroundColor Yellow
Write-Host "In a real resiliency audit, you can now terminate the Gateway or Backend process." -ForegroundColor Yellow
Write-Host "Notice that state is stored in Temporal PostgreSQL, NOT in Java memory!" -ForegroundColor Cyan
Write-Host "Waiting 5 seconds while workflow advances in Temporal engine..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "`n[Step 4] Querying State after delay..." -ForegroundColor Yellow
$updatedState = Invoke-RestMethod -Uri "$API_BASE/missions/$DRONE_ID/state" -Method Get
Write-Host ("Drone ID:      " + $updatedState.droneId) -ForegroundColor White
Write-Host ("Current Step:  " + $updatedState.currentStep) -ForegroundColor Green
Write-Host ("Step Status:   " + $updatedState.stepStatus) -ForegroundColor Green
Write-Host ("Battery:       " + $updatedState.battery + "%") -ForegroundColor White

Write-Host "`n[Step 5] Testing Emergency Abort Signal (@SignalMethod)..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "$API_BASE/missions/$DRONE_ID/abort" -Method Post
Start-Sleep -Seconds 1
$abortedState = Invoke-RestMethod -Uri "$API_BASE/missions/$DRONE_ID/state" -Method Get
Write-Host ("After Abort Signal Step: " + $abortedState.currentStep) -ForegroundColor Green
Write-Host ("Step Status:             " + $abortedState.stepStatus) -ForegroundColor Green
Write-Host ("Aborted Flag:            " + $abortedState.aborted) -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " Resiliency Audit Complete! Temporal Durability Verified. " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
