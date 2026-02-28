import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../api/axios";
import { emitIncidentUpdate } from "../socket";
import { ShieldAlert, AlertCircle, Send, ArrowLeft, CheckCircle2, MapPin, Radio, FileText, Users } from "lucide-react";

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

function ReportIncident() {
  const navigate = useNavigate();
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [radiusMeters, setRadiusMeters] = useState(2000);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [guidance, setGuidance] = useState(null);
  const [submittedIncidentId, setSubmittedIncidentId] = useState("");
  const [suggestedVolunteers, setSuggestedVolunteers] = useState([]);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [showSuggestionPopup, setShowSuggestionPopup] = useState(false);

  const isFormValid = useMemo(() => type && description.trim(), [type, description]);

  const fetchGuidance = async () => {
    if (!type) return;

    try {
      const response = await axiosInstance.post("/assistant/crisis-guidance", {
        type,
        description,
      });
      setGuidance(response.data?.data || null);
    } catch {
      setGuidance(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", message: "" });

    if (!isFormValid) {
      setStatus({ type: "error", message: "Please fill all required fields." });
      return;
    }

    setLoading(true);
    try {
      const location = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({ lat: 28.6139, lng: 77.209 })
        );
      });

      const response = await axiosInstance.post("/incidents", {
        type,
        description: description.trim(),
        radiusMeters,
        lat: location.lat,
        lng: location.lng,
      });

      const incident = response.data?.data;
      setSubmittedIncidentId(incident?._id || "");

      let suggestedList = [];

      try {
        const suggestResponse = await axiosInstance.get(`/incidents/${incident?._id}/best-volunteer`);
        suggestedList = suggestResponse.data?.data?.suggestedVolunteers || [];
      } catch {
        suggestedList = [];
      }

      setSuggestedVolunteers(suggestedList);
      setSelectedVolunteerId(suggestedList[0]?._id || "");
      setShowSuggestionPopup(suggestedList.length > 0);

      localStorage.setItem(
        "latestIncidentSuggestions",
        JSON.stringify({
          incidentId: incident?._id,
          type,
          description: description.trim(),
          suggestedVolunteers: suggestedList,
          createdAt: Date.now(),
        })
      );

      emitIncidentUpdate({
        _id: incident?._id,
        type,
        description: description.trim(),
        lat: location.lat,
        lng: location.lng,
        radiusMeters,
      });

      const namesText = suggestedList.length
        ? ` Suggested: ${suggestedList.map((item) => item.fullName).join(", ")}.`
        : "";

      setStatus({
        type: "success",
        message: `Incident reported successfully.${namesText} Select one volunteer to send SMS.`,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error.response?.data?.message || "Failed to report incident.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendSmsToSelected = async () => {
    if (!submittedIncidentId || !selectedVolunteerId) {
      setStatus({ type: "error", message: "Please select a volunteer first." });
      return;
    }

    setSendingSms(true);
    try {
      const response = await axiosInstance.post(`/incidents/${submittedIncidentId}/notify-suggested`, {
        selectedVolunteerId,
      });

      const sentCount = response.data?.data?.sentCount || 0;
      setStatus({
        type: "success",
        message: sentCount
          ? "SMS sent to selected volunteer successfully."
          : "Could not send SMS to selected volunteer.",
      });
      setShowSuggestionPopup(false);
    } catch (error) {
      setStatus({
        type: "error",
        message: error.response?.data?.message || "Failed to send SMS to selected volunteer.",
      });
    } finally {
      setSendingSms(false);
    }
  };

  return (
    <main className="dashboard-page user-dashboard-page">
      <section className="dashboard-shell user-dashboard-shell ri-shell">
        <header className="dashboard-topnav user-topnav ri-topnav">
          <div className="dashboard-topnav-left">
            <span className="badge">
              <ShieldAlert size={14} style={{ marginRight: 4 }} />
              <strong>NearHelp</strong>
            </span>
            <div className="dashboard-title-block">
              <h2><strong>Report an Incident</strong></h2>
              <p>Share details to alert nearby responders quickly</p>
            </div>
          </div>
          <div className="dashboard-topnav-right">
            <button
              type="button"
              className="dashboard-btn ri-back-btn"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={14} /> <strong>Back</strong>
            </button>
          </div>
        </header>

        <section className="dashboard-stats-row user-stats-row ri-stats-row">
          <article className="stat-card stat-card--incidents">
            <div className="stat-head">
              <p className="stat-label"><strong>Incident Type</strong></p>
              <span className="stat-icon-wrap stat-icon--red">
                <AlertCircle size={18} />
              </span>
            </div>
            <h4>{type ? type.replace("_", " ").toUpperCase() : "—"}</h4>
            <p className="stat-meta"><strong>Selected</strong> category</p>
          </article>
          <article className="stat-card stat-card--responders">
            <div className="stat-head">
              <p className="stat-label"><strong>Broadcast Radius</strong></p>
              <span className="stat-icon-wrap stat-icon--green">
                <Radio size={18} />
              </span>
            </div>
            <h4>{radiusMeters >= 1000 ? `${radiusMeters / 1000} km` : `${radiusMeters}m`}</h4>
            <p className="stat-meta"><strong>Alert</strong> coverage area</p>
          </article>
          <article className="stat-card stat-card--eta">
            <div className="stat-head">
              <p className="stat-label"><strong>Volunteers Suggested</strong></p>
              <span className="stat-icon-wrap stat-icon--blue">
                <Users size={18} />
              </span>
            </div>
            <h4>{suggestedVolunteers.length}</h4>
            <p className="stat-meta"><strong>AI-matched</strong> responders</p>
          </article>
        </section>

        <section className="dashboard-main-grid user-dashboard-grid ri-grid">
          {/* Left panel — Form */}
          <div className="dashboard-panel user-panel glass-card ri-form-panel">
            <h3><strong>Incident Details</strong></h3>
            <p className="panel-caption"><strong>Fill in</strong> the information below</p>

            <form className="ri-form" onSubmit={handleSubmit}>
              <div className="ri-field">
                <label className="ri-label">
                  <FileText size={14} /> <strong>Incident Type</strong>
                </label>
                <select
                  className="ri-input ri-select"
                  value={type}
                  onChange={(event) => {
                    setType(event.target.value);
                    setTimeout(fetchGuidance, 0);
                  }}
                >
                  <option value="" disabled>Select incident type</option>
                  <option value="car_breakdown">Car Breakdown</option>
                  <option value="gas_leak">Gas Leak</option>
                  <option value="urgent_help">Urgent Help</option>
                  <option value="medical">Medical</option>
                  <option value="others">Other</option>
                </select>
              </div>

              <div className="ri-field">
                <label className="ri-label">
                  <MapPin size={14} /> <strong>Broadcast Radius</strong>
                </label>
                <select
                  className="ri-input ri-select"
                  value={radiusMeters}
                  onChange={(event) => setRadiusMeters(Number(event.target.value))}
                >
                  <option value={500}>500 meters</option>
                  <option value={1000}>1 km</option>
                  <option value={2000}>2 km</option>
                </select>
              </div>

              <div className="ri-field">
                <label className="ri-label">
                  <FileText size={14} /> <strong>Description</strong>
                </label>
                <textarea
                  className="ri-input ri-textarea"
                  rows={4}
                  placeholder="Describe the incident in detail..."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  onBlur={fetchGuidance}
                />
              </div>

              {status.message ? (
                <div className={`ri-status-banner ${status.type === "success" ? "ri-status--success" : "ri-status--error"}`}>
                  {status.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <p><strong>{status.message}</strong></p>
                </div>
              ) : null}

              <button type="submit" className="ri-submit-btn" disabled={loading || !isFormValid}>
                <Send size={16} />
                <strong>{loading ? "Submitting..." : "Submit Report"}</strong>
              </button>
            </form>
          </div>

          {/* Middle panel — Guidance + Volunteers */}
          <div className="dashboard-panel live-map-panel user-panel glass-card ri-center-panel">
            <h3><strong>AI Guidance &amp; Volunteers</strong></h3>
            <p className="panel-caption"><strong>Smart assistance</strong> for your incident</p>

            {guidance?.firstResponseSteps?.length ? (
              <div className="ri-guidance-box">
                <p className="ri-guidance-title">
                  <CheckCircle2 size={14} /> <strong>First-Response Guidance</strong>
                </p>
                <ol className="ri-guidance-list">
                  {guidance.firstResponseSteps.map((step, index) => (
                    <li key={index}><strong>{step}</strong></li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="ri-empty-guidance">
                <AlertCircle size={32} className="ud-empty-icon" />
                <p><strong>Select an incident type</strong> and describe it to get AI guidance</p>
              </div>
            )}

            {suggestedVolunteers.length > 0 ? (
              <div className="ri-volunteers-box">
                <p className="ri-guidance-title">
                  <Users size={14} /> <strong>LLM Suggested Volunteers</strong>
                </p>
                <div className="ri-volunteer-list">
                  {suggestedVolunteers.map((volunteer) => (
                    <label
                      key={volunteer._id}
                      className={`ri-volunteer-item ${selectedVolunteerId === volunteer._id ? "ri-volunteer--selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="selectedVolunteer"
                        value={volunteer._id}
                        checked={selectedVolunteerId === volunteer._id}
                        onChange={() => setSelectedVolunteerId(volunteer._id)}
                        className="ri-radio"
                      />
                      <div className="ri-volunteer-info">
                        <strong>{volunteer.fullName}</strong>
                        <span className="ri-volunteer-meta">
                          Rating <strong>{volunteer.volunteerRating}/100</strong> &bull; <strong>{volunteer.distanceKm} km</strong> away
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="ri-volunteer-actions">
                  <button
                    type="button"
                    className="ri-sms-btn"
                    onClick={handleSendSmsToSelected}
                    disabled={sendingSms || !selectedVolunteerId}
                  >
                    <Send size={14} />
                    <strong>{sendingSms ? "Sending SMS..." : "Send SMS to Volunteer"}</strong>
                  </button>
                  <button
                    type="button"
                    className="dashboard-btn"
                    onClick={() => navigate("/user-dashboard")}
                  >
                    <strong>Skip &amp; Go Back</strong>
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right panel — Info */}
          <aside className="dashboard-panel user-panel glass-card ri-info-panel">
            <h3><strong>How It Works</strong></h3>
            <div className="ri-info-list">
              <div className="ri-info-step">
                <span className="ri-step-number"><strong>1</strong></span>
                <div>
                  <p className="ri-step-title"><strong>Select Type</strong></p>
                  <p className="ri-step-desc">Choose the incident category</p>
                </div>
              </div>
              <div className="ri-info-step">
                <span className="ri-step-number"><strong>2</strong></span>
                <div>
                  <p className="ri-step-title"><strong>Describe</strong></p>
                  <p className="ri-step-desc">Provide details and set radius</p>
                </div>
              </div>
              <div className="ri-info-step">
                <span className="ri-step-number"><strong>3</strong></span>
                <div>
                  <p className="ri-step-title"><strong>Submit</strong></p>
                  <p className="ri-step-desc">Alert gets broadcast to nearby volunteers</p>
                </div>
              </div>
              <div className="ri-info-step">
                <span className="ri-step-number"><strong>4</strong></span>
                <div>
                  <p className="ri-step-title"><strong>Notify</strong></p>
                  <p className="ri-step-desc">Send SMS to the best-matched volunteer</p>
                </div>
              </div>
            </div>

            <div className="panel-divider" />

            <h3><strong>Tips</strong></h3>
            <div className="ri-tips-list">
              <p><strong>Be specific</strong> in your description for better AI matching</p>
              <p><strong>Enable location</strong> access for accurate broadcasting</p>
              <p><strong>Larger radius</strong> reaches more volunteers but may delay response</p>
            </div>
          </aside>
        </section>

        <footer className="ud-footer">
          <p><strong>NearHelp</strong> &mdash; Community-powered emergency response</p>
        </footer>
      </section>

      {showSuggestionPopup && suggestedVolunteers.length ? (
        <div className="sos-option-overlay" role="dialog" aria-modal="true">
          <div className="sos-option-popup ud-sos-popup ri-popup">
            <div className="ud-sos-popup-icon ri-popup-icon">
              <Users size={40} />
            </div>
            <h3><strong>Top Rated Volunteers (AI)</strong></h3>
            <p>Select one volunteer to notify via SMS.</p>

            <div className="ri-volunteer-list" style={{ marginTop: 12 }}>
              {suggestedVolunteers.map((volunteer) => (
                <label
                  key={volunteer._id}
                  className={`ri-volunteer-item ${selectedVolunteerId === volunteer._id ? "ri-volunteer--selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="popupVolunteer"
                    value={volunteer._id}
                    checked={selectedVolunteerId === volunteer._id}
                    onChange={() => setSelectedVolunteerId(volunteer._id)}
                    className="ri-radio"
                  />
                  <div className="ri-volunteer-info">
                    <strong>{volunteer.fullName}</strong>
                    <span className="ri-volunteer-meta">
                      Rating <strong>{volunteer.volunteerRating}/100</strong> &bull; <strong>{volunteer.distanceKm} km</strong>
                    </span>
                  </div>
                </label>
              ))}
            </div>

            <div className="sos-option-actions" style={{ marginTop: 14 }}>
              <button
                type="button"
                className="ri-sms-btn"
                onClick={handleSendSmsToSelected}
                disabled={sendingSms || !selectedVolunteerId}
                style={{ width: "100%" }}
              >
                <Send size={14} />
                <strong>{sendingSms ? "Sending SMS..." : "Send SMS to Volunteer"}</strong>
              </button>
              <button
                type="button"
                className="dashboard-btn ud-sos-cancel"
                onClick={() => setShowSuggestionPopup(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default ReportIncident;
