import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MapView from "../components/MapView";
import { Activity, Clock3, ShieldAlert, AlertCircle } from "lucide-react";
import { axiosInstance } from "../api/axios.js";

function UserDashboard({ onLogout }) {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [loadingId, setLoadingId] = useState("");
  const [activeChatIncident, setActiveChatIncident] = useState(null);
  const [assessmentType, setAssessmentType] = useState("health");
  const [assessmentQuestions, setAssessmentQuestions] = useState([]);
  const [assessmentAnswers, setAssessmentAnswers] = useState({});
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentStatus, setAssessmentStatus] = useState("");
  const [bestVolunteerByIncident, setBestVolunteerByIncident] = useState({});
  const [latestIncidentSuggestion, setLatestIncidentSuggestion] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);

  const FILTER_TYPES = [
    { label: "Accident", type: "accident" },
    { label: "Fire", type: "fire" },
    { label: "Health", type: "health" },
    { label: "Robbery", type: "robbery" },
    { label: "Breakdown", type: "breakdown" },
  ];

  const toggleFilter = (type) => {
    setActiveFilters((prev) =>
      prev.includes(type) ? prev.filter((f) => f !== type) : [...prev, type]
    );
  };

  const fetchOpenIncidents = async () => {
    try {
      const response = await axiosInstance.get("/incidents/open");
      setIncidents(response.data?.data || []);
    } catch {
      setIncidents([]);
    }
  };

  useEffect(() => {
    fetchOpenIncidents();
    const timer = setInterval(fetchOpenIncidents, 10000);
    return () => clearInterval(timer);
  }, []);

  const fetchAssessmentQuestions = async (type = assessmentType) => {
    setAssessmentLoading(true);
    setAssessmentStatus("");
    try {
      const rawUser = localStorage.getItem("user");
      const parsedUser = rawUser ? JSON.parse(rawUser) : null;
      const phoneQuery = parsedUser?.phone ? `&volunteerPhone=${encodeURIComponent(parsedUser.phone)}` : "";
      const response = await axiosInstance.get(
        `/assistant/volunteer-questions?incidentType=${type}${phoneQuery}`
      );
      const questions = response.data?.data?.questions || [];
      setAssessmentQuestions(questions);
      const initialAnswers = {};
      questions.forEach((item) => {
        initialAnswers[item.id] = "";
      });
      setAssessmentAnswers(initialAnswers);
    } catch {
      setAssessmentQuestions([]);
      setAssessmentStatus("Could not load AI assessment questions.");
    } finally {
      setAssessmentLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessmentQuestions("health");
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("latestIncidentSuggestions");
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.suggestedVolunteers)) return;
      setLatestIncidentSuggestion(parsed);
    } catch {
      setLatestIncidentSuggestion(null);
    }
  }, []);

  const handleRespond = async (incidentId) => {
    setLoadingId(incidentId);
    try {
      await axiosInstance.post(`/incidents/${incidentId}/respond`);
      setActiveChatIncident(incidentId);
      await fetchOpenIncidents();
    } catch {
    } finally {
      setLoadingId("");
    }
  };

  const handleResolve = async (incidentId) => {
    setLoadingId(incidentId);
    try {
      await axiosInstance.post(`/incidents/${incidentId}/resolve`);
      await fetchOpenIncidents();
    } catch {
    } finally {
      setLoadingId("");
    }
  };

  const submitAssessment = async () => {
    if (!assessmentQuestions.length) return;

    const allAnswered = assessmentQuestions.every(
      (item) => String(assessmentAnswers[item.id] || "").trim().length > 0
    );

    if (!allAnswered) {
      setAssessmentStatus("Please answer all AI questions before submitting.");
      return;
    }

    setAssessmentLoading(true);
    setAssessmentStatus("");
    try {
      const rawUser = localStorage.getItem("user");
      const parsedUser = rawUser ? JSON.parse(rawUser) : null;

      const answers = assessmentQuestions.map((question) => ({
        questionId: question.id,
        question: question.question,
        answerText: assessmentAnswers[question.id] || "",
      }));

      const response = await axiosInstance.post("/assistant/rate-volunteer", {
        incidentType: assessmentType,
        answers,
        volunteerPhone: parsedUser?.phone,
      });

      setAssessmentResult(response.data?.data || null);
      setAssessmentStatus("AI rating generated successfully.");
    } catch (error) {
      setAssessmentResult(null);
      setAssessmentStatus(
        error.response?.data?.message || "AI rating failed. Please login again and retry."
      );
    } finally {
      setAssessmentLoading(false);
    }
  };

  const suggestBestVolunteer = async (incidentId) => {
    setLoadingId(incidentId);
    try {
      const response = await axiosInstance.get(`/incidents/${incidentId}/best-volunteer`);
      const recommendation = response.data?.data?.recommendedVolunteer || null;
      setBestVolunteerByIncident((prev) => ({
        ...prev,
        [incidentId]: recommendation,
      }));
    } catch {
      setBestVolunteerByIncident((prev) => ({
        ...prev,
        [incidentId]: null,
      }));
    } finally {
      setLoadingId("");
    }
  };



  const totalResponders = useMemo(
    () => incidents.reduce((total, incident) => total + (incident.responders?.length || 0), 0),
    [incidents]
  );

  const allAssessmentAnswered =
    assessmentQuestions.length > 0 &&
    assessmentQuestions.every((item) => String(assessmentAnswers[item.id] || "").trim().length > 0);

  const filteredIncidents = activeFilters.length > 0
    ? incidents.filter((i) => activeFilters.includes(i.type))
    : incidents;

  const latestIncidents = filteredIncidents.slice(0, 3);

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
              <h2><strong>User Dashboard</strong></h2>
              <p>Real-time emergency overview</p>
            </div>
          </div>
          <div className="dashboard-topnav-right">
            <span className="sos-pill"><strong>Active SOS:</strong> {incidents.length}</span>
            <span className="muted-meta">Last sync: 2 mins ago</span>
            <button type="button" className="dashboard-btn logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="dashboard-stats-row user-stats-row">
          <article className="stat-card stat-card--incidents">
            <div className="stat-head">
              <p className="stat-label"><strong>Open Incidents</strong></p>
              <span className="stat-icon-wrap stat-icon--red">
                <ShieldAlert size={18} />
              </span>
            </div>
            <h4>{incidents.length}</h4>
            <p className="stat-meta"><strong>Open incidents</strong> around the city</p>
          </article>
          <article className="stat-card stat-card--responders">
            <div className="stat-head">
              <p className="stat-label"><strong>Responders Live</strong></p>
              <span className="stat-icon-wrap stat-icon--green">
                <Activity size={18} />
              </span>
            </div>
            <h4>{totalResponders}</h4>
            <p className="stat-meta"><strong>Users</strong> currently responding</p>
          </article>
          <article className="stat-card stat-card--eta">
            <div className="stat-head">
              <p className="stat-label"><strong>Avg. ETA</strong></p>
              <span className="stat-icon-wrap stat-icon--blue">
                <Clock3 size={18} />
              </span>
            </div>
            <h4>Live</h4>
            <p className="stat-meta"><strong>Real-time</strong> SOS feed</p>
          </article>
        </section>

        <section className="dashboard-main-grid user-dashboard-grid">
          <aside className="dashboard-panel filters-panel user-panel glass-card">
            <h3><strong>Filters</strong></h3>
            <p className="panel-caption"><strong>Select</strong> incident categories</p>
            <div className="filter-chip-list">
              {FILTER_TYPES.map((f) => (
                <span
                  key={f.type}
                  className={`filter-chip${activeFilters.includes(f.type) ? " active" : ""}`}
                  onClick={() => toggleFilter(f.type)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && toggleFilter(f.type)}
                >
                  <strong>{f.label}</strong>
                </span>
              ))}
              {activeFilters.length > 0 && (
                <span
                  className="filter-chip filter-chip--clear"
                  onClick={() => setActiveFilters([])}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setActiveFilters([])}
                >
                  <strong>Clear All</strong>
                </span>
              )}
            </div>

            <div className="panel-divider" />

            <p className="panel-caption"><strong>AI Volunteer Rating</strong></p>
            <div className="report-field mt-2.5">
              <select
                className="report-input report-select ud-select"
                value={assessmentType}
                onChange={(event) => {
                  const type = event.target.value;
                  setAssessmentType(type);
                  fetchAssessmentQuestions(type);
                }}
              >
                <option value="fire">Fire</option>
                <option value="road">Road</option>
                <option value="health">Health</option>
                <option value="theft">Theft</option>
                <option value="other">Other</option>
              </select>
            </div>

            {assessmentQuestions.map((item) => (
              <div className="report-field ud-question-field" key={item.id}>
                <span className="ud-question-label"><strong>{item.question}</strong></span>
                <textarea
                  className="report-input report-select ud-textarea"
                  rows={3}
                  placeholder="Type your response here..."
                  value={assessmentAnswers[item.id] || ""}
                  onChange={(event) =>
                    setAssessmentAnswers((prev) => ({
                      ...prev,
                      [item.id]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}

            <button
              type="button"
              className="dashboard-btn ud-ai-btn mt-2.5"
              onClick={submitAssessment}
              disabled={assessmentLoading || !assessmentQuestions.length || !allAssessmentAnswered}
            >
              {assessmentLoading ? "Rating..." : "Get AI Rating"}
            </button>

            {assessmentStatus ? (
              <p className="panel-caption ud-status-msg mt-2">
                <strong>{assessmentStatus}</strong>
              </p>
            ) : null}

            {assessmentResult?.rating !== undefined ? (
              <div className="ud-rating-result mt-2.5">
                <strong>Your volunteer rating:</strong> <span className="ud-rating-value">{assessmentResult.rating}/100</span> <span className="ud-rating-grade">(Grade {assessmentResult.grade})</span>
              </div>
            ) : null}
          </aside>

          <section className="dashboard-panel live-map-panel user-panel glass-card">
            <h3><strong>Live Map</strong></h3>
            <p className="panel-caption"><strong>Auto-updating</strong> incidents and responders</p>

            {latestIncidentSuggestion?.suggestedVolunteers?.length ? (
              <div className="ud-suggestion-box">
                <p className="responder-chat-title"><strong>LLM Suggested Volunteers</strong> (Latest Incident)</p>
                {latestIncidentSuggestion.suggestedVolunteers.map((item) => (
                  <p className="responder-chat-line" key={item._id}>
                    <strong>{item.fullName}</strong> &bull; Rating <strong>{item.volunteerRating}/100</strong> &bull; <strong>{item.distanceKm} km</strong>
                  </p>
                ))}
              </div>
            ) : null}

            <div className="map-box">
              <MapView mapHeight={360} />
            </div>
          </section>

          <aside className="dashboard-panel user-panel glass-card ud-updates-panel">
            <button
              type="button"
              className="ud-sos-button"
              onClick={() => navigate("/report-incident")}
            >
              <ShieldAlert size={24} className="sos-cta-icon" />
              <strong>SOS</strong>
            </button>

            <h3><strong>Live Updates</strong></h3>
            <div className="update-list">
              {latestIncidents.length === 0 ? (
                <div className="update-item ud-empty-state">
                  <AlertCircle size={32} className="ud-empty-icon" />
                  <p className="update-title"><strong>No active incidents</strong></p>
                  <p className="update-text">New SOS requests will show here instantly.</p>
                </div>
              ) : (
                latestIncidents.map((incident) => (
                  <div className="update-item ud-incident-card" key={incident._id}>
                    <div className="ud-incident-header">
                      <span className={`ud-incident-badge ud-badge--${incident.type || "other"}`}>
                        <strong>{incident.type?.toUpperCase()}</strong>
                      </span>
                      <span className="ud-responder-count">
                        <Activity size={12} /> <strong>{incident.responders?.length || 0}</strong> responder{(incident.responders?.length || 0) !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="update-text"><strong>{incident.description || "No additional details"}</strong></p>
                    <div className="update-actions">
                      <button
                        type="button"
                        className="dashboard-btn ud-action-respond"
                        onClick={() => handleRespond(incident._id)}
                        disabled={loadingId === incident._id}
                      >
                        <strong>I'm Responding</strong>
                      </button>
                      <button
                        type="button"
                        className="dashboard-btn ud-action-resolve"
                        onClick={() => handleResolve(incident._id)}
                        disabled={loadingId === incident._id}
                      >
                        <strong>Mark Resolved</strong>
                      </button>
                      <button
                        type="button"
                        className="dashboard-btn"
                        onClick={() => setActiveChatIncident(incident._id)}
                      >
                        <strong>Responder Chat</strong>
                      </button>
                      <button
                        type="button"
                        className="dashboard-btn ud-action-suggest"
                        onClick={() => suggestBestVolunteer(incident._id)}
                        disabled={loadingId === incident._id}
                      >
                        <strong>Suggest Best Volunteer</strong>
                      </button>
                    </div>

                    {bestVolunteerByIncident[incident._id] ? (
                      <div className="responder-chat-placeholder ud-volunteer-card">
                        <p className="responder-chat-title"><strong>AI Recommended Volunteer</strong></p>
                        <p className="responder-chat-line">
                          <strong>{bestVolunteerByIncident[incident._id].fullName}</strong> &bull; Rating <strong>{bestVolunteerByIncident[incident._id].volunteerRating}/100</strong>
                        </p>
                        <p className="responder-chat-line">
                          <strong>Distance</strong> {bestVolunteerByIncident[incident._id].distanceKm} km &bull; <strong>Trust</strong> {bestVolunteerByIncident[incident._id].trustScore}/10
                        </p>
                      </div>
                    ) : null}

                    {activeChatIncident === incident._id ? (
                      <div className="responder-chat-placeholder ud-chat-box">
                        <p className="responder-chat-title"><strong>Per-responder chat</strong> (demo placeholder)</p>
                        <p className="responder-chat-line"><strong>Broadcaster:</strong> Please approach from Gate 2, heavy traffic on main road.</p>
                        <p className="responder-chat-line"><strong>Responder:</strong> On my way, ETA 4 mins.</p>
                        <p className="responder-chat-meta">Live chat transport can be plugged with socket room by incidentId.</p>
                      </div>
                    ) : null}
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

export default UserDashboard;
