import MapView from "../components/MapView";
import { Activity, Clock3, MapPin, ShieldAlert, SlidersHorizontal } from "lucide-react";

const adminPoints = [
  { id: "a-1", lat: 28.633, lng: 77.216, label: "High Priority Cluster" },
  { id: "a-2", lat: 28.612, lng: 77.195, label: "Responder Hub - West Zone" },
  { id: "a-3", lat: 28.602, lng: 77.248, label: "Pending Escalation Case" },
  { id: "a-4", lat: 28.586, lng: 77.214, label: "SLA Breach Alert" },
];

function AdminDashboard({ onLogout }) {
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
            <span className="sos-pill">Active SOS: 21</span>
            <span className="muted-meta">Last sync: 1 min ago</span>
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
            <h4>11</h4>
            <p className="stat-meta">+2 from previous hour</p>
          </article>
          <article className="stat-card">
            <div className="stat-head">
              <p className="stat-label">Responders Active</p>
              <span className="stat-icon-wrap">
                <Activity size={16} />
              </span>
            </div>
            <h4>27</h4>
            <p className="stat-meta">5 in high-priority zones</p>
          </article>
          <article className="stat-card">
            <div className="stat-head">
              <p className="stat-label">Avg. Dispatch ETA</p>
              <span className="stat-icon-wrap">
                <Clock3 size={16} />
              </span>
            </div>
            <h4>4 min</h4>
            <p className="stat-meta">Reduced by 30 seconds</p>
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
              <div className="update-item">
                <p className="update-title">SLA Breach Alert</p>
                <p className="update-text">Case #A-104 exceeded threshold by 2 min.</p>
                <span className="update-time">10:08 AM</span>
              </div>
              <div className="update-item">
                <p className="update-title">Manual Reassignment</p>
                <p className="update-text">Unit R-17 assigned to North Sector.</p>
                <span className="update-time">10:05 AM</span>
              </div>
              <div className="update-item">
                <p className="update-title">High Priority Cluster</p>
                <p className="update-text">3 connected incidents detected downtown.</p>
                <span className="update-time">10:02 AM</span>
              </div>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

export default AdminDashboard;
