import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { TelemetryService, ApiService } from './services/telemetry';

const DRONE_COLOR_ONLINE = '#00d2ff';
const DRONE_COLOR_OFFLINE = '#ff4d4d';
const DRONE_COLOR_ABORTED = '#ffaa00';
const UPDATE_INTERVAL_MS = 250;

const STEP_ORDER = ['INIT', 'TAKEOFF', 'NAVIGATE', 'DROP_PACKAGE', 'RETURN_TO_BASE', 'MISSION_COMPLETE', 'ABORTED'];

const interpolate = (start, end, t) => start + (end - start) * t;

const App = () => {
  const viewerRef = useRef(null);
  const containerRef = useRef(null);
  const entitiesRef = useRef(new Map());
  const lastPositionsRef = useRef(new Map());
  const telemetryServiceRef = useRef(null);

  const [drones, setDrones] = useState({});
  const [selectedDroneId, setSelectedDroneId] = useState(null);
  const [fleetId, setFleetId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Initialize Cesium Globe
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    try {
      const viewer = new Cesium.Viewer(containerRef.current, {
        timeline: false,
        animation: false,
        scene3DOnly: true,
        infoBox: false,
        selectionIndicator: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        navigationHelpButton: false,
      });

      // Fly to San Francisco drone area
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-122.4194, 37.7749, 15000.0),
        duration: 2.0,
      });

      viewerRef.current = viewer;
    } catch (e) {
      console.error('Cesium viewer initialization error:', e);
    }

    // Connect WebSocket
    const service = new TelemetryService(
      (data) => {
        if (!data || !data.droneId) return;
        setDrones((prev) => ({
          ...prev,
          [data.droneId]: {
            ...prev[data.droneId],
            id: data.droneId,
            lat: data.lat,
            lon: data.lon,
            alt: data.alt || 120,
            battery: data.battery !== undefined ? data.battery : (prev[data.droneId]?.battery ?? 100),
            heading: data.heading || 0,
            lastUpdate: data.ts || Date.now(),
          },
        }));
      },
      (droneId, status) => {
        setDrones((prev) => {
          const d = prev[droneId];
          if (!d) return prev;
          return { ...prev, [droneId]: { ...d, offline: status === 'offline' } };
        });
      },
      (connected) => setIsConnected(connected)
    );

    service.connect();
    telemetryServiceRef.current = service;

    return () => {
      service.disconnect();
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Poll Temporal state for the selected drone
  useEffect(() => {
    if (!selectedDroneId) return;

    const fetchState = async () => {
      try {
        const state = await ApiService.getDroneState(selectedDroneId);
        if (state) {
          setDrones((prev) => {
            const current = prev[selectedDroneId] || {};
            return {
              ...prev,
              [selectedDroneId]: {
                ...current,
                id: selectedDroneId,
                currentStep: state.currentStep || current.currentStep || 'INIT',
                stepStatus: state.stepStatus || current.stepStatus || 'PENDING',
                battery: state.battery !== undefined ? state.battery : current.battery,
                offline: state.offline !== undefined ? state.offline : current.offline,
                aborted: state.aborted !== undefined ? state.aborted : current.aborted,
              },
            };
          });
        }
      } catch (err) {
        // Drone workflow might not have started yet
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 1500);
    return () => clearInterval(interval);
  }, [selectedDroneId]);

  // Start Fleet Mission (50 drones)
  const startFleet = useCallback(async () => {
    setIsStarting(true);
    try {
      const generatedFleetId = await ApiService.startMission({
        droneCount: 50,
        startLat: 37.7749,
        startLon: -122.4194,
        destLat: 34.0522,
        destLon: -118.2437,
        altitude: 120,
      });
      setFleetId(generatedFleetId || 'fleet-active');

      // Initialize local entries for all 50 drones
      setDrones((prev) => {
        const updated = { ...prev };
        for (let i = 0; i < 50; i++) {
          const id = `drone-${i}`;
          if (!updated[id]) {
            updated[id] = {
              id,
              lat: 37.7749 + (Math.random() - 0.5) * 0.04,
              lon: -122.4194 + (Math.random() - 0.5) * 0.04,
              alt: 100 + Math.random() * 50,
              battery: 100,
              heading: Math.random() * 360,
              currentStep: 'TAKEOFF',
              stepStatus: 'ACTIVE',
              offline: false,
              aborted: false,
            };
          }
        }
        return updated;
      });
    } catch (err) {
      console.error('Failed to start fleet:', err);
    } finally {
      setIsStarting(false);
    }
  }, []);

  // Emergency Abort Signal
  const abortDrone = useCallback(async (droneId) => {
    try {
      await ApiService.emergencyAbort(droneId);
      setDrones((prev) => {
        const d = prev[droneId];
        if (!d) return prev;
        return { ...prev, [droneId]: { ...d, aborted: true, currentStep: 'ABORTED', stepStatus: 'COMPENSATED' } };
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Reconnect Signal
  const reconnectDrone = useCallback(async (droneId) => {
    try {
      await ApiService.reconnect(droneId);
      setDrones((prev) => {
        const d = prev[droneId];
        if (!d) return prev;
        return { ...prev, [droneId]: { ...d, offline: false } };
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Cesium Entity Animation Loop
  useEffect(() => {
    if (!viewerRef.current) return;

    const interval = setInterval(() => {
      const viewer = viewerRef.current;
      if (!viewer || viewer.isDestroyed()) return;

      const entities = viewer.entities;
      Object.values(drones).forEach((drone) => {
        if (!drone.lat || !drone.lon) return;

        const prev = lastPositionsRef.current.get(drone.id);
        const target = { lat: drone.lat, lon: drone.lon, alt: drone.alt || 120 };
        let pos = target;

        if (prev) {
          const t = Math.min(1, (Date.now() - (prev.ts || 0)) / 400);
          pos = {
            lat: interpolate(prev.lat, target.lat, t),
            lon: interpolate(prev.lon, target.lon, t),
            alt: interpolate(prev.alt, target.alt, t),
          };
        }
        lastPositionsRef.current.set(drone.id, { ...target, ts: Date.now() });

        const cartesian = Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt);
        const colorCss = drone.offline ? DRONE_COLOR_OFFLINE : drone.aborted ? DRONE_COLOR_ABORTED : DRONE_COLOR_ONLINE;
        const cesiumColor = Cesium.Color.fromCssColorString(colorCss);

        let entity = entitiesRef.current.get(drone.id);
        if (!entity) {
          entity = entities.add({
            id: drone.id,
            position: cartesian,
            point: {
              pixelSize: 10,
              color: cesiumColor,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
            },
            label: {
              text: `${drone.id}\n${drone.currentStep || 'INIT'}`,
              font: '10pt sans-serif',
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 1,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -20),
            },
          });
          entitiesRef.current.set(drone.id, entity);
        } else {
          entity.position = cartesian;
          if (entity.point) {
            entity.point.color = cesiumColor;
          }
          if (entity.label) {
            entity.label.text = `${drone.id} (${drone.battery?.toFixed(0)}%)\n${drone.currentStep || 'INIT'}`;
          }
        }
      });
    }, UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [drones]);

  const getStepIndex = (step) => STEP_ORDER.indexOf(step);
  const selectedDrone = selectedDroneId ? drones[selectedDroneId] : null;

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', position: 'relative', overflow: 'hidden' }}>
      {/* 3D Earth Container */}
      <div ref={containerRef} style={{ flex: 1, width: '100%', height: '100%' }} />

      {/* Mission Control Overlay Panel */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 20,
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(8px)',
          padding: 20,
          borderRadius: 10,
          color: '#fff',
          minWidth: 320,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h2 style={{ margin: '0 0 6px 0', color: '#00d2ff', fontSize: '1.4rem' }}>AeroSaga</h2>
        <p style={{ fontSize: '0.8rem', opacity: 0.75, margin: '0 0 16px 0' }}>
          Temporal.io Autonomous Drone Mission Control
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            onClick={startFleet}
            disabled={isStarting || !!fleetId}
            style={{
              flex: 1,
              padding: '10px 14px',
              background: fleetId ? '#334155' : '#00d2ff',
              color: fleetId ? '#94a3b8' : '#0f172a',
              border: 'none',
              borderRadius: 6,
              cursor: fleetId ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              transition: '0.2s',
            }}
          >
            {isStarting ? 'Starting...' : fleetId ? 'Fleet Active' : 'Start Fleet (50 Drones)'}
          </button>
          <button
            onClick={() => setSelectedDroneId(null)}
            style={{
              padding: '10px 12px',
              background: '#1e293b',
              color: '#fff',
              border: '1px solid #475569',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>

        {/* Status Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: '0.85rem' }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: isConnected ? '#22c55e' : '#ef4444',
              display: 'inline-block',
              boxShadow: isConnected ? '0 0 8px #22c55e' : 'none',
            }}
          />
          <span>Telemetry Gateway: {isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>

        <div style={{ fontSize: '0.8rem', opacity: 0.85, marginBottom: 16, lineHeight: 1.5 }}>
          Fleet ID: <strong>{fleetId || 'None'}</strong>
          <br />
          Total Drones Tracked: <strong>{Object.keys(drones).length}</strong>
        </div>

        <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '12px 0' }} />

        {/* Drone Fleet List */}
        <h3 style={{ fontSize: '0.9rem', marginBottom: 10, color: '#38bdf8' }}>
          Fleet Roster ({Object.keys(drones).length})
        </h3>
        <div style={{ maxHeight: 260, overflowY: 'auto', fontSize: '0.8rem' }}>
          {Object.entries(drones).map(([id, d]) => {
            const isSel = id === selectedDroneId;
            return (
              <div
                key={id}
                onClick={() => setSelectedDroneId(id)}
                style={{
                  padding: '8px 10px',
                  background: isSel ? '#1e293b' : 'rgba(255,255,255,0.03)',
                  border: isSel ? '1px solid #00d2ff' : '1px solid transparent',
                  borderRadius: 6,
                  cursor: 'pointer',
                  marginBottom: 6,
                  transition: '0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontWeight: 'bold', color: '#00d2ff' }}>{id}</span>
                  <span
                    style={{
                      color: d.offline ? DRONE_COLOR_OFFLINE : d.aborted ? DRONE_COLOR_ABORTED : '#22c55e',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                    }}
                  >
                    {d.offline ? 'OFFLINE' : d.aborted ? 'ABORTED' : 'ONLINE'}
                  </span>
                </div>
                <div style={{ opacity: 0.75, fontSize: '0.75rem' }}>
                  {d.currentStep || 'TAKEOFF'} | {d.stepStatus || 'ACTIVE'} | Bat: {d.battery?.toFixed(0)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Mission DAG Panel for Selected Drone */}
      {selectedDrone && (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            right: 24,
            zIndex: 20,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: 20,
            borderRadius: 10,
            color: '#fff',
            width: 360,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h4 style={{ margin: 0, color: '#00d2ff', fontSize: '1.1rem' }}>{selectedDrone.id}</h4>
              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Temporal Saga DAG</span>
            </div>
            <span
              style={{
                padding: '3px 10px',
                background: selectedDrone.offline ? '#ef4444' : selectedDrone.aborted ? '#f59e0b' : '#22c55e',
                color: '#fff',
                borderRadius: 12,
                fontSize: '0.75rem',
                fontWeight: 'bold',
              }}
            >
              {selectedDrone.offline ? 'OFFLINE' : selectedDrone.aborted ? 'ABORTED' : 'ONLINE'}
            </span>
          </div>

          {/* DAG Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {['TAKEOFF', 'NAVIGATE', 'DROP_PACKAGE', 'RETURN_TO_BASE', 'MISSION_COMPLETE'].map((step) => {
              const currentStep = selectedDrone.currentStep || 'TAKEOFF';
              const isCurrent = step === currentStep;
              const isPast = getStepIndex(step) < getStepIndex(currentStep);
              const isCompensated = selectedDrone.aborted || selectedDrone.stepStatus === 'COMPENSATED';

              let status = 'PENDING';
              let color = '#64748b';

              if (isPast) {
                status = 'COMPLETED';
                color = '#22c55e';
              } else if (isCurrent) {
                status = selectedDrone.stepStatus || 'ACTIVE';
                color = isCompensated ? '#f59e0b' : '#00d2ff';
              }

              return (
                <div
                  key={step}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    background: isCurrent ? 'rgba(0, 210, 255, 0.12)' : 'rgba(255,255,255,0.03)',
                    borderRadius: 6,
                    borderLeft: `4px solid ${color}`,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: color,
                      boxShadow: isCurrent ? `0 0 8px ${color}` : 'none',
                    }}
                  />
                  <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: isCurrent ? 'bold' : 'normal' }}>
                    {step}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: color, fontWeight: 'bold' }}>{status}</span>
                </div>
              );
            })}
          </div>

          {/* Flight Telemetry Details */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginBottom: 16,
              fontSize: '0.8rem',
              background: 'rgba(0,0,0,0.25)',
              padding: 10,
              borderRadius: 6,
            }}
          >
            <div>
              <span style={{ opacity: 0.6 }}>Step:</span> <strong>{selectedDrone.currentStep || 'TAKEOFF'}</strong>
            </div>
            <div>
              <span style={{ opacity: 0.6 }}>Battery:</span> <strong>{selectedDrone.battery?.toFixed(0)}%</strong>
            </div>
            <div>
              <span style={{ opacity: 0.6 }}>Lat:</span> <strong>{selectedDrone.lat?.toFixed(4)}</strong>
            </div>
            <div>
              <span style={{ opacity: 0.6 }}>Lon:</span> <strong>{selectedDrone.lon?.toFixed(4)}</strong>
            </div>
          </div>

          {/* Interactive Control Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => abortDrone(selectedDrone.id)}
              disabled={selectedDrone.aborted}
              style={{
                flex: 1,
                padding: '8px',
                background: selectedDrone.aborted ? '#475569' : '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: selectedDrone.aborted ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '0.8rem',
              }}
            >
              Emergency Abort
            </button>
            {selectedDrone.offline && (
              <button
                onClick={() => reconnectDrone(selectedDrone.id)}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: '#00d2ff',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                }}
              >
                Signal Reconnect
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
 // Interpolation smoothing factor
