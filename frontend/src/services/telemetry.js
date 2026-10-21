import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = 'http://localhost:8081/ws';

export class TelemetryService {
  constructor(onTelemetry, onStatusChange, onConnectionChange) {
    this.onTelemetry = onTelemetry;
    this.onStatusChange = onStatusChange;
    this.onConnectionChange = onConnectionChange;
    this.client = null;
    this.connected = false;
  }

  connect() {
    this.client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: {},
      debug: () => {},
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = () => {
      this.connected = true;
      if (this.onConnectionChange) this.onConnectionChange(true);

      // Subscribe to broadcast telemetry topic
      this.client.subscribe('/topic/telemetry', (msg) => {
        try {
          const data = JSON.parse(msg.body);
          if (this.onTelemetry) this.onTelemetry(data);
        } catch (e) {
          console.error('Error parsing telemetry JSON:', e);
        }
      });

      // Subscribe to drone status topics
      this.client.subscribe('/topic/drone-offline', (msg) => {
        try {
          const data = JSON.parse(msg.body);
          if (this.onStatusChange) this.onStatusChange(data.droneId, 'offline');
        } catch (e) {
          console.error(e);
        }
      });

      this.client.subscribe('/topic/drone-reconnect', (msg) => {
        try {
          const data = JSON.parse(msg.body);
          if (this.onStatusChange) this.onStatusChange(data.droneId, 'online');
        } catch (e) {
          console.error(e);
        }
      });
    };

    this.client.onDisconnect = () => {
      this.connected = false;
      if (this.onConnectionChange) this.onConnectionChange(false);
    };

    this.client.onStompError = (frame) => {
      console.warn('STOMP error', frame);
      this.connected = false;
      if (this.onConnectionChange) this.onConnectionChange(false);
    };

    this.client.activate();
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.connected = false;
    }
  }

  sendTelemetry(droneId, lat, lon, alt, battery, heading) {
    if (this.client && this.connected) {
      this.client.publish({
        destination: '/app/drone/telemetry',
        body: JSON.stringify({ droneId, lat, lon, alt, battery, heading, ts: Date.now() }),
      });
    }
  }

  reportOffline(droneId) {
    if (this.client && this.connected) {
      this.client.publish({
        destination: '/app/drone/offline',
        body: JSON.stringify({ droneId, ts: Date.now() }),
      });
    }
  }

  reportReconnect(droneId) {
    if (this.client && this.connected) {
      this.client.publish({
        destination: '/app/drone/reconnect',
        body: JSON.stringify({ droneId, ts: Date.now() }),
      });
    }
  }
}

export class ApiService {
  static async startMission(payload) {
    const res = await fetch('http://localhost:8081/api/missions/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.text();
  }

  static async startDroneMission(droneId, payload) {
    await fetch(`http://localhost:8081/api/missions/${droneId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  static async getDroneState(droneId) {
    const res = await fetch(`http://localhost:8081/api/missions/${droneId}/state`);
    if (!res.ok) throw new Error('State fetch failed');
    return res.json();
  }

  static async emergencyAbort(droneId) {
    await fetch(`http://localhost:8081/api/missions/${droneId}/abort`, { method: 'POST' });
  }

  static async reconnect(droneId) {
    await fetch(`http://localhost:8081/api/missions/${droneId}/reconnect`, { method: 'POST' });
  }
}
 // STOMP reconnect policy
