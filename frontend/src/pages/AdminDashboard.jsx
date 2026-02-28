import { useEffect, useMemo, useState, useCallback } from "react";
import MapView from "../components/MapView";
import { Activity, Clock3, MapPin, ShieldAlert, SlidersHorizontal, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { axiosInstance } from "../api/axios.js";
import { socket } from "../socket.js";

function AdminDashboard({ onLogout }) {
  const [summary, setSummary] = useState({ openCount: 0, resolvedCount: 0, incidents: [] });

  const fetchSummary = useCallback(async () => {
      try {
        const response = await axiosInstance.get("/incidents/admin-summary");
        setSummary(response.data?.data || { openCount: 0, resolvedCount: 0, incidents: [] });
      } catch {
        setSummary({ openCount: 0, resolvedCount: 0, incidents: [] });
      }
    }, []);

  useEffect(() => {
    fetchSummary();
    const timer = setInterval(fetchSummary, 10000);
    return () => clearInterval(timer);
  }, [fetchSummary]);

  /* ── Real-time socket listeners ── */
  useEffect(() => {
    const onUpdate = () => fetchSummary();
    const onClosed = () => fetchSummary();

    socket.on("INCIDENT_UPDATED", onUpdate);
    socket.on("INCIDENT_CLOSED", onClosed);
    socket.on("INCIDENT_RESPONDER", onUpdate);

    return () => {
      socket.off("INCIDENT_UPDATED", onUpdate);
      socket.off("INCIDENT_CLOSED", onClosed);
      socket.off("INCIDENT_RESPONDER", onUpdate);
    };
  }, [fetchSummary]);

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
      <section className="dashboard-shell user-dashboard-shell admin-shell">
        <header className="dashboard-topnav user-topnav admin-topnav">
          <div className="dashboard-topnav-left">
            <span className="badge admin-badge">
              <ShieldAlert size={14} style={{ marginRight: 4 }} />
              <strong>NearHelp Admin</strong>
            </span>
            <div className="dashboard-title-block">
              <h2><strong>Admin Dashboard</strong></h2>
              <p>Control center and live incident supervision</p>
            </div>
          </div>
          <div className="dashboard-topnav-right">
            <span className="sos-pill admin-sos-pill"><strong>Active SOS:</strong> {summary.openCount}</span>
            <span className="muted-meta">Last sync: live</span>
            <button type="button" className="dashboard-btn logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="dashboard-stats-row user-stats-row">
          <article className="stat-card stat-card--incidents">
            <div className="stat-head">
              <p className="stat-label"><strong>Open Critical Cases</strong></p>
              <span className="stat-icon-wrap stat-icon--red">
                <ShieldAlert size={18} />
              </span>
            </div>
            <h4>{summary.openCount}</h4>
            <p className="stat-meta"><strong>Live</strong> open incidents</p>
          </article>
          <article className="stat-card stat-card--responders">
            <div className="stat-head">
              <p className="stat-label"><strong>Responders Active</strong></p>
              <span className="stat-icon-wrap stat-icon--green">
                <Activity size={18} />
              </span>
            </div>
            <h4>{activeResponders}</h4>
            <p className="stat-meta"><strong>Total</strong> active responders</p>
          </article>
          <article className="stat-card stat-card--eta">
            <div className="stat-head">
              <p className="stat-label"><strong>Resolved Cases</strong></p>
              <span className="stat-icon-wrap stat-icon--blue">
                <CheckCircle2 size={18} />
              </span>
            </div>
            <h4>{summary.resolvedCount}</h4>
            <p className="stat-meta"><strong>Resolved</strong> cases so far</p>
          </article>
        </section>

        <section className="dashboard-main-grid user-dashboard-grid">
          <aside className="dashboard-panel filters-panel user-panel glass-card">
            <h3><strong>Filters</strong></h3>
            <p className="panel-caption"><strong>Select</strong> admin focus categories</p>
            <div className="filter-chip-list">
              <span className="filter-chip active"><strong>High Severity</strong></span>
              <span className="filter-chip"><strong>Unassigned</strong></span>
              <span className="filter-chip"><strong>Escalated</strong></span>
              <span className="filter-chip"><strong>Responder Offline</strong></span>
              <span className="filter-chip"><strong>All Regions</strong></span>
            </div>

            <div className="panel-divider" />

            <p className="panel-caption"><strong>Coverage</strong></p>
            <div className="coverage-tags">
              <span>
                <MapPin size={14} /> <strong>City-wide</strong> monitoring
              </span>
              <span>
                <MapPin size={14} /> <strong>Priority zone</strong> tracking
              </span>
              <span>
                <SlidersHorizontal size={14} /> <strong>Escalation first</strong> routing
              </span>
            </div>

            <div className="panel-divider" />

            <p className="panel-caption"><strong>Trust &amp; Verification</strong></p>
            <div className="admin-trust-stats">
              <div className="admin-trust-item admin-trust-warning">
                <AlertTriangle size={14} />
                <span><strong>Misuse flags pending:</strong> {misuseFlags}</span>
              </div>
              <div className="admin-trust-item admin-trust-danger">
                <AlertCircle size={14} />
                <span><strong>Suspension candidates:</strong> {misuseFlags > 2 ? misuseFlags - 2 : 0}</span>
              </div>
            </div>

            <div className="update-list" style={{ marginTop: 12 }}>
              {trustRows.length === 0 ? (
                <div className="update-item ud-empty-state">
                  <AlertCircle size={28} className="ud-empty-icon" />
                  <p className="update-title"><strong>No trust events yet</strong></p>
                  <p className="update-text">Verification entries will appear as incidents and responders join.</p>
                </div>
              ) : (
                trustRows.map((row) => (
                  <div className="update-item admin-trust-row" key={row.id}>
                    <div className="ud-incident-header">
                      <span className={`ud-incident-badge ud-badge--${row.title.toLowerCase()}`}>
                        <strong>{row.title}</strong>
                      </span>
                      <span className={`admin-risk-badge ${row.risk === "Needs review" ? "admin-risk--warning" : "admin-risk--normal"}`}>
                        <strong>{row.risk}</strong>
                      </span>
                    </div>
                    <p className="update-text"><strong>{row.status}</strong></p>
                  </div>
                ))
              )}
            </div>
          </aside>

          <section className="dashboard-panel live-map-panel user-panel glass-card">
            <h3><strong>Live Map</strong></h3>
            <p className="panel-caption"><strong>Control-room view</strong> with live incidents</p>
            <div className="map-box">
              <MapView mapHeight={360} showRadius={false} radiusMeters={50000} />
            </div>
          </section>

          <aside className="dashboard-panel user-panel glass-card ud-updates-panel">
            <h3><strong>Live Updates</strong></h3>
            <div className="update-list">
              {latestIncidents.length === 0 ? (
                <div className="update-item ud-empty-state">
                  <AlertCircle size={32} className="ud-empty-icon" />
                  <p className="update-title"><strong>No incidents yet</strong></p>
                  <p className="update-text">Live updates will appear here as SOS requests arrive.</p>
                </div>
              ) : (
                latestIncidents.map((incident) => (
                  <div className="update-item ud-incident-card" key={incident._id}>
                    <div className="ud-incident-header">
                      <span className={`ud-incident-badge ud-badge--${incident.type || "other"}`}>
                        <strong>{incident.type?.toUpperCase()}</strong>
                      </span>
                      <span className={`admin-status-badge ${incident.status === "open" ? "admin-status--open" : "admin-status--resolved"}`}>
                        <strong>{incident.status?.toUpperCase()}</strong>
                      </span>
                    </div>
                    <p className="update-text"><strong>{incident.description || "No extra details"}</strong></p>
                    <div className="admin-incident-meta">
                      <span className="ud-responder-count">
                        <Activity size={12} /> <strong>{incident.responders?.length || 0}</strong> responder{(incident.responders?.length || 0) !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </section>

        <footer className="ud-footer admin-footer">
          <p><strong>NearHelp Admin</strong> &mdash; Centralized emergency command &amp; oversight</p>
        </footer>
      </section>
    </main>
  );
}

export default AdminDashboard;
