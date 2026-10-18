
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

function DroneCard({ drone, progress, missionStatus }) {
  const isMovingDrone = drone.id === "DRONE-01";

  const displayedStatus = isMovingDrone
    ? missionStatus === "completed"
      ? "Delivered"
      : missionStatus === "in-progress" ||
          missionStatus === "paused"
        ? "In Flight"
        : "Ready"
    : drone.status;

  const statusClass = displayedStatus
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
          {displayedStatus}
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
          {isMovingDrone
            ? progress === 100
              ? "Guntur"
              : missionStatus === "in-progress" ||
                  missionStatus === "paused"
                ? "En route to Guntur"
                : "Vijayawada"
            : drone.location}
        </strong>
      </div>
    </article>
  );
}

function MissionTimeline({ progress, missionStatus }) {
  const delivered = missionStatus === "completed";

  const steps = [
    {
      title: "Mission Created",
      description: "Delivery request registered.",
      complete: true,
    },
    {
      title: "Drone Dispatched",
      description: delivered || progress > 0
        ? "DRONE-01 has started its simulated mission."
        : "Waiting for mission start.",
      complete: delivered || progress > 0,
      active: missionStatus === "in-progress" && progress === 0,
    },
    {
      title: "Delivery in Progress",
      description: delivered
        ? "Drone has reached its destination."
        : missionStatus === "paused"
          ? `Mission paused at ${progress}%.`
          : missionStatus === "in-progress"
            ? `Delivery is ${progress}% complete.`
            : "Waiting for the mission to start.",
      complete: delivered,
      active: missionStatus === "in-progress",
    },
    {
      title: "Destination Reached",
      description: delivered
        ? "Delivery successfully completed."
        : "Waiting for the drone to reach Guntur.",
      complete: delivered,
    },
  ];

  return (
    <section className="timeline-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">MISSION ACTIVITY</p>
          <h2>Delivery Timeline</h2>
        </div>

        <span>
          {missionStatus === "completed"
            ? "Completed"
            : missionStatus === "paused"
              ? "Paused"
              : missionStatus === "in-progress"
                ? "Mission Active"
                : "Ready to Start"}
        </span>
      </div>

      <div className="mission-timeline">
        {steps.map((step, index) => (
          <div
            className={`timeline-step ${
              step.complete ? "completed" : ""
            } ${step.active ? "active" : ""}`}
            key={step.title}
          >
            <div className="timeline-marker">
              {step.complete ? "✓" : index + 1}
            </div>

            <div className="timeline-content">
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function App() {
  const [progress, setProgress] = useState(0);
  const [missionStatus, setMissionStatus] = useState("ready");

  // Advance progress only while the mission is running.
  useEffect(() => {
    if (missionStatus !== "in-progress") return;

    const timer = setInterval(() => {
      setProgress((previous) => {
        const next = Math.min(previous + 1, 100);

        if (next === 100) {
          setMissionStatus("completed");
        }

        return next;
      });
    }, 300);

    return () => clearInterval(timer);
  }, [missionStatus]);

  const startMission = () => {
    setProgress(0);
    setMissionStatus("in-progress");
  };

  const pauseMission = () => {
    setMissionStatus("paused");
  };

  const resumeMission = () => {
    setMissionStatus("in-progress");
  };

  const completeMission = () => {
    setProgress(100);
    setMissionStatus("completed");
  };

  const inFlight =
    missionStatus === "in-progress" ||
    missionStatus === "paused"
      ? 1
      : 0;

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

      <section className="timeline-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MISSION CONTROL</p>
            <h2>Delivery Controls</h2>
          </div>

          <span>
            {missionStatus.replace("-", " ").toUpperCase()}
          </span>
        </div>

        <div className="mission-controls">
          {missionStatus === "ready" && (
            <button onClick={startMission}>
              Start Mission
            </button>
          )}

          {missionStatus === "in-progress" && (
            <button onClick={pauseMission}>
              Pause Mission
            </button>
          )}

          {missionStatus === "paused" && (
            <button onClick={resumeMission}>
              Resume Mission
            </button>
          )}

          {(missionStatus === "in-progress" ||
            missionStatus === "paused") && (
            <button onClick={completeMission}>
              Complete Mission
            </button>
          )}

          {missionStatus === "completed" && (
            <button onClick={startMission}>
              Start New Mission
            </button>
          )}
        </div>
      </section>

      <MissionTimeline
        progress={progress}
        missionStatus={missionStatus}
      />

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
              missionStatus={missionStatus}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
