# AeroSaga - Autonomous Drone Mission Control System

A durable drone mission orchestration system built with Temporal.io, Spring Boot, and React + CesiumJS. Proves that Temporal solves the state-loss problem of stateless REST APIs for long-running, multi-step drone missions.

## Project Folder Structure

```
AeroSaga/
├── docker-compose.yml              # Temporal server + PostgreSQL + Temporal UI
├── README.md                       # This file
├── RESILIENCY_AUDIT.md             # Mid-project resiliency test procedures
├── backend/                        # Java Temporal Workflow Orchestrator (port 8080)
│   ├── pom.xml                     # Maven: Temporal SDK 1.25.0, Spring Boot 3.2
│   ├── src/main/resources/application.yml  # backend listens on port 8082 to avoid Temporal's port 8080
│   └── src/main/java/com/aerosaga/
│       ├── BackendApplication.java
│       ├── config/
│       │   └── WorkerConfig.java   # Registers workflows + activities on task queues
│       ├── activity/
│       │   ├── DroneMissionActivity.java     # Activity interface
│       │   └── DroneMissionActivityImpl.java # Activity implementations (takeoff, navigate, drop, return)
│       └── workflow/
│           ├── DroneMissionWorkflow.java         # Workflow interface (@SignalMethod, @QueryMethod)
│           ├── DroneMissionWorkflowImpl.java     # Takeoff→Navigate→Drop→Return, try/catch compensation, durable pause
│           ├── FleetMissionWorkflow.java         # Parent workflow interface (Promise.allOf child workflows)
│           └── FleetMissionWorkflowImpl.java     # Parent workflow: parallel child workflows + external signals
├── gateway/                        # Spring Boot Telemetry Gateway (port 8081)
│   ├── pom.xml
│   ├── src/main/resources/application.yml
│   └── src/main/java/com/aerosaga/
│       ├── GatewayApplication.java
│       ├── config/
│       │   └── WebSocketConfig.java    # STOMP over WebSocket config
│       ├── controller/
│       │   ├── MissionController.java      # REST: start/query/abort/reconnect
│       │   └── TelemetryWebSocketController.java # WebSocket telemetry ingestion
│       ├── service/
│       │   └── MissionService.java         # Temporal client: start/query/signal workflows
│       └── workflow/               # Copied workflow interfaces for client-side stubs
│           ├── DroneMissionWorkflow.java
│           └── FleetMissionWorkflow.java
├── frontend/                       # React 18 + CesiumJS 3D Dashboard (port 3000)
│   ├── package.json
│   ├── public/index.html
│   └── src/
│       ├── index.js
│       ├── App.js                  # Cesium globe, animated markers, DAG panel, controls
│       └── services/
│           └── telemetry.js        # STOMP WebSocket client + REST API service
└── simulator/                      # Mock Drone Simulator (Node.js)
    ├── package.json
    ├── drone-sim.js                # 50 drones, GPS pings, storm offline/reconnect
    └── README.md
```

## Architecture (4 Modules)

1. **Temporal Cluster (Docker)** - Temporal server, PostgreSQL, Temporal UI. Persists all workflow state durably.
2. **Workflow Orchestrator (Java Temporal SDK)** - Drone mission saga: Takeoff → Navigate → Drop Package → Return to Base. Compensation on failed drop. Parent Fleet workflow with `Promise.allOf` child workflows.
3. **Telemetry Gateway (Spring Boot + WebSockets)** - REST API to start/query/signal workflows. WebSocket endpoint for drone telemetry ingestion.
4. **3D Fleet Dashboard (React + CesiumJS)** - 3D globe with live animated drone markers, DAG side panel, mission controls.

## Required Temporal Features Implemented

| Feature | Implementation |
|---------|---------------|
| Workflow + Activity interfaces/implementations | `DroneMissionWorkflow` / `DroneMissionWorkflowImpl`, `DroneMissionActivity` / `DroneMissionActivityImpl` |
| Retry options and timeouts | `ActivityOptions` with 5-min start-to-close timeout, 3 retries, 1s initial interval |
| Parent fleet workflow + `Promise.allOf` | `FleetMissionWorkflowImpl` spawns child drone workflows in parallel, `Promise.allOf(...).get()` |
| `@QueryMethod` for live state | `queryState()` on both workflow interfaces |
| Saga/compensation pattern | try/catch around `dropPackage()`: on failure → `returnToBase()` with `stepStatus: "COMPENSATED"` |
| `@SignalMethod` for interruption | `signalEmergencyAbort()` and `signalReconnect()` on both workflows |
| Durable pause (`Workflow.await`) | `waitForOnline()` uses `Workflow.await(() -> reconnectReceived)` when drone is offline |
| Deterministic workflow code | No random/system time/direct I/O in workflow code; all side effects in Activities |

## Commands to Run

### Phase 1: Temporal Cluster + Backend + Frontend

```bash
# 1. Start Temporal cluster
cd D:\FirstProjext\AeroSaga
docker compose up -d

# Verify: Temporal UI at http://localhost:8088, gRPC at port 7233

# 2. Run Backend (port 8082; Temporal uses 8080 internally)
cd backend
mvn spring-boot:run

# 3. Run Gateway (port 8081)
cd ../gateway
mvn spring-boot:run

# 4. Run Frontend (port 3000)
cd ../frontend
npm install
npm start
# Open: http://localhost:3000
```

### Phase 2: Simulator

```bash
cd simulator
npm install
node drone-sim.js
```

### Full Fleet Mission

```bash
# Start a 50-drone fleet mission
curl -X POST http://localhost:8081/api/missions/start \
  -H "Content-Type: application/json" \
  -d '{"droneCount":50,"startLat":37.7749,"startLon":-122.4194,"destLat":34.0522,"destLon":-118.2437,"altitude":120}'
```

## Resiliency Audit

See `RESILIENCY_AUDIT.md` for the complete mid-project test plan including:
- Server kill/restart durability test
- Offline/reconnect durability test
- 50-marker rendering performance check
- Emergency Abort signal test
- Compensation (failed drop → return to base) test

## Design Decisions

### Determinism
Workflow code is fully deterministic. No `Math.random()`, `System.currentTimeMillis()`, or direct I/O inside `@WorkflowMethod` implementations. All side effects (sleep, logging, external calls) live in Activities. `Workflow.currentTimeMillis()` is used instead of system time for workflow-internal timestamps.

### Idempotent Activities
Activities are designed to be idempotent. `takeoff()`, `navigateTo()`, `dropPackage()`, and `returnToBase()` perform simulated work (sleep + log) and can be safely retried after a failure without corrupting state.

### Retry / Timeout Choices
- **Start-to-close timeout:** 5 minutes per activity
- **Retry policy:** 3 maximum attempts, 1-second initial interval, exponential backoff
- These values balance resilience against transient failures with reasonable fail-fast behavior

### Offline / Reconnect Flow
1. Before each activity step, `waitForOnline()` checks the `offline` flag
2. If offline, workflow sets `stepStatus: "PAUSED"` and calls `Workflow.await(() -> reconnectReceived)`, suspending durably
3. When the drone reconnects, `signalReconnect()` sets `reconnectReceived = true`, unblocking the await
4. Workflow resumes exactly where it left off, executing the next activity

### Temporal Feature Usage
- **Child workflows:** `FleetMissionWorkflow` spawns 50 `DroneMissionWorkflow` child workflows via `Workflow.newChildWorkflowStub`
- **Promise.allOf:** `Promise.allOf(childPromises.toArray(new Promise[0])).get()` waits for all drone missions
- **External signals:** `Workflow.newExternalWorkflowStub` + `WorkflowStub.signal()` for cross-workflow signaling
- **Queries:** `@QueryMethod` enables real-time state reads without blocking workflow execution

## Known Limitations and Next Steps

### Limitations
1. **Backend and Gateway run as separate Spring Boot apps** - The backend hosts Temporal Workers; the gateway hosts the Temporal Client. In production, these could be combined or the gateway could be a standalone client.
2. **Workflow IDs use drone IDs directly** - `drone-mission-{droneId}` means reusing a drone ID after completion would conflict. Production should use UUID-based workflow IDs.
3. **FleetMissionWorkflowImpl.queryState() returns stub data** - Does not query individual child workflows; real implementation would use `Workflow.getExternalWorkflowStub` for each child.
4. **In-memory workflow state in impl classes** - The `DroneMissionWorkflowImpl` stores state in volatile fields. Temporal persists this durably via event sourcing, so it survives restarts, but the fields are only reconstructed from event history on replay.
5. **Frontend drone positions are simulated locally** - The frontend generates drone positions rather than reading from Temporal state. Real integration would query Temporal for drone positions.
6. **No authentication/authorization** - REST and WebSocket endpoints are open. Production needs JWT/OAuth2.
7. **CesiumJS drone image uses placeholder** - `./drone.png` is referenced but not provided; markers render as Cesium defaults if image is missing.
8. **WebSocket uses SockJS fallback** - For production, use native WebSocket without SockJS polyfill.

### Next Steps
1. **Multi-module Maven build** - Add a parent POM and shared module for workflow interfaces instead of copying files
2. **Production hardening** - Add authentication, TLS, rate limiting, circuit breakers
3. **Real drone integration** - Replace mock activities with actual drone SDK commands (DJI, PX4, etc.)
4. **Cesium Primitive batching** - Replace Entity-based markers with Primitive collections for 100+ drone scale
5. **Workflow versioning** - Add Temporal workflow versioning for safe deployments
6. **Cron schedules** - Schedule recurring fleet missions with Temporal Cron
7. **Distributed tracing** - Add OpenTelemetry tracing across workflow boundaries
8. **Database persistence for gateway** - Store mission history, drone registry, audit logs

## License

Internal project - AeroSaga Drone Mission Control