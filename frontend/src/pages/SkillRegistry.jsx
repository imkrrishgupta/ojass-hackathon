import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../api/axios";
import { ShieldAlert, ArrowLeft, Award, UserCheck, Search, Plus, X, Star } from "lucide-react";

const SKILL_COLORS = {
  medical: "#e53935",
  rescue: "#ff5722",
  technical: "#1565c0",
  security: "#283593",
  support: "#6d4c41",
};

function SkillRegistry() {
  const navigate = useNavigate();
  const [skillOptions, setSkillOptions] = useState({});
  const [mySkills, setMySkills] = useState([]);
  const [customSkill, setCustomSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [skilledUsers, setSkilledUsers] = useState([]);
  const [searchSkill, setSearchSkill] = useState("");
  const [nearbyResponders, setNearbyResponders] = useState([]);
  const [searchingNearby, setSearchingNearby] = useState(false);

  // Fetch skill options and current user's skills
  useEffect(() => {
    const load = async () => {
      try {
        const [optRes, myRes, allRes] = await Promise.all([
          axiosInstance.get("/skills/options"),
          axiosInstance.get("/skills/my"),
          axiosInstance.get("/skills/all"),
        ]);
        setSkillOptions(optRes.data?.data || {});
        setMySkills(myRes.data?.data?.skills || []);
        setSkilledUsers(allRes.data?.data || []);
      } catch {
        setStatus("Failed to load skills data.");
      }
    };
    load();
  }, []);

  const toggleSkill = (skill) => {
    setMySkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const addCustomSkill = () => {
    const trimmed = customSkill.trim();
    if (trimmed && !mySkills.includes(trimmed)) {
      setMySkills((prev) => [...prev, trimmed]);
      setCustomSkill("");
    }
  };

  const saveSkills = async () => {
    setSaving(true);
    setStatus("");
    try {
      const res = await axiosInstance.put("/skills/my", { skills: mySkills });
      setMySkills(res.data?.data?.skills || mySkills);
      setStatus("Skills saved successfully!");
    } catch (err) {
      setStatus(err.response?.data?.message || "Failed to save skills.");
    } finally {
      setSaving(false);
    }
  };

  const searchNearby = async () => {
    setSearchingNearby(true);
    try {
      const pos = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => resolve({ lat: 28.6139, lng: 77.209 })
        );
      });
      const params = new URLSearchParams({ lat: pos.lat, lng: pos.lng, radius: 10000 });
      if (searchSkill.trim()) params.set("skill", searchSkill.trim());
      const res = await axiosInstance.get(`/skills/nearby?${params}`);
      setNearbyResponders(res.data?.data || []);
    } catch {
      setNearbyResponders([]);
    } finally {
      setSearchingNearby(false);
    }
  };

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
              <h2><strong>Skill Registry</strong></h2>
              <p>Register your skills &amp; find skilled responders</p>
            </div>
          </div>
          <div className="dashboard-topnav-right">
            <button type="button" className="dashboard-btn ri-back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={14} /> <strong>Back</strong>
            </button>
          </div>
        </header>

        <section className="dashboard-stats-row user-stats-row">
          <article className="stat-card stat-card--incidents">
            <div className="stat-head">
              <p className="stat-label"><strong>Your Skills</strong></p>
              <span className="stat-icon-wrap stat-icon--blue"><Award size={18} /></span>
            </div>
            <h4>{mySkills.length}</h4>
            <p className="stat-meta"><strong>Registered</strong> skills</p>
          </article>
          <article className="stat-card stat-card--responders">
            <div className="stat-head">
              <p className="stat-label"><strong>Community Responders</strong></p>
              <span className="stat-icon-wrap stat-icon--green"><UserCheck size={18} /></span>
            </div>
            <h4>{skilledUsers.length}</h4>
            <p className="stat-meta"><strong>Skilled</strong> volunteers registered</p>
          </article>
          <article className="stat-card stat-card--eta">
            <div className="stat-head">
              <p className="stat-label"><strong>Nearby Skilled</strong></p>
              <span className="stat-icon-wrap stat-icon--red"><Search size={18} /></span>
            </div>
            <h4>{nearbyResponders.length}</h4>
            <p className="stat-meta"><strong>Found</strong> near you</p>
          </article>
        </section>

        <section className="dashboard-main-grid user-dashboard-grid">
          {/* Left: My Skills */}
          <div className="dashboard-panel user-panel glass-card">
            <h3><strong>My Skills</strong></h3>
            <p className="panel-caption"><strong>Select</strong> your skills or add custom ones</p>

            {Object.entries(skillOptions).map(([category, skills]) => (
              <div key={category} className="sr-category-block">
                <p className="sr-category-title" style={{ color: SKILL_COLORS[category] || "#333" }}>
                  <strong>{category.charAt(0).toUpperCase() + category.slice(1)}</strong>
                </p>
                <div className="filter-chip-list">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className={`filter-chip${mySkills.includes(skill) ? " active" : ""}`}
                      onClick={() => toggleSkill(skill)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && toggleSkill(skill)}
                    >
                      <strong>{skill}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}

            <div className="sr-custom-skill-row">
              <input
                className="ri-input sr-custom-input"
                placeholder="Add custom skill..."
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomSkill()}
              />
              <button type="button" className="dashboard-btn sr-add-btn" onClick={addCustomSkill}>
                <Plus size={14} /> <strong>Add</strong>
              </button>
            </div>

            {mySkills.length > 0 && (
              <div className="sr-my-skills-list">
                <p className="panel-caption"><strong>Your selected skills:</strong></p>
                <div className="filter-chip-list">
                  {mySkills.map((s) => (
                    <span key={s} className="filter-chip active sr-skill-tag">
                      <strong>{s}</strong>
                      <X size={12} className="sr-remove-icon" onClick={() => toggleSkill(s)} />
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              className="ri-submit-btn sr-save-btn"
              onClick={saveSkills}
              disabled={saving}
            >
              <Award size={16} />
              <strong>{saving ? "Saving..." : "Save My Skills"}</strong>
            </button>

            {status && (
              <p className="panel-caption ud-status-msg mt-2"><strong>{status}</strong></p>
            )}
          </div>

          {/* Middle: Find Nearby Skilled Responders */}
          <div className="dashboard-panel live-map-panel user-panel glass-card">
            <h3><strong>Find Skilled Responders</strong></h3>
            <p className="panel-caption"><strong>Search</strong> for skilled people near you</p>

            <div className="sr-search-row">
              <input
                className="ri-input sr-search-input"
                placeholder="Search by skill (e.g., CPR, Doctor)..."
                value={searchSkill}
                onChange={(e) => setSearchSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchNearby()}
              />
              <button
                type="button"
                className="dashboard-btn sr-search-btn"
                onClick={searchNearby}
                disabled={searchingNearby}
              >
                <Search size={14} />
                <strong>{searchingNearby ? "Searching..." : "Search Nearby"}</strong>
              </button>
            </div>

            <div className="sr-responder-list">
              {nearbyResponders.length === 0 ? (
                <div className="update-item ud-empty-state">
                  <Search size={32} className="ud-empty-icon" />
                  <p className="update-title"><strong>No nearby responders yet</strong></p>
                  <p className="update-text">Click &quot;Search Nearby&quot; to find skilled people around you.</p>
                </div>
              ) : (
                nearbyResponders.map((r) => (
                  <div className="sr-responder-card" key={r._id}>
                    <div className="sr-responder-header">
                      <strong className="sr-responder-name">{r.fullName}</strong>
                      <span className="sr-responder-distance">{r.distanceKm} km</span>
                    </div>
                    <div className="filter-chip-list sr-responder-skills">
                      {(r.skills || []).map((s) => (
                        <span key={s} className="filter-chip active sr-skill-mini">{s}</span>
                      ))}
                    </div>
                    <div className="sr-responder-meta">
                      <span><Star size={12} /> <strong>Rating:</strong> {r.volunteerRating}/100</span>
                      <span><Award size={12} /> <strong>Trust:</strong> {r.trustScore}/10</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Leaderboard */}
          <aside className="dashboard-panel user-panel glass-card ud-updates-panel">
            <h3><strong>Skilled Volunteers</strong></h3>
            <p className="panel-caption"><strong>Community</strong> leaderboard</p>
            <div className="update-list">
              {skilledUsers.length === 0 ? (
                <div className="update-item ud-empty-state">
                  <UserCheck size={32} className="ud-empty-icon" />
                  <p className="update-title"><strong>No skilled volunteers yet</strong></p>
                  <p className="update-text">Be the first to register your skills!</p>
                </div>
              ) : (
                skilledUsers.slice(0, 10).map((u, idx) => (
                  <div className="update-item sr-leaderboard-row" key={u._id}>
                    <div className="ud-incident-header">
                      <span className="sr-rank">#{idx + 1}</span>
                      <strong>{u.fullName}</strong>
                      <span className="sr-lb-rating">{u.volunteerRating}/100</span>
                    </div>
                    <div className="filter-chip-list sr-lb-skills">
                      {(u.skills || []).slice(0, 4).map((s) => (
                        <span key={s} className="filter-chip sr-skill-mini">{s}</span>
                      ))}
                      {(u.skills || []).length > 4 && (
                        <span className="filter-chip sr-skill-mini">+{u.skills.length - 4}</span>
                      )}
                    </div>
                  </div>
                ))
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

export default SkillRegistry;
