import { useEffect, useMemo, useState } from "react";
import "./App.css";
import GlobeView from "./GlobeView";

const initialDrones = [
  { id: "DRONE-01", status: "Ready", battery: 82, location: "Vijayawada" },
  { id: "DRONE-02", status: "Ready", battery: 100, location: "Guntur" },
  { id: "DRONE-03", status: "Ready", battery: 46, location: "Tenali" },
];

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "missions", label: "Mission Control", icon: "⌁" },
  { id: "fleet", label: "Drone Fleet", icon: "✈" },
  { id: "history", label: "Mission History", icon: "◷" },
  { id: "analytics", label: "Analytics", icon: "▥" },
  { id: "notifications", label: "Notifications", icon: "♧" },
];

const defaultProfile = { name: "AeroSaga Operator", email: "operator@aerosaga.demo", role: "Fleet Administrator" };
const defaultSettings = { compactMode: false, missionAlerts: true, batteryAlerts: true, completionAlerts: true };

function readSaved(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function StatCard({ label, value, hint, accent = "blue", icon }) {
  return (
    <article className={`stat-card accent-${accent}`}>
      <div className="stat-top">
        <span className="stat-icon">{icon}</span>
        <span className="stat-hint">{hint}</span>
      </div>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function StatusBadge({ status }) {
  const key = String(status || "Unknown").toLowerCase().replaceAll(" ", "-");
  return <span className={`status-badge status-${key}`}>{status}</span>;
}

function ProgressBar({ value, label = "Progress", color = "blue" }) {
  return (
    <div className="progress-wrap">
      <div className="progress-label"><span>{label}</span><strong>{value}%</strong></div>
      <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={value}>
        <div className={`progress-fill fill-${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function DroneCard({ drone, mission, onViewMission }) {
  const assigned = Boolean(mission && mission.status !== "Completed");
  const status = assigned
    ? mission.status === "In Progress" ? "In Flight"
      : mission.status === "Paused" ? "Paused"
      : "Assigned"
    : drone.battery < 20 ? "Low Battery" : drone.status;
  const location = mission?.status === "Completed" ? mission.destination
    : mission?.status === "In Progress" || mission?.status === "Paused" ? `En route to ${mission.destination}`
    : mission?.status === "Created" ? `Assigned: ${mission.pickup}` : drone.location;
  return (
    <article className="panel drone-card">
      <div className="card-heading">
        <div className="drone-avatar">✈</div>
        <div className="grow"><p className="eyebrow">DRONE ID</p><h3>{drone.id}</h3></div>
        <StatusBadge status={status} />
      </div>
      <div className="battery-row"><span>Battery health</span><strong>{drone.battery}%</strong></div>
      <div className="progress-track"><div className={`progress-fill ${drone.battery < 20 ? "fill-red" : drone.battery < 40 ? "fill-amber" : "fill-green"}`} style={{ width: `${drone.battery}%` }} /></div>
      <div className="detail-row"><span>Current location</span><strong>{location}</strong></div>
      {mission && mission.status !== "Completed" && <div className="detail-row"><span>Assigned mission</span><strong>{mission.name}</strong></div>}
      {mission && mission.status !== "Completed" && <ProgressBar value={mission.progress} label="Delivery progress" />}
      {mission && mission.status !== "Completed" && <button className="button button-ghost button-small full-width" onClick={() => onViewMission(mission.id)}>Open mission</button>}
    </article>
  );
}

function EmptyState({ title, description }) {
  return <div className="empty-state"><div className="empty-icon">⌁</div><h3>{title}</h3><p>{description}</p></div>;
}

function App() {
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drones] = useState(initialDrones);
  const [missions, setMissions] = useState(() => readSaved("aerosaga-missions-v1", []));
  const [missionName, setMissionName] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [selectedDrone, setSelectedDrone] = useState("");
  const [selectedMissionId, setSelectedMissionId] = useState("");
  const [missionMessage, setMissionMessage] = useState("");
  const [search, setSearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("All");
  const [profile, setProfile] = useState(() => readSaved("aerosaga-profile-v1", defaultProfile));
  const [settings, setSettings] = useState(() => readSaved("aerosaga-settings-v1", defaultSettings));
  const [profileMessage, setProfileMessage] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");

  useEffect(() => {
    localStorage.setItem("aerosaga-missions-v1", JSON.stringify(missions));
  }, [missions]);
  useEffect(() => {
    localStorage.setItem("aerosaga-profile-v1", JSON.stringify(profile));
  }, [profile]);
  useEffect(() => {
    localStorage.setItem("aerosaga-settings-v1", JSON.stringify(settings));
  }, [settings]);

  const availableDrones = drones.filter((drone) =>
    drone.status === "Ready" &&
    drone.battery >= 20 &&
    !missions.some((mission) => mission.droneId === drone.id && mission.status !== "Completed")
  );

  useEffect(() => {
    if (!availableDrones.some((drone) => drone.id === selectedDrone)) {
      setSelectedDrone(availableDrones[0]?.id || "");
    }
  }, [missions, selectedDrone]); // availability changes when mission state changes

  useEffect(() => {
    if (!missions.some((mission) => mission.status === "In Progress")) return undefined;
    const timer = setInterval(() => {
      setMissions((current) => current.map((mission) => {
        if (mission.status !== "In Progress") return mission;
        const progress = Math.min(mission.progress + 1, 100);
        return { ...mission, progress, status: progress >= 100 ? "Completed" : "In Progress" };
      }));
    }, 300);
    return () => clearInterval(timer);
  }, [missions]);

  const activeMissions = missions.filter((mission) => mission.status !== "Completed");
  const completedMissions = missions.filter((mission) => mission.status === "Completed");
  const inFlight = missions.filter((mission) => mission.status === "In Progress").length;
  const paused = missions.filter((mission) => mission.status === "Paused").length;
  const selectedMission = missions.find((mission) => mission.id === selectedMissionId) || activeMissions[0] || missions[0] || null;
  const getDroneMission = (droneId) => missions.find((mission) => mission.droneId === droneId && mission.status !== "Completed");
  const filteredMissions = missions.filter((mission) => {
    const text = `${mission.id} ${mission.name} ${mission.pickup} ${mission.destination} ${mission.droneId} ${mission.status}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });
  const filteredHistory = completedMissions.filter((mission) => {
    if (historyFilter === "All") return true;
    return mission.droneId === historyFilter;
  });
  const notifications = useMemo(() => {
    const items = [];
    missions.forEach((mission) => {
      if (settings.missionAlerts && mission.status === "Paused") items.push({ id: `${mission.id}-paused`, kind: "warning", title: "Mission paused", detail: `${mission.name} is paused and needs operator attention.`, time: "Current session" });
      if (settings.completionAlerts && mission.status === "Completed") items.push({ id: `${mission.id}-complete`, kind: "success", title: "Mission completed", detail: `${mission.name} reached ${mission.destination}.`, time: "Current session" });
      if (settings.missionAlerts && mission.status === "In Progress") items.push({ id: `${mission.id}-progress`, kind: "info", title: "Drone in flight", detail: `${mission.droneId} is delivering ${mission.name}.`, time: `${mission.progress}% complete` });
    });
    if (settings.batteryAlerts) {
      drones.filter((drone) => drone.battery < 30).forEach((drone) => items.push({ id: `${drone.id}-battery`, kind: "danger", title: "Low battery warning", detail: `${drone.id} has ${drone.battery}% battery remaining.`, time: "Fleet status" }));
    }
    return items;
  }, [missions, drones, settings]);

  const createMission = (event) => {
    event.preventDefault();
    setMissionMessage("");
    const name = missionName.trim();
    const pickup = pickupLocation.trim();
    const destination = deliveryLocation.trim();
    if (!name || !pickup || !destination) return setMissionMessage("Please complete all mission fields.");
    if (pickup.toLowerCase() === destination.toLowerCase()) return setMissionMessage("Pickup and destination must be different.");
    const drone = availableDrones.find((item) => item.id === selectedDrone);
    if (!drone) return setMissionMessage("Choose an available drone with at least 20% battery.");
    const mission = { id: `MISSION-${Date.now()}`, name, pickup, destination, droneId: drone.id, status: "Created", progress: 0, createdAt: new Date().toISOString() };
    setMissions((current) => [mission, ...current]);
    setSelectedMissionId(mission.id);
    setMissionName(""); setPickupLocation(""); setDeliveryLocation("");
    setMissionMessage("Mission created successfully.");
  };

  const updateMissionStatus = (missionId, status) => {
    setMissions((current) => current.map((mission) => mission.id !== missionId ? mission : {
      ...mission, status, progress: status === "Completed" ? 100 : mission.progress,
      completedAt: status === "Completed" ? new Date().toISOString() : mission.completedAt,
    }));
    setSelectedMissionId(missionId);
    setMissionMessage(`Mission updated: ${status}.`);
  };

  const deleteMission = (missionId) => {
    const mission = missions.find((item) => item.id === missionId);
    if (!mission) return;
    if (mission.status === "In Progress" || mission.status === "Paused") {
      setMissionMessage("Pause or complete the mission before deleting it.");
      return;
    }
    if (!window.confirm(`Delete "${mission.name}"?`)) return;
    setMissions((current) => current.filter((item) => item.id !== missionId));
    if (selectedMissionId === missionId) setSelectedMissionId("");
    setMissionMessage("Mission deleted.");
  };

  const openMission = (id) => { setSelectedMissionId(id); setPage("missions"); setSidebarOpen(false); };
  const navigate = (id) => { setPage(id); setSidebarOpen(false); setSearch(""); };
  const formatDate = (value) => value ? new Date(value).toLocaleString() : "Date unavailable";

  const renderMissionCard = (mission, controls = false) => (
    <article className="panel mission-card" key={mission.id}>
      <div className="mission-card-header">
        <div><p className="eyebrow">{mission.id}</p><h3>{mission.name}</h3></div>
        <StatusBadge status={mission.status} />
      </div>
      <div className="route-grid">
        <div><span>Pickup</span><strong>{mission.pickup}</strong></div>
        <div><span>Destination</span><strong>{mission.destination}</strong></div>
        <div><span>Assigned drone</span><strong>{mission.droneId}</strong></div>
      </div>
      <ProgressBar value={mission.progress} label="Delivery progress" color={mission.status === "Completed" ? "green" : "blue"} />
      <div className="mission-actions">
        <button className="button button-ghost button-small" onClick={() => openMission(mission.id)}>View details</button>
        {controls && mission.status === "Created" && <button className="button button-primary button-small" onClick={() => updateMissionStatus(mission.id, "In Progress")}>Start mission</button>}
        {controls && mission.status === "In Progress" && <button className="button button-secondary button-small" onClick={() => updateMissionStatus(mission.id, "Paused")}>Pause</button>}
        {controls && mission.status === "Paused" && <button className="button button-primary button-small" onClick={() => updateMissionStatus(mission.id, "In Progress")}>Resume</button>}
        {controls && (mission.status === "In Progress" || mission.status === "Paused") && <button className="button button-success button-small" onClick={() => updateMissionStatus(mission.id, "Completed")}>Complete</button>}
        {controls && mission.status !== "In Progress" && mission.status !== "Paused" && <button className="button button-danger-ghost button-small" onClick={() => deleteMission(mission.id)}>Delete</button>}
      </div>
    </article>
  );

  const renderDashboard = () => (
    <>
      <section className="welcome-row">
        <div><p className="eyebrow">FLEET OPERATIONS / OVERVIEW</p><h2>Good to see you, {profile.name.split(" ")[0]}.</h2><p>Monitor your fleet, coordinate deliveries, and review mission activity from one place.</p></div>
        <button className="button button-primary" onClick={() => navigate("missions")}>＋ Create mission</button>
      </section>
      <div className="stats-grid">
        <StatCard label="Total drones" value={drones.length} hint="Registered fleet" icon="✈" accent="blue" />
        <StatCard label="Active missions" value={activeMissions.length} hint={`${inFlight} currently in flight`} icon="⌁" accent="green" />
        <StatCard label="Completed deliveries" value={completedMissions.length} hint="All-time in this demo" icon="✓" accent="purple" />
        <StatCard label="Paused missions" value={paused} hint="Require attention" icon="Ⅱ" accent="amber" />
      </div>
      <section className="panel map-panel">
        <div className="section-title"><div><p className="eyebrow">LIVE FLEET VIEW</p><h3>Fleet location overview</h3><p className="muted">Sample locations around Vijayawada, Guntur, and Tenali.</p></div><span className="live-pill"><i /> Simulation mode</span></div>
        <div className="globe-container"><GlobeView height={420} showFleet /></div>
      </section>
      <div className="content-grid dashboard-lower">
        <section className="panel"><div className="section-title"><div><p className="eyebrow">CURRENT ACTIVITY</p><h3>Active missions</h3></div><button className="text-button" onClick={() => navigate("missions")}>View all →</button></div>
          {activeMissions.length ? <div className="stack-list">{activeMissions.slice(0, 3).map((mission) => <div className="activity-row" key={mission.id}><div className="activity-mark">⌁</div><div className="grow"><strong>{mission.name}</strong><p>{mission.pickup} → {mission.destination}</p><ProgressBar value={mission.progress} label={mission.droneId} /></div><StatusBadge status={mission.status} /></div>)}</div> : <EmptyState title="No active missions" description="Create a mission to start tracking deliveries." />}
        </section>
        <section className="panel"><div className="section-title"><div><p className="eyebrow">FLEET HEALTH</p><h3>Drone availability</h3></div><button className="text-button" onClick={() => navigate("fleet")}>View fleet →</button></div>
          <div className="health-list">{drones.map((drone) => <div className="health-row" key={drone.id}><span className="mini-drone">✈</span><div className="grow"><strong>{drone.id}</strong><p>{getDroneMission(drone.id)?.name || drone.location}</p></div><strong className={drone.battery < 30 ? "text-red" : "text-green"}>{drone.battery}%</strong></div>)}</div>
        </section>
      </div>
    </>
  );

  const renderMissions = () => (
    <>
      <section className="page-intro"><div><p className="eyebrow">OPERATIONS</p><h2>Mission Control</h2><p>Create delivery routes, assign drones, and manage mission progress.</p></div><span className="subtle-chip">{missions.length} total missions</span></section>
      <section className="panel">
        <div className="section-title"><div><p className="eyebrow">NEW DELIVERY</p><h3>Create a mission</h3></div><span className="subtle-chip">{availableDrones.length} drones available</span></div>
        <form className="mission-form" onSubmit={createMission}>
          <label>Mission name<input value={missionName} onChange={(e) => setMissionName(e.target.value)} placeholder="e.g. Medical supply delivery" required /></label>
          <div className="form-two"><label>Pickup location<input value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} placeholder="e.g. Vijayawada" required /></label><label>Destination<input value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} placeholder="e.g. Guntur" required /></label></div>
          <label>Assign available drone<select value={selectedDrone} onChange={(e) => setSelectedDrone(e.target.value)} disabled={!availableDrones.length} required>{availableDrones.length ? availableDrones.map((drone) => <option key={drone.id} value={drone.id}>{drone.id} — {drone.battery}% battery</option>) : <option value="">No available drones</option>}</select></label>
          <div className="form-submit"><button className="button button-primary" disabled={!availableDrones.length}>Create mission</button>{!availableDrones.length && <span className="muted small">No free drones with at least 20% battery.</span>}{missionMessage && <span className="form-message" role="status">{missionMessage}</span>}</div>
        </form>
      </section>
      {selectedMission && <section className="panel"><div className="section-title"><div><p className="eyebrow">MISSION TRACKING</p><h3>{selectedMission.name}</h3><p className="muted">{selectedMission.pickup} → {selectedMission.destination} · {selectedMission.droneId}</p></div><StatusBadge status={selectedMission.status} /></div>
        <div className="globe-container"><GlobeView mission={selectedMission} progress={selectedMission.progress} height={380} /></div>
        <div className="tracking-footer"><ProgressBar value={selectedMission.progress} label="Mission progress" color={selectedMission.status === "Completed" ? "green" : "blue"} /><div className="mission-actions">{selectedMission.status === "Created" && <button className="button button-primary" onClick={() => updateMissionStatus(selectedMission.id, "In Progress")}>Start mission</button>}{selectedMission.status === "In Progress" && <button className="button button-secondary" onClick={() => updateMissionStatus(selectedMission.id, "Paused")}>Pause mission</button>}{selectedMission.status === "Paused" && <button className="button button-primary" onClick={() => updateMissionStatus(selectedMission.id, "In Progress")}>Resume mission</button>}{selectedMission.status !== "Completed" && <button className="button button-success" onClick={() => updateMissionStatus(selectedMission.id, "Completed")}>Complete mission</button>}</div></div>
      </section>}
      <section><div className="section-title list-title"><div><p className="eyebrow">DELIVERY QUEUE</p><h3>All missions</h3></div><div className="search-field"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search missions..." /></div></div>
        {filteredMissions.length ? <div className="mission-list">{filteredMissions.map((mission) => renderMissionCard(mission, true))}</div> : <EmptyState title="No matching missions" description="Create a mission or adjust your search." />}
      </section>
    </>
  );

  const renderFleet = () => (
    <>
      <section className="page-intro"><div><p className="eyebrow">AIRCRAFT</p><h2>Drone Fleet</h2><p>Review each drone's readiness, battery level, location, and mission assignment.</p></div><span className="subtle-chip">{drones.length} registered drones</span></section>
      <div className="stats-grid three"><StatCard label="Available" value={availableDrones.length} hint="Ready for assignment" icon="✓" accent="green" /><StatCard label="Assigned" value={drones.length - availableDrones.length} hint="Busy or below battery threshold" icon="⌁" accent="blue" /><StatCard label="Low battery" value={drones.filter((drone) => drone.battery < 30).length} hint="Below 30% threshold" icon="!" accent="amber" /></div>
      <section className="panel map-panel"><div className="section-title"><div><p className="eyebrow">FLEET MAP</p><h3>Drone positions</h3></div><span className="live-pill"><i /> Simulated locations</span></div><div className="globe-container"><GlobeView height={390} showFleet /></div></section>
      <div className="drone-grid">{drones.map((drone) => <DroneCard key={drone.id} drone={drone} mission={getDroneMission(drone.id)} onViewMission={openMission} />)}</div>
    </>
  );

  const renderHistory = () => (
    <>
      <section className="page-intro"><div><p className="eyebrow">RECORDS</p><h2>Mission History</h2><p>Review completed deliveries and their routes.</p></div><span className="subtle-chip">{completedMissions.length} completed</span></section>
      <section className="panel"><div className="section-title"><div><h3>Completed deliveries</h3><p className="muted">Completed missions stay here after the drone is released.</p></div><select className="compact-select" value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)}><option>All</option>{drones.map((drone) => <option key={drone.id}>{drone.id}</option>)}</select></div>
      {filteredHistory.length ? <div className="table-wrap"><table><thead><tr><th>Mission</th><th>Route</th><th>Drone</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>{filteredHistory.map((mission) => <tr key={mission.id}><td><strong>{mission.name}</strong><small>{mission.id}</small></td><td>{mission.pickup} → {mission.destination}</td><td>{mission.droneId}</td><td><StatusBadge status={mission.status} /></td><td>{formatDate(mission.createdAt)}</td><td><button className="text-button" onClick={() => openMission(mission.id)}>View</button></td></tr>)}</tbody></table></div> : <EmptyState title="No completed missions yet" description="When a mission is completed, it will appear here." />}</section>
    </>
  );

  const renderAnalytics = () => {
    const total = missions.length;
    const completionRate = total ? Math.round(completedMissions.length / total * 100) : 0;
    const averageProgress = total ? Math.round(missions.reduce((sum, mission) => sum + mission.progress, 0) / total) : 0;
    const droneUsage = drones.map((drone) => ({ ...drone, count: missions.filter((mission) => mission.droneId === drone.id).length }));
    return <>
      <section className="page-intro"><div><p className="eyebrow">PERFORMANCE</p><h2>Analytics</h2><p>Operational metrics from the current AeroSaga demo session.</p></div><span className="subtle-chip">Live demo data</span></section>
      <div className="stats-grid"><StatCard label="Completion rate" value={`${completionRate}%`} hint={`${completedMissions.length} completed`} icon="✓" accent="green" /><StatCard label="Average progress" value={`${averageProgress}%`} hint="Across all missions" icon="◴" accent="blue" /><StatCard label="Fleet utilization" value={`${Math.round((drones.length - availableDrones.length) / drones.length * 100)}%`} hint="Drones assigned or busy" icon="▥" accent="purple" /><StatCard label="Total missions" value={total} hint="Created in this demo" icon="⌁" accent="amber" /></div>
      <section className="panel"><div className="section-title"><div><p className="eyebrow">MISSION BREAKDOWN</p><h3>Mission status</h3></div></div><div className="analytics-bars">{[{ label: "Created", count: missions.filter((m) => m.status === "Created").length, color: "blue" }, { label: "In progress", count: inFlight, color: "green" }, { label: "Paused", count: paused, color: "amber" }, { label: "Completed", count: completedMissions.length, color: "purple" }].map((item) => <div className="analytics-bar-row" key={item.label}><div><span>{item.label}</span><strong>{item.count}</strong></div><div className="progress-track"><div className={`progress-fill fill-${item.color}`} style={{ width: `${total ? item.count / total * 100 : 0}%` }} /></div></div>)}</div></section>
      <section className="panel"><div className="section-title"><div><p className="eyebrow">DRONE ACTIVITY</p><h3>Missions per drone</h3></div></div><div className="health-list">{droneUsage.map((drone) => <div className="health-row" key={drone.id}><span className="mini-drone">✈</span><div className="grow"><strong>{drone.id}</strong><p>{drone.location}</p></div><strong>{drone.count} missions</strong></div>)}</div></section>
      <p className="footnote">Analytics are calculated from the browser's saved demo data. They are not connected to real flight telemetry.</p>
    </>;
  };

  const renderNotifications = () => (
    <>
      <section className="page-intro"><div><p className="eyebrow">SYSTEM MESSAGES</p><h2>Notifications</h2><p>Mission status updates and operational alerts generated by the demo.</p></div><span className="subtle-chip">{notifications.length} current alerts</span></section>
      <section className="panel">{notifications.length ? <div className="notification-list">{notifications.map((item) => <article className={`notification-item notification-${item.kind}`} key={item.id}><div className="notification-symbol">{item.kind === "danger" ? "!" : item.kind === "success" ? "✓" : item.kind === "warning" ? "Ⅱ" : "⌁"}</div><div className="grow"><div className="notification-heading"><h3>{item.title}</h3><span>{item.time}</span></div><p>{item.detail}</p></div></article>)}</div> : <EmptyState title="You're all caught up" description="Alerts will appear here when missions change state or a drone needs attention." />}</section>
      <p className="footnote">These alerts are derived from current mission and fleet state; this demo does not send push notifications.</p>
    </>
  );

  const renderProfile = () => (
    <>
      <section className="page-intro"><div><p className="eyebrow">YOUR ACCOUNT</p><h2>Profile</h2><p>Manage the operator details shown in your workspace.</p></div></section>
      <section className="panel profile-panel"><div className="profile-hero"><div className="profile-avatar">{(profile.name || "A").trim().charAt(0).toUpperCase()}</div><div><h3>{profile.name}</h3><p>{profile.role}</p></div></div><form className="mission-form" onSubmit={(e) => { e.preventDefault(); setProfileMessage("Profile saved in this browser."); }}><label>Display name<input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required /></label><label>Email address<input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required /></label><label>Role<input value={profile.role} onChange={(e) => setProfile({ ...profile, role: e.target.value })} required /></label><div className="form-submit"><button className="button button-primary">Save profile</button>{profileMessage && <span className="form-message" role="status">{profileMessage}</span>}</div></form><p className="footnote">Profile details are stored locally in this browser; no account service is connected.</p></section>
    </>
  );

  const renderSettings = () => (
    <>
      <section className="page-intro"><div><p className="eyebrow">WORKSPACE PREFERENCES</p><h2>Settings</h2><p>Configure local dashboard preferences and alert visibility.</p></div></section>
      <section className="panel settings-panel"><div className="section-title"><div><h3>Preferences</h3><p className="muted">These settings affect this browser only.</p></div></div>
        {[{ key: "missionAlerts", title: "Mission status alerts", desc: "Show mission start, pause, and progress notifications." }, { key: "batteryAlerts", title: "Battery warnings", desc: "Show alerts for drones below the battery threshold." }, { key: "completionAlerts", title: "Completion notifications", desc: "Show a notification when a delivery completes." }, { key: "compactMode", title: "Compact dashboard", desc: "Use tighter spacing for a denser workspace." }].map((item) => <label className="setting-row" key={item.key}><span><strong>{item.title}</strong><small>{item.desc}</small></span><input type="checkbox" checked={Boolean(settings[item.key])} onChange={(e) => { setSettings({ ...settings, [item.key]: e.target.checked }); setSettingsMessage("Preference updated."); }} /></label>)}
        <div className="form-submit"><button className="button button-ghost" onClick={() => { setSettings(defaultSettings); setSettingsMessage("Settings reset to defaults."); }}>Reset defaults</button>{settingsMessage && <span className="form-message" role="status">{settingsMessage}</span>}</div>
      </section>
      <section className="panel"><div className="section-title"><div><p className="eyebrow">ABOUT</p><h3>AeroSaga Operations</h3></div><span className="subtle-chip">Frontend demo</span></div><p className="muted">React · Vite · CesiumJS / Resium</p><p className="footnote">Mission progress, fleet values, and analytics are simulated. Backend integration and real telemetry can be connected in a later phase.</p></section>
    </>
  );

  const pageTitles = { dashboard: "Dashboard", missions: "Mission Control", fleet: "Drone Fleet", history: "Mission History", analytics: "Analytics", notifications: "Notifications", profile: "Profile", settings: "Settings" };
  const renderPage = () => {
    switch (page) {
      case "missions": return renderMissions();
      case "fleet": return renderFleet();
      case "history": return renderHistory();
      case "analytics": return renderAnalytics();
      case "notifications": return renderNotifications();
      case "profile": return renderProfile();
      case "settings": return renderSettings();
      default: return renderDashboard();
    }
  };

  return (
    <div className={`aerosaga-shell ${settings.compactMode ? "compact-mode" : ""}`}>
      {sidebarOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark">A</div><div><strong>AeroSaga</strong><span>DRONE OPERATIONS</span></div><button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">×</button></div>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="main-nav" aria-label="Main navigation">{navItems.map((item) => <button key={item.id} className={`nav-link ${page === item.id ? "active" : ""}`} onClick={() => navigate(item.id)}><span className="nav-icon">{item.icon}</span><span>{item.label}</span>{item.id === "notifications" && notifications.length > 0 && <span className="nav-count">{notifications.length}</span>}</button>)}</nav>
        <p className="nav-caption nav-caption-bottom">PERSONAL</p>
        <nav className="main-nav" aria-label="Personal navigation"><button className={`nav-link ${page === "profile" ? "active" : ""}`} onClick={() => navigate("profile")}><span className="nav-icon">◉</span><span>Profile</span></button><button className={`nav-link ${page === "settings" ? "active" : ""}`} onClick={() => navigate("settings")}><span className="nav-icon">⚙</span><span>Settings</span></button></nav>
        <div className="sidebar-bottom"><div className="sidebar-status"><span className="status-dot" /><div><strong>System operational</strong><small>Simulation environment</small></div></div><div className="sidebar-user"><div className="user-avatar">{(profile.name || "A").trim().charAt(0).toUpperCase()}</div><div className="grow"><strong>{profile.name}</strong><small>{profile.role}</small></div><button className="user-menu-button" title="Open profile" onClick={() => navigate("profile")}>•••</button></div></div>
      </aside>
      <div className="main-column">
        <header className="app-header"><div className="header-left"><button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">☰</button><div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>{pageTitles[page]}</strong></div></div><div className="header-actions"><label className="global-search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { setPage("missions"); setSidebarOpen(false); } }} placeholder="Search missions..." aria-label="Search missions" /><kbd>Enter</kbd></label><button className="header-icon-button" title="Notifications" onClick={() => navigate("notifications")}>♧{notifications.length > 0 && <i />}</button><button className="header-profile" onClick={() => navigate("profile")}><span className="user-avatar">{(profile.name || "A").trim().charAt(0).toUpperCase()}</span><span className="header-user-name">{profile.name}</span><span>⌄</span></button></div></header>
        <main className="page-content">{renderPage()}<footer className="app-footer"><span>© {new Date().getFullYear()} AeroSaga</span><span>Drone delivery operations · Simulation mode</span></footer></main>
      </div>
    </div>
  );
}

export default App;
