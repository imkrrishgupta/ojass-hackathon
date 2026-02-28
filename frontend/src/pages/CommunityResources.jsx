import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { icons } from "../utils/MarkerIcons.jsx";
import { axiosInstance } from "../api/axios";
import "leaflet/dist/leaflet.css";
import {
  ShieldAlert, ArrowLeft, MapPin, Plus, Heart, Flame, Building2,
  Phone, Shield, Pill, Home, CheckCircle2, AlertCircle, Trash2
} from "lucide-react";

const TYPE_META = {
  aed: { label: "AED (Defibrillator)", icon: <Heart size={14} />, color: "#43a047" },
  fire_extinguisher: { label: "Fire Extinguisher", icon: <Flame size={14} />, color: "#e53935" },
  first_aid_kit: { label: "First Aid Kit", icon: <Plus size={14} />, color: "#e53935" },
  emergency_phone: { label: "Emergency Phone", icon: <Phone size={14} />, color: "#f57c00" },
  hospital: { label: "Hospital / Clinic", icon: <Building2 size={14} />, color: "#1565c0" },
  fire_station: { label: "Fire Station", icon: <Flame size={14} />, color: "#ff5722" },
  police_station: { label: "Police Station", icon: <Shield size={14} />, color: "#283593" },
  pharmacy: { label: "Pharmacy", icon: <Pill size={14} />, color: "#00897b" },
  shelter: { label: "Emergency Shelter", icon: <Home size={14} />, color: "#6d4c41" },
  other: { label: "Other", icon: <MapPin size={14} />, color: "#7b1fa2" },
};

const FALLBACK = [28.6139, 77.209];

function CommunityResources() {
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [filterType, setFilterType] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("aed");
  const [formDesc, setFormDesc] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formHours, setFormHours] = useState("24/7");

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (p) => setMyLocation([p.coords.latitude, p.coords.longitude]),
      () => setMyLocation(FALLBACK)
    );
  }, []);

  const fetchResources = async () => {
    try {
      if (myLocation) {
        const params = new URLSearchParams({
          lat: myLocation[0], lng: myLocation[1], radius: 10000,
        });
        if (filterType) params.set("type", filterType);
        const res = await axiosInstance.get(`/community-resources/nearby?${params}`);
        setResources(res.data?.data || []);
      } else {
        const res = await axiosInstance.get("/community-resources");
        setResources(res.data?.data || []);
      }
    } catch {
      setResources([]);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [myLocation, filterType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formType) {
      setStatus("Name and type are required.");
      return;
    }
    setSubmitting(true);
    setStatus("");
    try {
      const loc = myLocation || FALLBACK;
      await axiosInstance.post("/community-resources", {
        name: formName.trim(),
        type: formType,
        description: formDesc.trim(),
        lat: loc[0],
        lng: loc[1],
        address: formAddress.trim(),
        contactPhone: formPhone.trim(),
        operatingHours: formHours.trim() || "24/7",
      });
      setStatus("Resource added successfully!");
      setFormName(""); setFormDesc(""); setFormAddress(""); setFormPhone(""); setFormHours("24/7");
      setShowForm(false);
      await fetchResources();
    } catch (err) {
      setStatus(err.response?.data?.message || "Failed to add resource.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (resourceId) => {
    try {
      await axiosInstance.delete(`/community-resources/${resourceId}`);
      setResources((prev) => prev.filter((r) => r._id !== resourceId));
    } catch {}
  };

  const mapCenter = myLocation || FALLBACK;

  return (
    <main className="dashboard-page user-dashboard-page">
      <section className="dashboard-shell user-dashboard-shell">
        <header className="dashboard-topnav user-topnav">
          <div className="dashboard-topnav-left">
            <span className="badge">
              <ShieldAlert size={14} style={{ marginRight: 4 }} />
              <strong>NearHelp</strong>
            </span>
            <div className="dashboard-title-block">
              <h2><strong>Community Resources</strong></h2>
              <p>Find AEDs, fire extinguishers &amp; emergency services nearby</p>
            </div>
          </div>
          <div className="dashboard-topnav-right">
            <button type="button" className="dashboard-btn sr-add-btn" onClick={() => setShowForm(!showForm)}>
              <Plus size={14} /> <strong>{showForm ? "Cancel" : "Add Resource"}</strong>
            </button>
            <button type="button" className="dashboard-btn ri-back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={14} /> <strong>Back</strong>
            </button>
          </div>
        </header>

        <section className="dashboard-stats-row user-stats-row">
          <article className="stat-card stat-card--incidents">
            <div className="stat-head">
              <p className="stat-label"><strong>Total Resources</strong></p>
              <span className="stat-icon-wrap stat-icon--blue"><MapPin size={18} /></span>
            </div>
            <h4>{resources.length}</h4>
            <p className="stat-meta"><strong>Mapped</strong> community resources</p>
          </article>
          <article className="stat-card stat-card--responders">
            <div className="stat-head">
              <p className="stat-label"><strong>Verified</strong></p>
              <span className="stat-icon-wrap stat-icon--green"><CheckCircle2 size={18} /></span>
            </div>
            <h4>{resources.filter((r) => r.verified).length}</h4>
            <p className="stat-meta"><strong>Verified</strong> by community</p>
          </article>
          <article className="stat-card stat-card--eta">
            <div className="stat-head">
              <p className="stat-label"><strong>Resource Types</strong></p>
              <span className="stat-icon-wrap stat-icon--red"><Heart size={18} /></span>
            </div>
            <h4>{new Set(resources.map((r) => r.type)).size}</h4>
            <p className="stat-meta"><strong>Different</strong> categories</p>
          </article>
        </section>

        {/* Filter chips */}
        <div className="cr-filter-row">
          <span
            className={`filter-chip${filterType === "" ? " active" : ""}`}
            onClick={() => setFilterType("")}
            role="button"
            tabIndex={0}
          >
            <strong>All</strong>
          </span>
          {Object.entries(TYPE_META).map(([key, meta]) => (
            <span
              key={key}
              className={`filter-chip${filterType === key ? " active" : ""}`}
              onClick={() => setFilterType(key)}
              role="button"
              tabIndex={0}
              style={filterType === key ? { borderColor: meta.color, background: meta.color + "22" } : {}}
            >
              {meta.icon} <strong>{meta.label}</strong>
            </span>
          ))}
        </div>

        <section className="dashboard-main-grid user-dashboard-grid">
          {/* Left: Add form or resource list */}
          <div className="dashboard-panel user-panel glass-card">
            {showForm ? (
              <>
                <h3><strong>Add a Resource</strong></h3>
                <p className="panel-caption"><strong>Pin</strong> a community resource at your location</p>
                <form className="ri-form cr-form" onSubmit={handleSubmit}>
                  <div className="ri-field">
                    <label className="ri-label"><strong>Resource Name</strong></label>
                    <input className="ri-input" placeholder="e.g., Mall AED Station" value={formName} onChange={(e) => setFormName(e.target.value)} />
                  </div>
                  <div className="ri-field">
                    <label className="ri-label"><strong>Type</strong></label>
                    <select className="ri-input ri-select" value={formType} onChange={(e) => setFormType(e.target.value)}>
                      {Object.entries(TYPE_META).map(([k, m]) => (
                        <option key={k} value={k}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ri-field">
                    <label className="ri-label"><strong>Description</strong></label>
                    <textarea className="ri-input ri-textarea" rows={2} placeholder="Optional details..." value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
                  </div>
                  <div className="ri-field">
                    <label className="ri-label"><strong>Address</strong></label>
                    <input className="ri-input" placeholder="Street address..." value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
                  </div>
                  <div className="ri-field">
                    <label className="ri-label"><strong>Contact Phone</strong></label>
                    <input className="ri-input" placeholder="Phone number..." value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
                  </div>
                  <div className="ri-field">
                    <label className="ri-label"><strong>Operating Hours</strong></label>
                    <input className="ri-input" placeholder="e.g., 24/7 or 9AM-5PM" value={formHours} onChange={(e) => setFormHours(e.target.value)} />
                  </div>
                  <button type="submit" className="ri-submit-btn" disabled={submitting}>
                    <MapPin size={16} />
                    <strong>{submitting ? "Adding..." : "Add Resource"}</strong>
                  </button>
                </form>
                {status && <p className="panel-caption ud-status-msg mt-2"><strong>{status}</strong></p>}
              </>
            ) : (
              <>
                <h3><strong>Resource List</strong></h3>
                <p className="panel-caption"><strong>Nearby</strong> community resources</p>
                <div className="update-list cr-resource-list">
                  {resources.length === 0 ? (
                    <div className="update-item ud-empty-state">
                      <MapPin size={32} className="ud-empty-icon" />
                      <p className="update-title"><strong>No resources found</strong></p>
                      <p className="update-text">Add community resources to help your neighborhood!</p>
                    </div>
                  ) : (
                    resources.map((r) => {
                      const meta = TYPE_META[r.type] || TYPE_META.other;
                      return (
                        <div className="update-item cr-resource-card" key={r._id}>
                          <div className="ud-incident-header">
                            <span className="ud-incident-badge" style={{ background: meta.color, color: "#fff" }}>
                              {meta.icon} <strong>{meta.label}</strong>
                            </span>
                            {r.verified && (
                              <span className="cr-verified-badge">
                                <CheckCircle2 size={12} /> <strong>Verified</strong>
                              </span>
                            )}
                            {r.distanceKm !== undefined && (
                              <span className="sr-responder-distance">{r.distanceKm} km</span>
                            )}
                          </div>
                          <p className="update-title"><strong>{r.name}</strong></p>
                          {r.description && <p className="update-text">{r.description}</p>}
                          {r.address && <p className="update-text cr-address"><MapPin size={11} /> {r.address}</p>}
                          {r.contactPhone && <p className="update-text cr-phone"><Phone size={11} /> {r.contactPhone}</p>}
                          <p className="update-text cr-hours">Hours: {r.operatingHours || "24/7"}</p>
                          <button
                            type="button"
                            className="dashboard-btn cr-delete-btn"
                            onClick={() => handleDelete(r._id)}
                          >
                            <Trash2 size={12} /> <strong>Remove</strong>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>

          {/* Center: Map */}
          <section className="dashboard-panel live-map-panel user-panel glass-card">
            <h3><strong>Resource Map</strong></h3>
            <p className="panel-caption"><strong>Community</strong> resources near you</p>
            <div className="map-box">
              {myLocation ? (
                <MapContainer center={mapCenter} zoom={14} style={{ height: 400, width: "100%", borderRadius: 12 }}>
                  <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={myLocation} icon={icons.me}>
                    <Popup><strong>You are here</strong></Popup>
                  </Marker>
                  {resources.map((r) => {
                    const lat = r.lat ?? r.location?.coordinates?.[1];
                    const lng = r.lng ?? r.location?.coordinates?.[0];
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
                    const meta = TYPE_META[r.type] || TYPE_META.other;
                    return (
                      <Marker key={r._id} position={[lat, lng]} icon={icons[r.type] || icons.default}>
                        <Popup>
                          <div style={{ minWidth: 160 }}>
                            <strong style={{ color: meta.color }}>{meta.label}</strong>
                            <p style={{ margin: "4px 0", fontWeight: 600 }}>{r.name}</p>
                            {r.description && <p style={{ fontSize: 12, color: "#555" }}>{r.description}</p>}
                            {r.address && <p style={{ fontSize: 12 }}>{r.address}</p>}
                            {r.contactPhone && <p style={{ fontSize: 12 }}>{r.contactPhone}</p>}
                            {r.distanceKm !== undefined && (
                              <p style={{ fontSize: 13, fontWeight: 700, color: "#1565c0" }}>{r.distanceKm} km away</p>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              ) : (
                <div style={{ height: 400, display: "grid", placeItems: "center" }}>Loading location...</div>
              )}
            </div>
          </section>

          {/* Right: Emergency services */}
          <aside className="dashboard-panel user-panel glass-card ud-updates-panel">
            <h3><strong>Emergency Services</strong></h3>
            <p className="panel-caption"><strong>Hospitals, Fire &amp; Police</strong> nearby</p>
            <div className="update-list">
              {resources.filter((r) => ["hospital", "fire_station", "police_station", "pharmacy"].includes(r.type)).length === 0 ? (
                <div className="update-item ud-empty-state">
                  <AlertCircle size={32} className="ud-empty-icon" />
                  <p className="update-title"><strong>No emergency services mapped</strong></p>
                  <p className="update-text">Add nearby hospitals, fire stations, and police stations to help the community.</p>
                </div>
              ) : (
                resources
                  .filter((r) => ["hospital", "fire_station", "police_station", "pharmacy"].includes(r.type))
                  .map((r) => {
                    const meta = TYPE_META[r.type] || TYPE_META.other;
                    return (
                      <div className="update-item cr-resource-card" key={`es-${r._id}`}>
                        <div className="ud-incident-header">
                          <span className="ud-incident-badge" style={{ background: meta.color, color: "#fff" }}>
                            {meta.icon} <strong>{meta.label}</strong>
                          </span>
                          {r.distanceKm !== undefined && (
                            <span className="sr-responder-distance">{r.distanceKm} km</span>
                          )}
                        </div>
                        <p className="update-title"><strong>{r.name}</strong></p>
                        {r.contactPhone && <p className="update-text"><Phone size={11} /> {r.contactPhone}</p>}
                      </div>
                    );
                  })
              )}
            </div>
          </aside>
        </section>

        <footer className="ud-footer">
          <p><strong>NearHelp</strong> &mdash; Community-powered emergency response</p>
        </footer>
      </section>
    </main>
  );
}

export default CommunityResources;
