import MapView from "../components/MapView";

const userPoints = [
  { id: "u-1", lat: 28.621, lng: 77.219, label: "Accident - Connaught Place" },
  { id: "u-2", lat: 28.608, lng: 77.231, label: "Responder Unit A-12" },
  { id: "u-3", lat: 28.594, lng: 77.208, label: "Fire Alert - Mandi House" },
];

function UserDashboard({ onLogout }) {
  return (
    <main className="dashboard-page">
      <section className="dashboard-shell">
        <header className="dashboard-topnav">
          <div className="dashboard-topnav-left">
            <span className="badge">NearHelp</span>
            <h2>User Dashboard</h2>
          </div>
          <div className="dashboard-topnav-right">
            <span>Active SOS: 08</span>
            <button type="button" className="dashboard-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="dashboard-main-grid">
          <aside className="dashboard-panel">
            <h3>Sidebar</h3>
            <p className="panel-subtitle">Filters</p>
            <ul className="filter-list">
              <li>Accident</li>
              <li>Fire</li>
              <li>Health</li>
              <li>Robbery</li>
              <li>Breakdown</li>
            </ul>
          </aside>

          <section className="dashboard-panel live-map-panel">
            <h3>Live Map</h3>
            <div className="map-box">
	              <MapView points={userPoints} mapHeight={300} />
            </div>
          </section>

          <aside className="dashboard-panel">
            <h3>Info Panel</h3>
            <div className="info-list">
              <p>Incident feed</p>
              <p>Nearest responder ETA</p>
              <p>Escalation status</p>
            </div>
          </aside>
        </section>

        <footer className="dashboard-bottom">
          Bottom: Activity Logs / SMS Status Timeline
        </footer>
      </section>
    </main>
  );
}

export default UserDashboard;
