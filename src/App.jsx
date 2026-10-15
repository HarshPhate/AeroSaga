import { useEffect, useState } from "react";
import "./App.css";
import GlobeView from "./GlobeView";

const drones = [
  {
    id: "DRONE-01",
    status: "In Flight",
    battery: 82,
    location: "Vijayawada",
  },
  {
    id: "DRONE-02",
    status: "Ready",
    battery: 100,
    location: "Guntur",
  },
  {
    id: "DRONE-03",
    status: "Disconnected",
    battery: 46,
    location: "Tenali",
  },
];

function DroneCard({ drone, progress }) {
  const statusClass = drone.status.toLowerCase().replace(" ", "-");
  const isMovingDrone = drone.id === "DRONE-01";

  return (
    <article className="drone-card">
      <div className="drone-card-top">
        <div>
          <p className="eyebrow">DRONE ID</p>
          <h3>{drone.id}</h3>
        </div>

        <span className={`status ${statusClass}`}>
          {drone.status}
        </span>
      </div>

      <div className="battery-heading">
        <span>Battery</span>
        <strong>{drone.battery}%</strong>
      </div>

      <div className="battery-track">
        <div
          className="battery-fill"
          style={{ width: `${drone.battery}%` }}
        />
      </div>

      {isMovingDrone && (
        <div className="delivery-progress">
          <div className="battery-heading">
            <span>Delivery Progress</span>
            <strong>{progress}%</strong>
          </div>

          <div
            className="battery-track"
            role="progressbar"
            aria-label="Delivery progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="battery-fill delivery-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="location">
            <span>Vijayawada</span>
            <strong>Guntur</strong>
          </div>
        </div>
      )}

      <div className="location">
        <span>Location</span>
        <strong>
          {isMovingDrone && progress === 100
            ? "Guntur"
            : drone.location}
        </strong>
      </div>
    </article>
  );
}

function App() {
  const [progress, setProgress] = useState(0);

  // Move from 0% to 100%, then repeat the demonstration.
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((previous) =>
        previous >= 100 ? 0 : Math.min(previous + 1, 100)
      );
    }, 300);

    return () => clearInterval(timer);
  }, []);

  const inFlight = drones.filter(
    (drone) => drone.status === "In Flight"
  ).length;

  const disconnected = drones.filter(
    (drone) => drone.status === "Disconnected"
  ).length;

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">FLEET OPERATIONS</p>
          <h1>Drone Command Center</h1>
        </div>

        <span className="connection">
          <span className="connection-dot" />
          Simulation Mode
        </span>
      </header>

      <section className="welcome">
        <p className="eyebrow">DELIVERY MANAGEMENT</p>
        <h2>Monitor every mission.</h2>
        <p>
          Track your drone fleet, monitor battery levels,
          and visualize autonomous delivery missions.
        </p>
      </section>

      <section className="summary-grid">
        <div className="summary-card">
          <span>Total Drones</span>
          <strong>{drones.length}</strong>
        </div>

        <div className="summary-card">
          <span>In Flight</span>
          <strong>{inFlight}</strong>
        </div>

        <div className="summary-card">
          <span>Disconnected</span>
          <strong>{disconnected}</strong>
        </div>
      </section>

      <section className="map-panel">
        <p className="eyebrow">LIVE FLEET VIEW</p>
        <h2>Mission Map</h2>

        <div className="globe-container">
          <GlobeView progress={progress} />
        </div>
      </section>

      <section className="fleet-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FLEET OVERVIEW</p>
            <h2>Your Drones</h2>
          </div>

          <span>{drones.length} registered</span>
        </div>

        <div className="drone-grid">
          {drones.map((drone) => (
            <DroneCard
              key={drone.id}
              drone={drone}
              progress={progress}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;