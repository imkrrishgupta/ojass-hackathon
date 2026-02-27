import MapView from "../components/MapView";
import { Activity, Clock3, MapPin, ShieldAlert, SlidersHorizontal } from "lucide-react";

const userPoints = [
  { id: "u-1", lat: 28.621, lng: 77.219, label: "Accident - Connaught Place" },
  { id: "u-2", lat: 28.608, lng: 77.231, label: "Responder Unit A-12" },
  { id: "u-3", lat: 28.594, lng: 77.208, label: "Fire Alert - Mandi House" },
];

function UserDashboard({ onLogout }) {
  return (
    <main className="dashboard-page user-dashboard-page">
      <section className="dashboard-shell user-dashboard-shell">
        <header className="dashboard-topnav user-topnav">
          <div className="dashboard-topnav-left">
            <span className="badge">NearHelp</span>
            <div className="dashboard-title-block">
              <h2>User Dashboard</h2>
              <p>Real-time emergency overview</p>
            </div>
          </div>
          <div className="dashboard-topnav-right">
            <span className="sos-pill">Active SOS: 08</span>
            <span className="muted-meta">Last sync: 2 mins ago</span>
            <button type="button" className="dashboard-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="dashboard-stats-row user-stats-row">
          <article className="stat-card">
            <div className="stat-head">
              <p className="stat-label">Open Incidents</p>
              <span className="stat-icon-wrap">
                <ShieldAlert size={16} />
              </span>
            </div>
            <h4>24</h4>
            <p className="stat-meta">+3 from previous hour</p>
          </article>
          <article className="stat-card">
            <div className="stat-head">
              <p className="stat-label">Responders Live</p>
              <span className="stat-icon-wrap">
                <Activity size={16} />
              </span>
            </div>
            <h4>13</h4>
            <p className="stat-meta">2 units nearby now</p>
          </article>
          <article className="stat-card">
            <div className="stat-head">
              <p className="stat-label">Avg. ETA</p>
              <span className="stat-icon-wrap">
                <Clock3 size={16} />
              </span>
            </div>
            <h4>6 min</h4>
            <p className="stat-meta">Improved by 1 min</p>
          </article>
        </section>

        <section className="dashboard-main-grid user-dashboard-grid">
          <aside className="dashboard-panel filters-panel user-panel">
            <h3>Filters</h3>
            <p className="panel-caption">Select incident categories</p>
            <div className="filter-chip-list">
              <span className="filter-chip active">Accident</span>
              <span className="filter-chip">Fire</span>
              <span className="filter-chip">Health</span>
              <span className="filter-chip">Robbery</span>
              <span className="filter-chip">Breakdown</span>
            </div>

            <div className="panel-divider" />

            <p className="panel-caption">Coverage</p>
            <div className="coverage-tags">
              <span>
                <MapPin size={14} /> Within 2 km
              </span>
              <span>
                <MapPin size={14} /> Urban zone
              </span>
              <span>
                <SlidersHorizontal size={14} /> High priority first
              </span>
            </div>
          </aside>

          <section className="dashboard-panel live-map-panel user-panel">
            <h3>Live Map</h3>
            <p className="panel-caption">Auto-updating incidents and responders</p>
            <div className="map-box">
              <MapView points={userPoints} mapHeight={360} />
            </div>
          </section>

          <aside className="dashboard-panel user-panel">
            <h3>Live Updates</h3>
            <div className="update-list">
              <div className="update-item">
                <p className="update-title">Incident Feed</p>
                <p className="update-text">3 new alerts in the last 10 minutes.</p>
                <span className="update-time">10:04 AM</span>
              </div>
              <div className="update-item">
                <p className="update-title">Nearest Responder</p>
                <p className="update-text">Unit A-12 arriving in 4 minutes.</p>
                <span className="update-time">10:01 AM</span>
              </div>
              <div className="update-item">
                <p className="update-title">Escalation</p>
                <p className="update-text">1 case moved to district control.</p>
                <span className="update-time">09:57 AM</span>
              </div>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

export default UserDashboard;
