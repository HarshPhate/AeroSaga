# Resiliency Audit: Mid-Project Test Plan

## Test 1: Server Kill/Restart Durability Test

### Objective
Verify that a Temporal workflow survives a Spring Boot gateway/server crash and resumes exactly where it left off after restart.

### Prerequisites
1. Temporal cluster running: `docker compose up -d` (from `D:\FirstProjext\AeroSaga`)
2. Backend running: `mvn spring-boot:run` (from `backend/`)
3. Gateway running: `mvn spring-boot:run` (from `gateway/`)
4. Frontend running: `npm start` (from `frontend/`)

### Test Script

```bash
#!/bin/bash
# Run from D:\FirstProjext\AeroSaga

echo "=== Step 1: Start a single drone mission ==="
curl -X POST http://localhost:8081/api/missions/drone-0/start \
  -H "Content-Type: application/json" \
  -d '{"startLat":37.7749,"startLon":-122.4194,"destLat":34.0522,"destLon":-118.2437,"altitude":120}'

echo ""
echo "=== Step 2: Check initial state (should be TAKEOFF/NAVIGATE) ==="
curl http://localhost:8081/api/missions/drone-0/state

echo ""
echo "=== Step 3: Kill the gateway server ==="
# Find and kill the Java process running the gateway
# On Windows:
Get-Process java | Where-Object { $_.MainWindowTitle -match "gateway" } | Stop-Process -Force
# Or find by port:
# netstat -ano | findstr :8081
# taskkill /PID <PID> /F

echo ""
echo "=== Step 4: Verify gateway is down ==="
curl -s http://localhost:8081/api/missions/drone-0/state || echo "Gateway is down (expected)"

echo ""
echo "=== Step 5: Wait 30 seconds (workflow continues in Temporal) ==="
sleep 30

echo ""
echo "=== Step 6: Restart the gateway ==="
cd gateway && mvn spring-boot:run &
cd ..

echo ""
echo "=== Step 7: Wait for startup ==="
sleep 15

echo ""
echo "=== Step 8: Query state after restart ==="
curl http://localhost:8081/api/missions/drone-0/state

echo ""
echo "=== Step 9: Verify workflow resumed ==="
# The state should show the workflow continued from where it was
# before the kill, not restarted from TAKEOFF
```

### Expected Results

| Step | Observation |
|------|-------------|
| Step 2 | State shows `currentStep: "TAKEOFF"` or `"NAVIGATE"`, `stepStatus: "ACTIVE"` |
| Step 4 | Connection refused / gateway unreachable |
| Step 8 | State shows `currentStep` further along than Step 2 (e.g. `"DROP_PACKAGE"` or `"RETURN_TO_BASE"`), NOT back at `"TAKEOFF"` |
| Step 9 | `lastUpdate` timestamp is newer than Step 2; workflow continued durably |

### Key Validation
- `currentStep` must NOT reset to `"TAKEOFF"` after restart
- `stepStatus` must reflect actual progress (`ACTIVE`, `COMPLETED`)
- `lastUpdate` must advance after restart
- Temporal UI (http://localhost:8088) shows the workflow as RUNNING throughout

---

## Test 2: Offline/Reconnect Durability Test

### Objective
Verify that when a drone goes offline, the workflow pauses durably and resumes when the drone reconnects.

### Test Script

```bash
#!/bin/bash
# Run from D:\FirstProjext\AeroSaga

echo "=== Step 1: Start drone mission ==="
curl -X POST http://localhost:8081/api/missions/drone-1/start \
  -H "Content-Type: application/json" \
  -d '{"startLat":37.7749,"startLon":-122.4194,"destLat":34.0522,"destLon":-118.2437,"altitude":120}'

echo ""
echo "=== Step 2: Check state (should be ACTIVE) ==="
curl http://localhost:8081/api/missions/drone-1/state

echo ""
echo "=== Step 3: Simulate drone going offline ==="
# Send offline signal via WebSocket or use the simulator
# The simulator marks drones as offline after storm events

echo ""
echo "=== Step 4: Query state (should show WAITING_FOR_RECONNECT / PAUSED) ==="
curl http://localhost:8081/api/missions/drone-1/state

echo ""
echo "=== Step 5: Simulate drone reconnect ==="
curl -X POST http://localhost:8081/api/missions/drone-1/reconnect

echo ""
echo "=== Step 6: Query state (should resume from paused step) ==="
curl http://localhost:8081/api/missions/drone-1/state
```

### Expected Results

| Step | Observation |
|------|-------------|
| Step 4 | `currentStep: "WAITING_FOR_RECONNECT"`, `stepStatus: "PAUSED"`, `offline: true` |
| Step 6 | `currentStep` advances past the paused step (e.g. `"NAVIGATE"`), `offline: false` |

---

## Test 3: Rendering Performance Check (50+ Markers)

### Objective
Verify the CesiumJS frontend maintains smooth rendering with 50+ moving drone markers.

### Test Procedure

1. Open http://localhost:3000 in Chrome/Edge
2. Open DevTools → Performance tab
3. Start the fleet mission (50 drones)
4. Run the simulator: `node drone-sim.js`
5. Record a 30-second performance profile
6. Check FPS stays above 30fps

### Expected Results
- FPS >= 30 with 50 moving markers
- Memory usage stable (no leaks from entity creation)
- Marker positions interpolate smoothly between pings

### If Performance Is Poor
- Reduce `UPDATE_INTERVAL_MS` in `frontend/src/App.js` (currently 200ms)
- Enable entity batching by reusing Cesium Entity objects (already implemented)
- Consider using `Primitive` batching instead of `Entity` for 100+ drones

---

## Test 4: Emergency Abort Signal Test

### Objective
Verify that the Emergency Abort signal interrupts the workflow and triggers compensation.

### Test Script

```bash
curl http://localhost:8081/api/missions/drone-2/state  # Check initial state
curl -X POST http://localhost:8081/api/missions/drone-2/abort
curl http://localhost:8081/api/missions/drone-2/state  # Should show ABORTED/COMPENSATED
```

### Expected Results
- Before abort: `currentStep` is one of `TAKEOFF`, `NAVIGATE`, `DROP_PACKAGE`, `RETURN_TO_BASE`
- After abort: `currentStep: "ABORTED"`, `stepStatus: "COMPENSATED"`, `aborted: true`

---

## Test 5: Compensation (Failed Drop -> Return to Base)

### Objective
Verify that when `dropPackage` fails, the workflow automatically runs `returnToBase`.

### Expected Results
- `currentStep: "DROP_PACKAGE"`, `stepStatus: "FAILED"`
- Then: `currentStep: "RETURN_TO_BASE"`, `stepStatus: "ACTIVE"`
- Finally: `currentStep: "MISSION_COMPLETE"`, `stepStatus: "COMPENSATED"`

<!-- Audit Verification Steps -->
