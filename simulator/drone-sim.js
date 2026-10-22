const WebSocket = require('ws');

const WS_URL = process.env.WS_URL || 'ws://localhost:8081/ws';
const API_BASE = process.env.API_BASE || 'http://localhost:8081/api';
const DRONE_COUNT = parseInt(process.env.DRONE_COUNT || '50');
const PING_INTERVAL_MS = parseInt(process.env.PING_INTERVAL_MS || '1000');
const STORM_PROBABILITY = parseFloat(process.env.STORM_PROBABILITY || '0.02');
const STORM_DURATION_MS = parseInt(process.env.STORM_DURATION_MS || '120000');

const drones = {};
const stormDrones = new Set();
let stompConnected = false;

function randomLat(base) { return base + (Math.random() - 0.5) * 0.05; }
function randomLon(base) { return base + (Math.random() - 0.5) * 0.05; }
function randomHeading() { return Math.random() * 360; }

function createDrone(id) {
  return {
    id,
    lat: randomLat(37.7749),
    lon: randomLon(-122.4194),
    alt: 100 + Math.random() * 100,
    battery: 100,
    heading: randomHeading(),
    offline: false,
  };
}

function initDrones() {
  for (let i = 0; i < DRONE_COUNT; i++) {
    const id = `drone-${i}`;
    drones[id] = createDrone(id);
  }
}

function updateDronePosition(drone) {
  const speed = 0.0001;
  drone.lat += Math.sin(drone.heading * Math.PI / 180) * speed;
  drone.lon += Math.cos(drone.heading * Math.PI / 180) * speed;
  drone.heading += (Math.random() - 0.5) * 10;
  drone.battery = Math.max(0, drone.battery - 0.05);
  drone.alt = 100 + Math.sin(Date.now() / 5000) * 10;
}

// Send via HTTP REST fallback (guaranteed reliable)
async function sendTelemetryHttp(drone) {
  try {
    await fetch(`${API_BASE}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        droneId: drone.id,
        lat: drone.lat,
        lon: drone.lon,
        alt: drone.alt,
        battery: drone.battery,
        heading: drone.heading,
        ts: Date.now(),
      }),
    });
  } catch (e) {
    // ignore when gateway is restarting
  }
}

// Send via STOMP Frame over WebSocket
function sendTelemetryStomp(ws, drone) {
  const payload = JSON.stringify({
    droneId: drone.id,
    lat: drone.lat,
    lon: drone.lon,
    alt: drone.alt,
    battery: drone.battery,
    heading: drone.heading,
    ts: Date.now(),
  });

  const stompFrame = `SEND\ndestination:/app/drone/telemetry\ncontent-type:application/json\n\n${payload}\0`;
  try {
    ws.send(stompFrame);
  } catch (err) {
    sendTelemetryHttp(drone);
  }
}

async function markOffline(droneId) {
  try {
    const res = await fetch(`${API_BASE}/missions/${droneId}/offline`, { method: 'POST' });
    if (!res.ok) console.warn(`[STORM] Failed to mark ${droneId} offline: ${res.status}`);
  } catch (e) {
    console.warn(`[STORM] Error marking ${droneId} offline: ${e.message}`);
  }
}

async function markReconnect(droneId) {
  try {
    const res = await fetch(`${API_BASE}/missions/${droneId}/reconnect`, { method: 'POST' });
    if (!res.ok) console.warn(`[STORM] Failed to reconnect ${droneId}: ${res.status}`);
  } catch (e) {
    console.warn(`[STORM] Error reconnecting ${droneId}: ${e.message}`);
  }
}

function goOffline(droneId) {
  const drone = drones[droneId];
  if (!drone || drone.offline) return;
  drone.offline = true;
  stormDrones.add(droneId);
  console.log(`[STORM] Drone ${droneId} went offline`);
  markOffline(droneId);

  setTimeout(async () => {
    drone.offline = false;
    stormDrones.delete(droneId);
    console.log(`[STORM] Drone ${droneId} reconnected`);
    await markReconnect(droneId);
  }, STORM_DURATION_MS);
}

function startStorm() {
  setInterval(() => {
    const onlineDrones = Object.values(drones).filter(d => !d.offline && !stormDrones.has(d.id));
    if (onlineDrones.length === 0) return;
    for (const drone of onlineDrones) {
      if (Math.random() < STORM_PROBABILITY) {
        goOffline(drone.id);
      }
    }
  }, 5000);
}

function connectWebSocket() {
  try {
    const ws = new WebSocket(WS_URL);

    ws.on('open', () => {
      console.log('Simulator: WebSocket connected, sending STOMP CONNECT...');
      const connectFrame = 'CONNECT\naccept-version:1.2,1.1,1.0\nheart-beat:10000,10000\n\n\0';
      ws.send(connectFrame);
    });

    ws.on('message', (data) => {
      const msg = data.toString();
      if (msg.startsWith('CONNECTED')) {
        stompConnected = true;
        console.log('Simulator: STOMP handshake established with Gateway!');
      }
    });

    ws.on('close', () => {
      stompConnected = false;
      console.log('Simulator: WebSocket closed. Reconnecting in 3s...');
      setTimeout(connectWebSocket, 3000);
    });

    ws.on('error', (err) => {
      stompConnected = false;
    });

    return ws;
  } catch (err) {
    setTimeout(connectWebSocket, 3000);
    return null;
  }
}

function main() {
  initDrones();
  console.log(`Simulator: ${DRONE_COUNT} drones initialized`);

  let ws = connectWebSocket();
  startStorm();

  // Telemetry broadcast loop
  setInterval(() => {
    for (const drone of Object.values(drones)) {
      if (!drone.offline) {
        updateDronePosition(drone);
        if (ws && ws.readyState === WebSocket.OPEN && stompConnected) {
          sendTelemetryStomp(ws, drone);
        } else {
          sendTelemetryHttp(drone);
        }
      }
    }
  }, PING_INTERVAL_MS);
}

main();

process.on('SIGINT', () => {
  console.log('\nSimulator shutting down...');
  process.exit(0);
});
 // Storm simulation parameters
 // Clean process shutdown
