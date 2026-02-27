import MapView from "../components/MapView";

const adminPoints = [
  { id: "a-1", lat: 28.633, lng: 77.216, label: "High Priority Cluster" },
  { id: "a-2", lat: 28.612, lng: 77.195, label: "Responder Hub - West Zone" },
  { id: "a-3", lat: 28.602, lng: 77.248, label: "Pending Escalation Case" },
  { id: "a-4", lat: 28.586, lng: 77.214, label: "SLA Breach Alert" },
];

function AdminDashboard({ onLogout }) {
  return (
    <main className="dashboard-page">
      <section className="dashboard-shell">
        <header className="dashboard-topnav">
          <div className="dashboard-topnav-left">
            <span className="badge">NearHelp</span>
            <h2>Admin Dashboard</h2>
          </div>
          <div className="dashboard-topnav-right">
            <span>Admin Control Center</span>
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
              <li>All Regions</li>
              <li>High Severity</li>
              <li>Unassigned Cases</li>
              <li>Responder Offline</li>
              <li>Pending Escalation</li>
            </ul>
          </aside>

          <section className="dashboard-panel live-map-panel">
            <h3>Live Map</h3>
            <div className="map-box">
	              <MapView points={adminPoints} mapHeight={300} showRadius={false} />
            </div>
          </section>

          <aside className="dashboard-panel">
            <h3>Info Panel</h3>
            <div className="info-list">
              <p>Total open incidents</p>
              <p>SLA breach alerts</p>
              <p>Manual override actions</p>
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

export default AdminDashboard;
