# Mock Drone Simulator

Simulates 50 delivery drones emitting GPS telemetry via WebSocket to the AeroSaga gateway.

## Prerequisites

- Node.js 18+
- Gateway running on `http://localhost:8081`

## Install

```bash
cd D:\FirstProjext\AeroSaga\simulator
npm install
```

## Run

```bash
# Basic run - 50 drones, 1s ping interval
node drone-sim.js

# With environment overrides
DRONE_COUNT=50 PING_INTERVAL_MS=1000 STORM_PROBABILITY=0.02 STORM_DURATION_MS=120000 node drone-sim.js
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| WS_URL | ws://localhost:8081/ws | Gateway WebSocket endpoint |
| DRONE_COUNT | 50 | Number of drones to simulate |
| PING_INTERVAL_MS | 1000 | GPS ping interval in milliseconds |
| STORM_PROBABILITY | 0.02 | Per-5s chance a drone goes offline |
| STORM_DURATION_MS | 120000 | How long a drone stays offline (ms) |

## What it does

1. Creates 50 drones with random starting positions near San Francisco
2. Each drone emits GPS ping (lat, lon, alt, battery, heading) every second
3. Every 5 seconds, each online drone has a 2% chance of going offline (storm)
4. Offline drones reconnect after 2 minutes
5. Telemetry is sent as JSON over WebSocket to `/app/drone/telemetry`