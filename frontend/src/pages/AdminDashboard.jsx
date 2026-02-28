import { useEffect, useMemo, useState, useCallback } from "react";
import MapView from "../components/MapView";
import {
  Activity,
  Clock3,
  MapPin,
  ShieldAlert,
  SlidersHorizontal,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  Ban,
  UserCheck,
  RefreshCw,
  Shield,
  Flame,
  HeartPulse,
  Car,
  Package,
  Bell,
} from "lucide-react";
import { axiosInstance } from "../api/axios.js";
import { socket } from "../socket.js";

/* ── helpers ── */
const timeAgo = (date) => {
  if (!date) return "";
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const sevLabel = (s) =>
  s === "high" ? "High" : s === "medium" ? "Medium" : "Low";

const typeIcon = (t) => {
  const map = { Fire: Flame, Health: HeartPulse, Road: Car, Theft: Shield, Other: Package };
  return map[t] || Package;
};

const INCIDENT_TYPES = ["Fire", "Health", "Road", "Theft", "Other"];
const SEVERITY_LEVELS = ["high", "medium", "low"];
const STATUS_OPTIONS = ["all", "open", "resolved"];

const TAB_INCIDENTS = "incidents";
const TAB_USERS = "users";

function AdminDashboard({ onLogout }) {
  /* ── State ── */
  const [summary, setSummary] = useState({
    openCount: 0,
    resolvedCount: 0,
    totalCount: 0,
    incidents: [],
  });
  const [userStats, setUserStats] = useState({ totalUsers: 0, suspendedUsers: 0, activeUsers: 0 });
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Filters
  const [typeFilters, setTypeFilters] = useState([]);
  const [sevFilters, setSevFilters] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // UI
  const [expandedIncident, setExpandedIncident] = useState(null);
  const [activeTab, setActiveTab] = useState(TAB_INCIDENTS);
  const [actionLoading, setActionLoading] = useState("");
  const [lastSync, setLastSync] = useState(null);
  const [userSearch, setUserSearch] = useState("");

  /* ── Data fetching ── */
  const fetchSummary = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/incidents/admin-summary");
      const data = response.data?.data || {};
      setSummary({
        openCount: data.openCount || 0,
        resolvedCount: data.resolvedCount || 0,
        totalCount: data.totalCount || 0,
        incidents: data.incidents || [],
      });
      setLastSync(new Date());
    } catch {
      setSummary({ openCount: 0, resolvedCount: 0, totalCount: 0, incidents: [] });
    }
  }, []);

  const fetchUserStats = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/users/admin/stats");
      setUserStats(response.data?.data || { totalUsers: 0, suspendedUsers: 0, activeUsers: 0 });
    } catch {
      /* ignore */
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const response = await axiosInstance.get("/users/admin/all");
      setUsers(response.data?.data || []);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchUserStats();
    const timer = setInterval(() => {
      fetchSummary();
      fetchUserStats();
    }, 10000);
    return () => clearInterval(timer);
  }, [fetchSummary, fetchUserStats]);

  // Load users when switching to users tab
  useEffect(() => {
    if (activeTab === TAB_USERS && users.length === 0) fetchUsers();
  }, [activeTab, users.length, fetchUsers]);

  /* ── Real-time socket listeners ── */
  useEffect(() => {
    const refresh = () => {
      fetchSummary();
      fetchUserStats();
    };

    socket.on("INCIDENT_UPDATED", refresh);
    socket.on("INCIDENT_CLOSED", refresh);
    socket.on("INCIDENT_RESPONDER", refresh);

    return () => {
      socket.off("INCIDENT_UPDATED", refresh);
      socket.off("INCIDENT_CLOSED", refresh);
      socket.off("INCIDENT_RESPONDER", refresh);
    };
  }, [fetchSummary, fetchUserStats]);

  /* ── Derived data ── */
  const activeResponders = useMemo(
    () =>
      summary.incidents.reduce(
        (total, inc) => total + (inc.responders?.length || 0),
        0
      ),
    [summary.incidents]
  );

  const filteredIncidents = useMemo(() => {
    let list = summary.incidents;

    if (statusFilter !== "all") {
      list = list.filter((inc) => inc.status === statusFilter);
    }

    if (typeFilters.length > 0) {
      list = list.filter((inc) => typeFilters.includes(inc.type));
    }

    if (sevFilters.length > 0) {
      list = list.filter((inc) => sevFilters.includes(inc.severity));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (inc) =>
          (inc.type || "").toLowerCase().includes(q) ||
          (inc.description || "").toLowerCase().includes(q) ||
          (inc.createdBy?.fullName || "").toLowerCase().includes(q) ||
          (inc.createdBy?.phone || "").includes(q) ||
          (inc._id || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [summary.incidents, statusFilter, typeFilters, sevFilters, searchQuery]);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        (u.fullName || "").toLowerCase().includes(q) ||
        (u.phone || "").includes(q) ||
        (u._id || "").toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const misuseFlags = useMemo(
    () =>
      summary.incidents.filter(
        (inc) =>
          inc.status === "open" && (inc.responders?.length || 0) === 0
      ).length,
    [summary.incidents]
  );

  /* ── Actions ── */
  const handleResolve = async (incidentId) => {
    setActionLoading(incidentId);
    try {
      await axiosInstance.post(`/incidents/${incidentId}/resolve`);
      fetchSummary();
    } catch (err) {
      console.error("Failed to resolve:", err);
    } finally {
      setActionLoading("");
    }
  };

  const handleToggleSuspend = async (userId) => {
    setActionLoading(userId);
    try {
      const res = await axiosInstance.patch(`/users/admin/${userId}/toggle-suspend`);
      const updated = res.data?.data;
      if (updated) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === updated._id ? { ...u, isSuspended: updated.isSuspended } : u
          )
        );
        fetchUserStats();
      }
    } catch (err) {
      console.error("Failed to toggle suspend:", err);
    } finally {
      setActionLoading("");
    }
  };

  const handleNotifyVolunteers = async (incidentId) => {
    setActionLoading(`notify-${incidentId}`);
    try {
      await axiosInstance.post(`/incidents/${incidentId}/notify-suggested`);
    } catch (err) {
      console.error("Failed to notify:", err);
    } finally {
      setActionLoading("");
    }
  };

  /* ── Filter toggles ── */
  const toggleType = (t) =>
    setTypeFilters((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );

  const toggleSev = (s) =>
    setSevFilters((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  /* ── Render ── */
  return (
    <main className="dashboard-page user-dashboard-page">
      <section className="dashboard-shell user-dashboard-shell admin-shell">
        {/* ── Top Navigation ── */}
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
            <span className="sos-pill admin-sos-pill">
              <strong>Active SOS:</strong> {summary.openCount}
            </span>
            <span className="muted-meta">
              Last sync: {lastSync ? timeAgo(lastSync) : "—"}
            </span>
            <button
              type="button"
              className="dashboard-btn logout-btn"
              onClick={() => {
                fetchSummary();
                fetchUserStats();
                if (activeTab === TAB_USERS) fetchUsers();
              }}
              style={{ marginRight: 4 }}
              title="Refresh data"
            >
              <RefreshCw size={14} />
            </button>
            <button type="button" className="dashboard-btn logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>

        {/* ── Stats Row ── */}
        <section className="dashboard-stats-row user-stats-row">
          <article className="stat-card stat-card--incidents">
            <div className="stat-head">
              <p className="stat-label"><strong>Open Cases</strong></p>
              <span className="stat-icon-wrap stat-icon--red">
                <ShieldAlert size={18} />
              </span>
            </div>
            <h4>{summary.openCount}</h4>
            <p className="stat-meta"><strong>Live</strong> open incidents</p>
          </article>

          <article className="stat-card stat-card--responders">
            <div className="stat-head">
              <p className="stat-label"><strong>Responders</strong></p>
              <span className="stat-icon-wrap stat-icon--green">
                <Activity size={18} />
              </span>
            </div>
            <h4>{activeResponders}</h4>
            <p className="stat-meta"><strong>Total</strong> active responders</p>
          </article>

          <article className="stat-card stat-card--eta">
            <div className="stat-head">
              <p className="stat-label"><strong>Resolved</strong></p>
              <span className="stat-icon-wrap stat-icon--blue">
                <CheckCircle2 size={18} />
              </span>
            </div>
            <h4>{summary.resolvedCount}</h4>
            <p className="stat-meta"><strong>Resolved</strong> cases total</p>
          </article>

          <article className="stat-card" style={{ borderLeft: "3px solid #a78bfa" }}>
            <div className="stat-head">
              <p className="stat-label"><strong>Users</strong></p>
              <span className="stat-icon-wrap" style={{ background: "rgba(139,92,246,0.12)", color: "#8b5cf6" }}>
                <Users size={18} />
              </span>
            </div>
            <h4>{userStats.totalUsers}</h4>
            <p className="stat-meta">
              <strong>{userStats.activeUsers}</strong> active &middot; <strong>{userStats.suspendedUsers}</strong> suspended
            </p>
          </article>
        </section>

        {/* ── Tab Switcher ── */}
        <div className="admin-tab-bar">
          <button
            className={`admin-tab-btn ${activeTab === TAB_INCIDENTS ? "admin-tab-btn--active" : ""}`}
            onClick={() => setActiveTab(TAB_INCIDENTS)}
          >
            <ShieldAlert size={14} /> Incidents
          </button>
          <button
            className={`admin-tab-btn ${activeTab === TAB_USERS ? "admin-tab-btn--active" : ""}`}
            onClick={() => setActiveTab(TAB_USERS)}
          >
            <Users size={14} /> Users
          </button>
        </div>

        {/* ── INCIDENTS TAB ── */}
        {activeTab === TAB_INCIDENTS && (
          <section className="dashboard-main-grid user-dashboard-grid">
            {/* ─ Filters panel ─ */}
            <aside className="dashboard-panel filters-panel user-panel glass-card">
              <h3><strong>Filters</strong></h3>
              <p className="panel-caption"><strong>Filter</strong> incidents by criteria</p>

              {/* Search */}
              <div className="admin-search-box">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search incidents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Status filter */}
              <p className="panel-caption" style={{ marginTop: 12 }}><strong>Status</strong></p>
              <div className="filter-chip-list">
                {STATUS_OPTIONS.map((s) => (
                  <span
                    key={s}
                    className={`filter-chip ${statusFilter === s ? "active" : ""}`}
                    onClick={() => setStatusFilter(s)}
                  >
                    <strong>{s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}</strong>
                  </span>
                ))}
              </div>

              {/* Type filters */}
              <p className="panel-caption" style={{ marginTop: 12 }}><strong>Incident Type</strong></p>
              <div className="filter-chip-list">
                {INCIDENT_TYPES.map((t) => {
                  const Icon = typeIcon(t);
                  return (
                    <span
                      key={t}
                      className={`filter-chip ${typeFilters.includes(t) ? "active" : ""}`}
                      onClick={() => toggleType(t)}
                    >
                      <Icon size={12} style={{ marginRight: 3 }} />
                      <strong>{t}</strong>
                    </span>
                  );
                })}
              </div>

              {/* Severity filters */}
              <p className="panel-caption" style={{ marginTop: 12 }}><strong>Severity</strong></p>
              <div className="filter-chip-list">
                {SEVERITY_LEVELS.map((s) => (
                  <span
                    key={s}
                    className={`filter-chip ${sevFilters.includes(s) ? "active" : ""}`}
                    onClick={() => toggleSev(s)}
                  >
                    <strong>{sevLabel(s)}</strong>
                  </span>
                ))}
              </div>

              <div className="panel-divider" />

              {/* Trust & Verification summary */}
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

              <div className="panel-divider" />

              <p className="panel-caption"><strong>Coverage</strong></p>
              <div className="coverage-tags">
                <span>
                  <MapPin size={14} /> <strong>City-wide</strong> monitoring
                </span>
                <span>
                  <SlidersHorizontal size={14} /> <strong>Escalation first</strong> routing
                </span>
              </div>
            </aside>

            {/* ─ Live Map ─ */}
            <section className="dashboard-panel live-map-panel user-panel glass-card">
              <h3><strong>Live Map</strong></h3>
              <p className="panel-caption"><strong>Control-room view</strong> with live incidents</p>
              <div className="map-box">
                <MapView mapHeight={360} showRadius={false} radiusMeters={50000} />
              </div>
            </section>

            {/* ─ Incident List ─ */}
            <aside className="dashboard-panel user-panel glass-card ud-updates-panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3><strong>Incidents ({filteredIncidents.length})</strong></h3>
              </div>

              <div className="update-list admin-incident-list">
                {filteredIncidents.length === 0 ? (
                  <div className="update-item ud-empty-state">
                    <AlertCircle size={32} className="ud-empty-icon" />
                    <p className="update-title"><strong>No incidents match filters</strong></p>
                    <p className="update-text">Adjust filters or wait for new incidents.</p>
                  </div>
                ) : (
                  filteredIncidents.map((incident) => {
                    const isExpanded = expandedIncident === incident._id;
                    const Icon = typeIcon(incident.type);
                    const reporter = incident.createdBy;
                    const responders = incident.responders || [];
                    const hasAutoDispatch =
                      incident.autoDispatch?.status &&
                      incident.autoDispatch.status !== "none";

                    return (
                      <div
                        className={`update-item ud-incident-card admin-incident-card ${isExpanded ? "admin-incident-card--expanded" : ""}`}
                        key={incident._id}
                      >
                        {/* Header row */}
                        <div
                          className="ud-incident-header"
                          style={{ cursor: "pointer" }}
                          onClick={() =>
                            setExpandedIncident(isExpanded ? null : incident._id)
                          }
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                              className={`ud-incident-badge ud-badge--${(incident.type || "other").toLowerCase()}`}
                            >
                              <Icon size={12} style={{ marginRight: 3 }} />
                              <strong>{incident.type?.toUpperCase()}</strong>
                            </span>
                            <span
                              className={`admin-risk-badge admin-risk--${incident.severity === "high" ? "warning" : "normal"}`}
                            >
                              <strong>{sevLabel(incident.severity)}</strong>
                            </span>
                            <span
                              className={`admin-status-badge ${incident.status === "open" ? "admin-status--open" : "admin-status--resolved"}`}
                            >
                              <strong>{incident.status?.toUpperCase()}</strong>
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span className="admin-time-badge">
                              <Clock3 size={10} /> {timeAgo(incident.createdAt)}
                            </span>
                            {isExpanded ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <p className="update-text" style={{ margin: "6px 0" }}>
                          <strong>{incident.description || "No description provided"}</strong>
                        </p>

                        {/* Meta row */}
                        <div className="admin-incident-meta">
                          <span className="ud-responder-count">
                            <Activity size={12} /> <strong>{responders.length}</strong> responder{responders.length !== 1 ? "s" : ""}
                          </span>
                          {reporter && (
                            <span className="admin-reporter-info">
                              <Users size={12} /> {reporter.fullName || reporter.phone || "Unknown"}
                            </span>
                          )}
                          {hasAutoDispatch && (
                            <span className="admin-dispatch-badge">
                              <Bell size={10} /> {incident.autoDispatch.volunteerName || "Auto-dispatched"}
                            </span>
                          )}
                        </div>

                        {/* ── Expanded Detail ── */}
                        {isExpanded && (
                          <div className="admin-incident-detail">
                            {/* Reporter info */}
                            {reporter && (
                              <div className="admin-detail-section">
                                <p className="admin-detail-label">Reporter</p>
                                <p>
                                  <strong>{reporter.fullName}</strong> &middot; {reporter.phone}
                                  {reporter.trustScore != null && (
                                    <span className="admin-trust-score"> Trust: {reporter.trustScore}/10</span>
                                  )}
                                </p>
                              </div>
                            )}

                            {/* Responders */}
                            {responders.length > 0 && (
                              <div className="admin-detail-section">
                                <p className="admin-detail-label">Responders</p>
                                {responders.map((r, idx) => {
                                  const user = r.userId;
                                  return (
                                    <p key={r._id || idx} className="admin-responder-line">
                                      <UserCheck size={12} />
                                      <strong>{user?.fullName || "Unknown"}</strong>
                                      {user?.phone && <> &middot; {user.phone}</>}
                                      <span className="admin-join-time">Joined {timeAgo(r.joinedAt)}</span>
                                    </p>
                                  );
                                })}
                              </div>
                            )}

                            {/* Auto-dispatch info */}
                            {hasAutoDispatch && (
                              <div className="admin-detail-section">
                                <p className="admin-detail-label">Auto-Dispatch</p>
                                <p>
                                  <strong>{incident.autoDispatch.volunteerName}</strong>
                                  {incident.autoDispatch.volunteerPhone && <> &middot; {incident.autoDispatch.volunteerPhone}</>}
                                  {incident.autoDispatch.distanceKm != null && <> &middot; {incident.autoDispatch.distanceKm.toFixed(2)} km</>}
                                  {incident.autoDispatch.rating != null && <> &middot; Rating: {incident.autoDispatch.rating}</>}
                                </p>
                                <p className="admin-dispatch-reason">{incident.autoDispatch.reason}</p>
                              </div>
                            )}

                            {/* Location */}
                            {incident.location?.coordinates && (
                              <div className="admin-detail-section">
                                <p className="admin-detail-label">Location</p>
                                <p>
                                  <MapPin size={12} />
                                  {" "}Lat: {incident.location.coordinates[1]?.toFixed(5)}, Lng: {incident.location.coordinates[0]?.toFixed(5)}
                                  {" "}&middot; Radius: {incident.radiusMeters}m
                                </p>
                              </div>
                            )}

                            {/* Resolved info */}
                            {incident.status === "resolved" && incident.resolvedAt && (
                              <div className="admin-detail-section">
                                <p className="admin-detail-label">Resolved</p>
                                <p>
                                  <CheckCircle2 size={12} /> {timeAgo(incident.resolvedAt)}
                                  {incident.resolvedBy && (
                                    <> by <strong>{incident.resolvedBy.fullName || incident.resolvedBy.phone || "Unknown"}</strong></>
                                  )}
                                </p>
                              </div>
                            )}

                            {/* ID */}
                            <div className="admin-detail-section">
                              <p className="admin-detail-label">ID</p>
                              <p style={{ fontSize: 11, opacity: 0.6, fontFamily: "monospace" }}>{incident._id}</p>
                            </div>

                            {/* Actions */}
                            {incident.status === "open" && (
                              <div className="admin-action-row">
                                <button
                                  className="admin-action-btn admin-action-resolve"
                                  disabled={actionLoading === incident._id}
                                  onClick={() => handleResolve(incident._id)}
                                >
                                  {actionLoading === incident._id ? (
                                    <RefreshCw size={12} className="spinning" />
                                  ) : (
                                    <CheckCircle2 size={12} />
                                  )}
                                  Resolve
                                </button>
                                <button
                                  className="admin-action-btn admin-action-notify"
                                  disabled={actionLoading === `notify-${incident._id}`}
                                  onClick={() => handleNotifyVolunteers(incident._id)}
                                >
                                  {actionLoading === `notify-${incident._id}` ? (
                                    <RefreshCw size={12} className="spinning" />
                                  ) : (
                                    <Bell size={12} />
                                  )}
                                  Notify Volunteers
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </aside>
          </section>
        )}

        {/* ── USERS TAB ── */}
        {activeTab === TAB_USERS && (
          <section className="admin-users-section">
            <div className="admin-users-header">
              <h3><strong>User Management ({filteredUsers.length})</strong></h3>
              <div className="admin-search-box" style={{ maxWidth: 300 }}>
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <button
                className="admin-action-btn admin-action-resolve"
                onClick={fetchUsers}
                disabled={usersLoading}
              >
                <RefreshCw size={12} className={usersLoading ? "spinning" : ""} /> Refresh
              </button>
            </div>

            <div className="admin-users-table-wrap">
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Phone</th>
                    <th>Trust</th>
                    <th>Rating</th>
                    <th>Skills</th>
                    <th>Responses</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: 24, opacity: 0.5 }}>
                        {usersLoading ? "Loading users..." : "No users found"}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user._id} className={user.isSuspended ? "admin-user-suspended" : ""}>
                        <td>
                          <div className="admin-user-cell">
                            <div className="admin-user-avatar" style={{ backgroundImage: user.avatar ? `url(${user.avatar})` : undefined }}>
                              {!user.avatar && (user.fullName?.[0] || "?")}
                            </div>
                            <div>
                              <strong>{user.fullName}</strong>
                              {user.role === "admin" && (
                                <span className="admin-role-badge">Admin</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>{user.phone}</td>
                        <td>
                          <span className={`admin-trust-pill ${user.trustScore < 3 ? "admin-trust-pill--low" : user.trustScore >= 7 ? "admin-trust-pill--high" : ""}`}>
                            {user.trustScore?.toFixed(1)}/10
                          </span>
                        </td>
                        <td>{user.volunteerRating ?? "—"}/100</td>
                        <td>
                          <div className="admin-skills-cell">
                            {(user.skills || []).slice(0, 3).map((s) => (
                              <span key={s} className="admin-skill-chip">{s}</span>
                            ))}
                            {(user.skills || []).length > 3 && (
                              <span className="admin-skill-chip">+{user.skills.length - 3}</span>
                            )}
                            {(user.skills || []).length === 0 && <span style={{ opacity: 0.4 }}>None</span>}
                          </div>
                        </td>
                        <td>
                          {user.successfulResponses || 0}/{user.totalResponses || 0}
                          {(user.falseAlertCount || 0) > 0 && (
                            <span className="admin-false-alert"> ({user.falseAlertCount} false)</span>
                          )}
                        </td>
                        <td>
                          {user.isSuspended ? (
                            <span className="admin-status-badge admin-status--open">
                              <strong>SUSPENDED</strong>
                            </span>
                          ) : (
                            <span className="admin-status-badge admin-status--resolved">
                              <strong>ACTIVE</strong>
                            </span>
                          )}
                        </td>
                        <td>
                          {user.role !== "admin" && (
                            <button
                              className={`admin-action-btn ${user.isSuspended ? "admin-action-resolve" : "admin-action-danger"}`}
                              disabled={actionLoading === user._id}
                              onClick={() => handleToggleSuspend(user._id)}
                            >
                              {actionLoading === user._id ? (
                                <RefreshCw size={12} className="spinning" />
                              ) : user.isSuspended ? (
                                <UserCheck size={12} />
                              ) : (
                                <Ban size={12} />
                              )}
                              {user.isSuspended ? "Unsuspend" : "Suspend"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <footer className="ud-footer admin-footer">
          <p><strong>NearHelp Admin</strong> &mdash; Centralized emergency command &amp; oversight</p>
        </footer>
      </section>
    </main>
  );
}

export default AdminDashboard;
