import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MapView from "../components/MapView";
import { Activity, Clock3, ShieldAlert, AlertCircle, Award, MapPin, Heart, Send, MessageCircle } from "lucide-react";
import { axiosInstance } from "../api/axios.js";
import { socket } from "../socket.js";

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
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [chatMessages, setChatMessages] = useState({});
  const [chatInput, setChatInput] = useState("");
  const joinedRoomsRef = useRef(new Set());
  const chatEndRefs = useRef({});

  const FILTER_TYPES = [
    { label: "Road", type: "road" },
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

  const fetchOpenIncidents = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/incidents/open");
      setIncidents(response.data?.data || []);
      setLastSyncTime(new Date());
    } catch {
      setIncidents([]);
    }
  }, []);

  useEffect(() => {
    fetchOpenIncidents();
    const timer = setInterval(fetchOpenIncidents, 10000);
    return () => clearInterval(timer);
  }, [fetchOpenIncidents]);

  // Auto-join chat rooms for incidents the current user created or is responding to
  useEffect(() => {
    if (!incidents.length) return;
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user?._id) return;
    const uid = String(user._id);

    incidents.forEach((inc) => {
      const incId = inc._id || inc.id;
      if (!incId) return;
      // Check if user is creator
      const isCreator =
        String(inc.createdBy?._id || inc.createdBy) === uid;
      // Check if user is a responder
      const isResponder = (inc.responders || []).some(
        (r) => String(r.userId?._id || r.userId) === uid
      );
      if ((isCreator || isResponder) && !joinedRoomsRef.current.has(incId)) {
        socket.emit("JOIN_INCIDENT_CHAT", { incidentId: incId, userName: user.fullName || "User" });
        joinedRoomsRef.current.add(incId);
      }
    });
  }, [incidents]);

  const getUserName = useCallback(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw)?.fullName || "Responder" : "Responder";
    } catch { return "Responder"; }
  }, []);

  const joinChatRoom = useCallback((incidentId) => {
    // Only send join announcement once per incident per session
    if (!joinedRoomsRef.current.has(incidentId)) {
      socket.emit("JOIN_INCIDENT_CHAT", { incidentId, userName: getUserName() });
      joinedRoomsRef.current.add(incidentId);
    }
  }, [getUserName]);

  const sendChatMessage = useCallback((incidentId) => {
    const msg = chatInput.trim();
    if (!msg) return;
    socket.emit("SEND_CHAT_MESSAGE", {
      incidentId,
      sender: getUserName(),
      message: msg,
    });
    setChatInput("");
  }, [chatInput, getUserName]);

  /* ── Real-time socket listeners ── */
  useEffect(() => {
    // An incident was created, responded to, or modified
    const onIncidentUpdated = (updatedIncident) => {
      if (!updatedIncident) return;
      const id = updatedIncident._id || updatedIncident.id;
      if (!id) return;

      setLastSyncTime(new Date());
      setIncidents((prev) => {
        // If resolved, remove it from the open list
        if (updatedIncident.status === "resolved") {
          return prev.filter((inc) => (inc._id || inc.id) !== id);
        }
        // If it already exists, replace it; otherwise prepend it
        const exists = prev.some((inc) => (inc._id || inc.id) === id);
        if (exists) {
          return prev.map((inc) => (inc._id || inc.id) === id ? updatedIncident : inc);
        }
        return [updatedIncident, ...prev];
      });
    };

    // An incident was resolved/closed
    const onIncidentClosed = (payload) => {
      const id = payload?.incidentId || payload?._id || payload?.id;
      if (!id) return;
      setIncidents((prev) => prev.filter((inc) => (inc._id || inc.id) !== id));
    };

    // A new nearby incident arrived
    const onIncidentNearby = (inc) => {
      if (!inc) return;
      const id = inc._id || inc.id;
      if (!id) return;
      setIncidents((prev) => {
        const exists = prev.some((i) => (i._id || i.id) === id);
        if (exists) return prev.map((i) => (i._id || i.id) === id ? { ...i, ...inc } : i);
        return [inc, ...prev];
      });
    };

    // A responder joined an incident
    const onIncidentResponder = (payload) => {
      if (!payload?.incidentId) return;
      // Re-fetch to get fully populated data
      fetchOpenIncidents();
    };

    // Listen for chat messages
    const onChatMessage = (msg) => {
      if (!msg?.incidentId) return;
      setChatMessages((prev) => {
        const existing = prev[msg.incidentId] || [];
        // Deduplicate by timestamp+sender+message
        const isDup = existing.some(
          (m) => m.timestamp === msg.timestamp && m.sender === msg.sender && m.message === msg.message
        );
        if (isDup) return prev;
        return { ...prev, [msg.incidentId]: [...existing, msg] };
      });
    };

    socket.on("INCIDENT_UPDATED", onIncidentUpdated);
    socket.on("INCIDENT_CLOSED", onIncidentClosed);
    socket.on("INCIDENT_NEARBY", onIncidentNearby);
    socket.on("INCIDENT_RESPONDER", onIncidentResponder);
    socket.on("CHAT_MESSAGE", onChatMessage);

    // Re-join chat rooms after socket reconnect
    const onReconnect = () => {
      console.log("[Socket] Reconnected — re-joining chat rooms");
      for (const roomId of joinedRoomsRef.current) {
        socket.emit("JOIN_INCIDENT_CHAT", { incidentId: roomId, userName: getUserName() });
      }
      fetchOpenIncidents();
    };
    socket.on("connect", onReconnect);

    return () => {
      socket.off("INCIDENT_UPDATED", onIncidentUpdated);
      socket.off("INCIDENT_CLOSED", onIncidentClosed);
      socket.off("INCIDENT_NEARBY", onIncidentNearby);
      socket.off("INCIDENT_RESPONDER", onIncidentResponder);
      socket.off("CHAT_MESSAGE", onChatMessage);
      socket.off("connect", onReconnect);
    };
  }, [fetchOpenIncidents, getUserName]);

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
      const res = await axiosInstance.post(`/incidents/${incidentId}/respond`);
      const updated = res.data?.data;
      if (updated) {
        // Update local state immediately with the populated response
        setIncidents((prev) =>
          prev.map((inc) => (inc._id || inc.id) === incidentId ? updated : inc)
        );
      }
      // Open chat panel & announce join
      setActiveChatIncident(incidentId);
      joinChatRoom(incidentId);
    } catch (err) {
      console.error("Respond error:", err);
    } finally {
      setLoadingId("");
    }
  };

  const handleResolve = async (incidentId) => {
    setLoadingId(incidentId);
    try {
      await axiosInstance.post(`/incidents/${incidentId}/resolve`);
      // Remove from local state immediately
      setIncidents((prev) => prev.filter((inc) => (inc._id || inc.id) !== incidentId));
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
            <span className="muted-meta">Last sync: {lastSyncTime ? `${Math.max(0, Math.floor((Date.now() - lastSyncTime.getTime()) / 1000))}s ago` : "syncing..."}</span>
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
            <p className="panel-caption"><strong>Auto-updating</strong> incidents, resources &amp; responders</p>

            <div className="ud-nav-row">
              <button type="button" className="ud-nav-btn" onClick={() => navigate("/skill-registry")}>
                <Award size={14} /> <strong>Skill Registry</strong>
              </button>
              <button type="button" className="ud-nav-btn ud-nav-btn--green" onClick={() => navigate("/community-resources")}>
                <Heart size={14} /> <strong>Community Resources</strong>
              </button>
            </div>

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
              <MapView mapHeight={360} showResources={true} showSkilledResponders={true} />
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
                        onClick={() => {
                          const id = incident._id;
                          setActiveChatIncident((prev) => prev === id ? null : id);
                          joinChatRoom(id);
                        }}
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
                      <div className="responder-chat-placeholder ud-chat-box" style={{ background: "#f8fafc", borderRadius: 10, padding: 14, marginTop: 8, border: "1px solid #e2e8f0" }}>
                        <p className="responder-chat-title" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <MessageCircle size={16} />
                          <strong>Responder Chat</strong>
                          <span style={{ fontSize: 11, color: "#22c55e", marginLeft: 4 }}>● Live</span>
                          <span style={{ fontSize: 11, color: "#64748b", marginLeft: "auto" }}>{incident.responders?.length || 0} in chat</span>
                        </p>
                        <div
                          className="ud-chat-messages"
                          style={{ maxHeight: 220, overflowY: "auto", marginBottom: 10, padding: "6px 0" }}
                          ref={(el) => {
                            if (el) {
                              chatEndRefs.current[incident._id] = el;
                              el.scrollTop = el.scrollHeight;
                            }
                          }}
                        >
                          {(chatMessages[incident._id] || []).length === 0 ? (
                            <p className="responder-chat-meta" style={{ color: "#94a3b8", textAlign: "center", padding: 16 }}>No messages yet. Say something to coordinate!</p>
                          ) : (
                            (chatMessages[incident._id] || []).map((msg, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: "4px 0",
                                  borderBottom: "1px solid #f1f5f9",
                                  ...(msg.isSystem ? { fontStyle: "italic", opacity: 0.6, fontSize: 12, textAlign: "center" } : {}),
                                }}
                              >
                                {msg.isSystem ? (
                                  <span style={{ color: "#64748b" }}>{msg.message}</span>
                                ) : (
                                  <>
                                    <strong style={{ color: msg.sender === getUserName() ? "#6366f1" : "#0f172a" }}>{msg.sender}:</strong>{" "}
                                    <span>{msg.message}</span>
                                    <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 8 }}>
                                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                                    </span>
                                  </>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <input
                            type="text"
                            className="report-input"
                            placeholder="Type a message..."
                            value={activeChatIncident === incident._id ? chatInput : ""}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendChatMessage(incident._id)}
                            style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                          />
                          <button
                            type="button"
                            className="dashboard-btn ud-action-respond"
                            onClick={() => sendChatMessage(incident._id)}
                            style={{ padding: "8px 14px", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}
                          >
                            <Send size={14} /> <strong>Send</strong>
                          </button>
                        </div>
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
