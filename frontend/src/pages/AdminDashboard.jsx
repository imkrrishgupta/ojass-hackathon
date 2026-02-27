import { useEffect, useMemo, useState } from "react";
import MapView from "../components/MapView";
import { Activity, Clock3, MapPin, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { axiosInstance } from "../api/axios.js";

const adminPoints = [
  { id: "a-1", lat: 28.633, lng: 77.216, label: "High Priority Cluster" },
  { id: "a-2", lat: 28.612, lng: 77.195, label: "Responder Hub - West Zone" },
  { id: "a-3", lat: 28.602, lng: 77.248, label: "Pending Escalation Case" },
  { id: "a-4", lat: 28.586, lng: 77.214, label: "SLA Breach Alert" },
];

function AdminDashboard({ onLogout }) {
  const [summary, setSummary] = useState({ openCount: 0, resolvedCount: 0, incidents: [] });

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await axiosInstance.get("/incidents/admin-summary");
        setSummary(response.data?.data || { openCount: 0, resolvedCount: 0, incidents: [] });
      } catch {
        setSummary({ openCount: 0, resolvedCount: 0, incidents: [] });
      }
    };

    fetchSummary();
    const timer = setInterval(fetchSummary, 10000);
    return () => clearInterval(timer);
  }, []);

  const activeResponders = useMemo(
    () => summary.incidents.reduce((total, incident) => total + (incident.responders?.length || 0), 0),
    [summary.incidents]
  );

  const latestIncidents = summary.incidents.slice(0, 3);
  const trustRows = summary.incidents.slice(0, 4).map((incident) => {
    const hasResponders = (incident.responders?.length || 0) > 0;
    const status = hasResponders ? "Verified by responders" : "Pending verification";
    const risk = !hasResponders && incident.status === "open" ? "Needs review" : "Normal";

    return {
      id: incident._id,
      title: incident.type?.toUpperCase() || "INCIDENT",
      status,
      risk,
    };
  });

  const misuseFlags = summary.incidents.filter(
    (incident) => incident.status === "open" && (incident.responders?.length || 0) === 0
  ).length;

  return (
    <main className="dashboard-page user-dashboard-page">
      <section className="dashboard-shell user-dashboard-shell">
        <header className="dashboard-topnav user-topnav">
          <div className="dashboard-topnav-left">
            <span className="badge">NearHelp</span>
            <div className="dashboard-title-block">
              <h2>Admin Dashboard</h2>
              <p>Control center and live incident supervision</p>
            </div>
          </div>
          <div className="dashboard-topnav-right">
            <span className="sos-pill">Active SOS: {summary.openCount}</span>
            <span className="muted-meta">Last sync: live</span>
            <button type="button" className="dashboard-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="dashboard-stats-row user-stats-row">
          <article className="stat-card">
            <div className="stat-head">
              <p className="stat-label">Open Critical Cases</p>
              <span className="stat-icon-wrap">
                <ShieldAlert size={16} />
              </span>
            </div>
            <h4>{summary.openCount}</h4>
            <p className="stat-meta">Live open incidents</p>
          </article>
          <article className="stat-card">
            <div className="stat-head">
              <p className="stat-label">Responders Active</p>
              <span className="stat-icon-wrap">
                <Activity size={16} />
              </span>
            </div>
            <h4>{activeResponders}</h4>
            <p className="stat-meta">Total active responders</p>
          </article>
          <article className="stat-card">
            <div className="stat-head">
              <p className="stat-label">Avg. Dispatch ETA</p>
              <span className="stat-icon-wrap">
                <Clock3 size={16} />
              </span>
            </div>
            <h4>{summary.resolvedCount}</h4>
            <p className="stat-meta">Resolved cases so far</p>
          </article>
        </section>

        <section className="dashboard-main-grid user-dashboard-grid">
          <aside className="dashboard-panel filters-panel user-panel">
            <h3>Filters</h3>
            <p className="panel-caption">Select admin focus categories</p>
            <div className="filter-chip-list">
              <span className="filter-chip active">High Severity</span>
              <span className="filter-chip">Unassigned</span>
              <span className="filter-chip">Escalated</span>
              <span className="filter-chip">Responder Offline</span>
              <span className="filter-chip">All Regions</span>
            </div>

            <div className="panel-divider" />

            <p className="panel-caption">Coverage</p>
            <div className="coverage-tags">
              <span>
                <MapPin size={14} /> City-wide monitoring
              </span>
              <span>
                <MapPin size={14} /> Priority zone tracking
              </span>
              <span>
                <SlidersHorizontal size={14} /> Escalation first routing
              </span>
            </div>

            <div className="panel-divider" />

            <p className="panel-caption">Trust & Verification</p>
            <div className="coverage-tags">
              <span>Misuse flags pending: {misuseFlags}</span>
              <span>Suspension candidates: {misuseFlags > 2 ? misuseFlags - 2 : 0}</span>
            </div>

            <div className="update-list" style={{ marginTop: 10 }}>
              {trustRows.length === 0 ? (
                <div className="update-item">
                  <p className="update-title">No trust events yet</p>
                  <p className="update-text">Verification entries will appear as incidents and responders join.</p>
                </div>
              ) : (
                trustRows.map((row) => (
                  <div className="update-item" key={row.id}>
                    <p className="update-title">{row.title}</p>
                    <p className="update-text">{row.status}</p>
                    <span className="update-time">Risk: {row.risk}</span>
                  </div>
                ))
              )}
            </div>
          </aside>

          <section className="dashboard-panel live-map-panel user-panel">
            <h3>Live Map</h3>
            <p className="panel-caption">Control-room view with live incidents</p>
            <div className="map-box">
	              <MapView points={adminPoints} mapHeight={360} showRadius={false} />
            </div>
          </section>

          <aside className="dashboard-panel user-panel">
            <h3>Live Updates</h3>
            <div className="update-list">
              {latestIncidents.length === 0 ? (
                <div className="update-item">
                  <p className="update-title">No incidents yet</p>
                  <p className="update-text">Live updates will appear here as SOS requests arrive.</p>
                </div>
              ) : (
                latestIncidents.map((incident) => (
                  <div className="update-item" key={incident._id}>
                    <p className="update-title">{incident.type?.toUpperCase()} Incident</p>
                    <p className="update-text">{incident.description || "No extra details"}</p>
                    <span className="update-time">
                      Responders: {incident.responders?.length || 0} • {incident.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

export default AdminDashboard;
