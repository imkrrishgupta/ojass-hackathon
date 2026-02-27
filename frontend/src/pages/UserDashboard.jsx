import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MapView from "../components/MapView";
import { Activity, Clock3, MapPin, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { axiosInstance } from "../api/axios.js";

const userPoints = [
  { id: "u-1", lat: 28.621, lng: 77.219, label: "Accident - Connaught Place" },
  { id: "u-2", lat: 28.608, lng: 77.231, label: "Responder Unit A-12" },
  { id: "u-3", lat: 28.594, lng: 77.208, label: "Fire Alert - Mandi House" },
];

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
      const response = await axiosInstance.get(`/assistant/volunteer-questions?incidentType=${type}`);
      const questions = response.data?.data?.questions || [];
      setAssessmentQuestions(questions);
      const initialAnswers = {};
      questions.forEach((item) => {
        initialAnswers[item.id] = "basic";
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

    setAssessmentLoading(true);
    setAssessmentStatus("");
    try {
      const rawUser = localStorage.getItem("user");
      const parsedUser = rawUser ? JSON.parse(rawUser) : null;

      const answers = assessmentQuestions.map((question) => ({
        questionId: question.id,
        question: question.question,
        answer: assessmentAnswers[question.id] || "basic",
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

  const latestIncidents = incidents.slice(0, 3);

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
            <span className="sos-pill">Active SOS: {incidents.length}</span>
            <span className="muted-meta">Last sync: 2 mins ago</span>
            <button
              type="button"
              className="dashboard-btn report-incident-btn"
              onClick={() => navigate("/report-incident")}
            >
              Report Incident
            </button>
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
            <h4>{incidents.length}</h4>
            <p className="stat-meta">Open incidents around the city</p>
          </article>
          <article className="stat-card">
            <div className="stat-head">
              <p className="stat-label">Responders Live</p>
              <span className="stat-icon-wrap">
                <Activity size={16} />
              </span>
            </div>
            <h4>{totalResponders}</h4>
            <p className="stat-meta">Users currently responding</p>
          </article>
          <article className="stat-card">
            <div className="stat-head">
              <p className="stat-label">Avg. ETA</p>
              <span className="stat-icon-wrap">
                <Clock3 size={16} />
              </span>
            </div>
            <h4>Live</h4>
            <p className="stat-meta">Real-time SOS feed</p>
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

            <div className="panel-divider" />

            <p className="panel-caption">AI Volunteer Rating</p>
            <div className="report-field" style={{ marginTop: 10 }}>
              <select
                className="report-input report-select"
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
              <div className="report-field" key={item.id} style={{ marginTop: 8 }}>
                <span style={{ fontSize: 12 }}>{item.question}</span>
                <select
                  className="report-input report-select"
                  value={assessmentAnswers[item.id] || "basic"}
                  onChange={(event) =>
                    setAssessmentAnswers((prev) => ({
                      ...prev,
                      [item.id]: event.target.value,
                    }))
                  }
                >
                  <option value="never">Never</option>
                  <option value="basic">Basic</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            ))}

            <button
              type="button"
              className="dashboard-btn"
              style={{ marginTop: 10 }}
              onClick={submitAssessment}
              disabled={assessmentLoading || !assessmentQuestions.length}
            >
              {assessmentLoading ? "Rating..." : "Get AI Rating"}
            </button>

            {assessmentStatus ? (
              <p className="panel-caption" style={{ marginTop: 8 }}>
                {assessmentStatus}
              </p>
            ) : null}

            {assessmentResult?.rating !== undefined ? (
              <p className="panel-caption" style={{ marginTop: 10 }}>
                Your volunteer rating: {assessmentResult.rating}/100 (Grade {assessmentResult.grade})
              </p>
            ) : null}
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
              {latestIncidents.length === 0 ? (
                <div className="update-item">
                  <p className="update-title">No active incidents</p>
                  <p className="update-text">New SOS requests will show here instantly.</p>
                </div>
              ) : (
                latestIncidents.map((incident) => (
                  <div className="update-item" key={incident._id}>
                    <p className="update-title">{incident.type?.toUpperCase()} Alert</p>
                    <p className="update-text">{incident.description || "No additional details"}</p>
                    <span className="update-time">Responders: {incident.responders?.length || 0}</span>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button
                        type="button"
                        className="dashboard-btn"
                        onClick={() => handleRespond(incident._id)}
                        disabled={loadingId === incident._id}
                      >
                        I'm Responding
                      </button>
                      <button
                        type="button"
                        className="dashboard-btn"
                        onClick={() => handleResolve(incident._id)}
                        disabled={loadingId === incident._id}
                      >
                        Mark Resolved
                      </button>
                      <button
                        type="button"
                        className="dashboard-btn"
                        onClick={() => setActiveChatIncident(incident._id)}
                      >
                        Responder Chat
                      </button>
                      <button
                        type="button"
                        className="dashboard-btn"
                        onClick={() => suggestBestVolunteer(incident._id)}
                        disabled={loadingId === incident._id}
                      >
                        Suggest Best Volunteer
                      </button>
                    </div>

                    {bestVolunteerByIncident[incident._id] ? (
                      <div className="responder-chat-placeholder">
                        <p className="responder-chat-title">AI Recommended Volunteer</p>
                        <p className="responder-chat-line">
                          {bestVolunteerByIncident[incident._id].fullName} • Rating {bestVolunteerByIncident[incident._id].volunteerRating}/100
                        </p>
                        <p className="responder-chat-line">
                          Distance {bestVolunteerByIncident[incident._id].distanceKm} km • Trust {bestVolunteerByIncident[incident._id].trustScore}/10
                        </p>
                      </div>
                    ) : null}

                    {activeChatIncident === incident._id ? (
                      <div className="responder-chat-placeholder">
                        <p className="responder-chat-title">Per-responder chat (demo placeholder)</p>
                        <p className="responder-chat-line">Broadcaster: Please approach from Gate 2, heavy traffic on main road.</p>
                        <p className="responder-chat-line">Responder: On my way, ETA 4 mins.</p>
                        <p className="responder-chat-meta">Live chat transport can be plugged with socket room by incidentId.</p>
                      </div>
                    ) : null}
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

export default UserDashboard;
