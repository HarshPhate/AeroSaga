
import "./App.css";

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

function DroneCard({ drone }) {
  const statusClass = drone.status
    .toLowerCase()
    .replace(" ", "-");

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

      <div className="location">
        <span>Location</span>
        <strong>{drone.location}</strong>
      </div>
    </article>
  );
}

function App() {
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

        <div className="map-placeholder">
          <div className="map-symbol">◎</div>
          <h3>3D Globe Coming Soon</h3>
          <p>
            Our CesiumJS globe and animated drone markers
            will be implemented in the upcoming days.
          </p>
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
            <DroneCard key={drone.id} drone={drone} />
          ))}
        </div>
      </section>

      
    </main>
  );
}

export default App;
