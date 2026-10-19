
import { useEffect, useState } from "react";
import "./App.css";
import GlobeView from "./GlobeView";

const initialDrones = [
  {
    id: "DRONE-01",
    status: "Ready",
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
    status: "Ready",
    battery: 46,
    location: "Tenali",
  },
];

function DroneCard({ drone, mission }) {
  const isAssigned = Boolean(mission);
  const displayedStatus = isAssigned
    ? mission.status === "Completed"
      ? "Ready"
      : mission.status === "In Progress"
        ? "In Flight"
        : mission.status === "Paused"
          ? "Paused"
          : "Assigned"
    : drone.status;

  const statusClass = displayedStatus
    .toLowerCase()
    .replace(" ", "-");

  const location =
    mission?.status === "Completed"
      ? mission.destination
      : mission?.status === "In Progress" ||
          mission?.status === "Paused"
        ? `En route to ${mission.destination}`
        : mission?.status === "Created"
          ? `Assigned: ${mission.pickup}`
          : drone.location;

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

      {mission && (
        <div className="delivery-progress">
          <div className="battery-heading">
            <span>Delivery Progress</span>
            <strong>{mission.progress}%</strong>
          </div>

          <div
            className="battery-track"
            role="progressbar"
            aria-label={`${mission.name} delivery progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={mission.progress}
          >
            <div
              className="battery-fill delivery-progress-fill"
              style={{ width: `${mission.progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="location">
        <span>Location</span>
        <strong>{location}</strong>
      </div>

      {mission && (
        <div className="location">
          <span>Assigned Mission</span>
          <strong>{mission.name}</strong>
        </div>
      )}
    </article>
  );
}

function App() {
  const [drones] = useState(initialDrones);

  const [missionName, setMissionName] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [selectedDrone, setSelectedDrone] = useState("");
  const [missions, setMissions] = useState([]);
  const [missionMessage, setMissionMessage] = useState("");
  const [selectedMissionId, setSelectedMissionId] = useState("");

  // Only drones with Ready status and no unfinished mission
  // are available for a new assignment.
  const availableDrones = drones.filter((drone) => {
    const hasActiveMission = missions.some(
      (mission) =>
        mission.droneId === drone.id &&
        mission.status !== "Completed"
    );

    return (
      drone.status === "Ready" &&
      !hasActiveMission
    );
  });

  // Keep the selected drone valid as availability changes.
  useEffect(() => {
    if (
      !availableDrones.some(
        (drone) => drone.id === selectedDrone
      )
    ) {
      setSelectedDrone(availableDrones[0]?.id || "");
    }
  }, [missions, selectedDrone]);

  // Advance every running mission independently.
  useEffect(() => {
    const hasRunningMissions = missions.some(
      (mission) => mission.status === "In Progress"
    );

    if (!hasRunningMissions) return;

    const timer = setInterval(() => {
      setMissions((previous) =>
        previous.map((mission) => {
          if (mission.status !== "In Progress") {
            return mission;
          }

          const nextProgress = Math.min(
            mission.progress + 1,
            100
          );

          return {
            ...mission,
            progress: nextProgress,
            status:
              nextProgress >= 100
                ? "Completed"
                : "In Progress",
          };
        })
      );
    }, 300);

    return () => clearInterval(timer);
  }, [missions]);

  const createMission = (event) => {
    event.preventDefault();
    setMissionMessage("");

    const cleanName = missionName.trim();
    const cleanPickup = pickupLocation.trim();
    const cleanDelivery = deliveryLocation.trim();

    if (!cleanName || !cleanPickup || !cleanDelivery) {
      setMissionMessage(
        "Please fill in all mission details."
      );
      return;
    }

    if (
      cleanPickup.toLowerCase() ===
      cleanDelivery.toLowerCase()
    ) {
      setMissionMessage(
        "Pickup and delivery locations must be different."
      );
      return;
    }

    const drone = availableDrones.find(
      (item) => item.id === selectedDrone
    );

    if (!drone) {
      setMissionMessage(
        "Please select an available drone."
      );
      return;
    }

    const newMission = {
      id: `MISSION-${Date.now()}`,
      name: cleanName,
      pickup: cleanPickup,
      destination: cleanDelivery,
      droneId: selectedDrone,
      status: "Created",
      progress: 0,
    };

    setMissions((previous) => [
      newMission,
      ...previous,
    ]);

    setMissionName("");
    setPickupLocation("");
    setDeliveryLocation("");

    setMissionMessage("Mission created successfully!");
  };

  const deleteMission = (missionId) => {
    const mission = missions.find(
      (item) => item.id === missionId
    );

    if (!mission) return;

    if (
      mission.status === "In Progress" ||
      mission.status === "Paused"
    ) {
      setMissionMessage(
        "Pause or complete the mission before deleting it."
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this mission?"
    );

    if (!confirmed) return;

    setMissions((previous) =>
      previous.filter(
        (item) => item.id !== missionId
      )
    );

    if (selectedMissionId === missionId) {
      setSelectedMissionId("");
    }

    setMissionMessage("Mission deleted successfully.");
  };

  const updateMissionStatus = (missionId, status) => {
    setMissions((previous) =>
      previous.map((mission) => {
        if (mission.id !== missionId) {
          return mission;
        }

        return {
          ...mission,
          status,
          progress:
            status === "Completed"
              ? 100
              : mission.progress,
        };
      })
    );

    setSelectedMissionId(missionId);
  };

  const activeMissions = missions.filter(
    (mission) => mission.status !== "Completed"
  );

  const completedMissions = missions.filter(
    (mission) => mission.status === "Completed"
  );

  const selectedMission =
    missions.find(
      (mission) => mission.id === selectedMissionId
    ) ||
    activeMissions[0] ||
    completedMissions[0] ||
    null;

  const inFlight = missions.filter(
    (mission) => mission.status === "In Progress"
  ).length;

  const disconnected = drones.filter(
    (drone) => drone.status === "Disconnected"
  ).length;

  const getDroneMission = (droneId) =>
    missions.find(
      (mission) =>
        mission.droneId === droneId &&
        mission.status !== "Completed"
    ) ||
    [...missions]
      .reverse()
      .find(
        (mission) => mission.droneId === droneId
      );

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

      {/* Create mission */}
      <section className="timeline-panel mission-creation-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MISSION MANAGEMENT</p>
            <h2>Create Delivery Mission</h2>
          </div>

          <span>{missions.length} total</span>
        </div>

        <form className="mission-form" onSubmit={createMission}>
          <div className="mission-form-field">
            <label htmlFor="missionName">Mission Name</label>
            <input
              id="missionName"
              type="text"
              placeholder="e.g. Medical Supply Delivery"
              value={missionName}
              onChange={(event) =>
                setMissionName(event.target.value)
              }
              required
            />
          </div>

          <div className="mission-form-row">
            <div className="mission-form-field">
              <label htmlFor="pickupLocation">
                Pickup Location
              </label>
              <input
                id="pickupLocation"
                type="text"
                placeholder="e.g. Vijayawada"
                value={pickupLocation}
                onChange={(event) =>
                  setPickupLocation(event.target.value)
                }
                required
              />
            </div>

            <div className="mission-form-field">
              <label htmlFor="deliveryLocation">
                Delivery Location
              </label>
              <input
                id="deliveryLocation"
                type="text"
                placeholder="e.g. Guntur"
                value={deliveryLocation}
                onChange={(event) =>
                  setDeliveryLocation(event.target.value)
                }
                required
              />
            </div>
          </div>

          <div className="mission-form-field">
            <label htmlFor="selectedDrone">
              Assign Available Drone
            </label>
            <select
              id="selectedDrone"
              value={selectedDrone}
              onChange={(event) =>
                setSelectedDrone(event.target.value)
              }
              disabled={availableDrones.length === 0}
              required
            >
              {availableDrones.length === 0 ? (
                <option value="">
                  No drones available
                </option>
              ) : (
                availableDrones.map((drone) => (
                  <option key={drone.id} value={drone.id}>
                    {drone.id} — {drone.battery}% battery
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            type="submit"
            disabled={availableDrones.length === 0}
          >
            Create Mission
          </button>

          {availableDrones.length === 0 && (
            <p className="mission-message" role="status">
              No free drones are available. Complete or cancel
              an existing mission to free a drone.
            </p>
          )}

          {missionMessage && (
            <p
              className="mission-message"
              role="status"
              aria-live="polite"
            >
              {missionMessage}
            </p>
          )}
        </form>
      </section>

      {/* Mission queue */}
      <section className="fleet-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">DELIVERY QUEUE</p>
            <h2>Created Missions</h2>
          </div>

          <span>{missions.length} missions</span>
        </div>

        {missions.length === 0 ? (
          <div className="empty-missions">
            <h3>No missions created yet</h3>
            <p>
              Create a delivery mission using the form above.
            </p>
          </div>
        ) : (
          <div className="mission-list">
            {missions.map((mission) => (
              <article
                className="drone-card mission-card"
                key={mission.id}
              >
                <div className="drone-card-top">
                  <div>
                    <p className="eyebrow">{mission.id}</p>
                    <h3>{mission.name}</h3>
                  </div>

                  <div className="mission-card-actions">
                    <span
                      className={`status ${
                        mission.status === "Completed"
                          ? "ready"
                          : mission.status === "In Progress"
                            ? "in-flight"
                            : mission.status === "Paused"
                              ? "paused"
                              : "ready"
                      }`}
                    >
                      {mission.status}
                    </span>

                    <button
                      type="button"
                      className="delete-mission-button"
                      onClick={() => deleteMission(mission.id)}
                      aria-label={`Delete ${mission.name}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mission-route">
                  <div>
                    <span>Pickup</span>
                    <strong>{mission.pickup}</strong>
                  </div>

                  <div>
                    <span>Destination</span>
                    <strong>{mission.destination}</strong>
                  </div>

                  <div>
                    <span>Assigned Drone</span>
                    <strong>{mission.droneId}</strong>
                  </div>
                </div>

                <div className="delivery-progress">
                  <div className="battery-heading">
                    <span>Progress</span>
                    <strong>{mission.progress}%</strong>
                  </div>

                  <div className="battery-track">
                    <div
                      className="battery-fill delivery-progress-fill"
                      style={{
                        width: `${mission.progress}%`,
                      }}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Map displays the selected mission's progress.
          GlobeView still has its existing single-route interface. */}
      <section className="map-panel">
        <p className="eyebrow">LIVE FLEET VIEW</p>
        <h2>Mission Map</h2>

        <div className="mission-form-field">
          <label htmlFor="mapMission">
            Select Mission to View
          </label>
          <select
            id="mapMission"
            value={selectedMission?.id || ""}
            onChange={(event) =>
              setSelectedMissionId(event.target.value)
            }
          >
            {missions.length === 0 ? (
              <option value="">No missions available</option>
            ) : (
              missions.map((mission) => (
                <option key={mission.id} value={mission.id}>
                  {mission.name} — {mission.droneId}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="globe-container">
          <GlobeView
            progress={selectedMission?.progress || 0}
          />
        </div>

        {selectedMission && (
          <p className="mission-message">
            Viewing {selectedMission.droneId}:{" "}
            {selectedMission.pickup} to{" "}
            {selectedMission.destination}
          </p>
        )}
      </section>

      {/* Only unfinished missions appear in mission controls. */}
      <section className="timeline-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MISSION CONTROL</p>
            <h2>Active Mission Controls</h2>
          </div>

          <span>{activeMissions.length} active</span>
        </div>

        {activeMissions.length === 0 ? (
          <div className="empty-missions">
            <h3>No active missions</h3>
            <p>
              Create a mission to start managing deliveries here.
            </p>
          </div>
        ) : (
          <div className="mission-list">
            {activeMissions.map((mission) => (
              <article
                className="drone-card mission-card"
                key={mission.id}
              >
                <div className="drone-card-top">
                  <div>
                    <p className="eyebrow">{mission.droneId}</p>
                    <h3>{mission.name}</h3>
                  </div>

                  <span className="status ready">
                    {mission.status}
                  </span>
                </div>

                <div className="mission-route">
                  <div>
                    <span>Pickup</span>
                    <strong>{mission.pickup}</strong>
                  </div>

                  <div>
                    <span>Destination</span>
                    <strong>{mission.destination}</strong>
                  </div>

                  <div>
                    <span>Progress</span>
                    <strong>{mission.progress}%</strong>
                  </div>
                </div>

                <div className="mission-controls">
                  {mission.status === "Created" && (
                    <button
                      onClick={() =>
                        updateMissionStatus(
                          mission.id,
                          "In Progress"
                        )
                      }
                    >
                      Start Mission
                    </button>
                  )}

                  {mission.status === "In Progress" && (
                    <button
                      onClick={() =>
                        updateMissionStatus(
                          mission.id,
                          "Paused"
                        )
                      }
                    >
                      Pause Mission
                    </button>
                  )}

                  {mission.status === "Paused" && (
                    <button
                      onClick={() =>
                        updateMissionStatus(
                          mission.id,
                          "In Progress"
                        )
                      }
                    >
                      Resume Mission
                    </button>
                  )}

                  {(mission.status === "In Progress" ||
                    mission.status === "Paused") && (
                    <button
                      onClick={() =>
                        updateMissionStatus(
                          mission.id,
                          "Completed"
                        )
                      }
                    >
                      Complete Mission
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Fleet overview */}
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
              mission={getDroneMission(drone.id)}
            />
          ))}
        </div>
      </section>

      {/* Completed missions remain visible as history. */}
      <section className="fleet-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MISSION HISTORY</p>
            <h2>Completed Missions</h2>
          </div>

          <span>{completedMissions.length} completed</span>
        </div>

        {completedMissions.length === 0 ? (
          <div className="empty-missions">
            <p>No completed missions yet.</p>
          </div>
        ) : (
          <div className="mission-list">
            {completedMissions.map((mission) => (
              <article
                className="drone-card mission-card"
                key={mission.id}
              >
                <div className="drone-card-top">
                  <div>
                    <p className="eyebrow">{mission.id}</p>
                    <h3>{mission.name}</h3>
                  </div>

                  <span className="status ready">
                    Completed
                  </span>
                </div>

                <div className="mission-route">
                  <div>
                    <span>Route</span>
                    <strong>
                      {mission.pickup} → {mission.destination}
                    </strong>
                  </div>

                  <div>
                    <span>Drone</span>
                    <strong>{mission.droneId}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
