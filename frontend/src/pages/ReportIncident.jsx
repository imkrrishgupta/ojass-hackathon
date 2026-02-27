import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../api/axios";
import { emitIncidentUpdate } from "../socket";

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
    <main className="report-page">
      <section className="report-card">
        <div className="report-card-accent" aria-hidden="true" />
        <header className="report-header">
          <button type="button" className="report-back" onClick={() => navigate(-1)}>
            Back
          </button>
          <h1>Report an Incident</h1>
          <p>Share details to alert nearby responders quickly.</p>
        </header>

        <form className="report-form" onSubmit={handleSubmit}>
          <label className="report-field">
            <span>Select Incident Type</span>
            <select
              className="report-input report-select"
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setTimeout(fetchGuidance, 0);
              }}
            >
              <option value="" disabled>
                Select Incident Type
              </option>
              <option value="car_breakdown">Car Breakdown</option>
              <option value="gas_leak">Gas Leak</option>
              <option value="urgent_help">Urgent Help</option>
              <option value="medical">Medical</option>
              <option value="others">Other</option>
            </select>
          </label>

          <label className="report-field">
            <span>Broadcast Radius</span>
            <select
              className="report-input report-select"
              value={radiusMeters}
              onChange={(event) => setRadiusMeters(Number(event.target.value))}
            >
              <option value={500}>500 meters</option>
              <option value={1000}>1 km</option>
              <option value={2000}>2 km</option>
            </select>
          </label>

          <label className="report-field">
            <span>Describe the incident</span>
            <textarea
              className="report-input report-textarea"
              rows={4}
              placeholder="Describe the incident"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              onBlur={fetchGuidance}
            />
          </label>

          {guidance?.firstResponseSteps?.length ? (
            <div className="report-field">
              <span>AI First-Response Guidance</span>
              <div className="report-input" style={{ lineHeight: 1.6 }}>
                {guidance.firstResponseSteps.map((step, index) => (
                  <div key={index}>{`${index + 1}. ${step}`}</div>
                ))}
              </div>
            </div>
          ) : null}

          {status.message ? (
            <p className={status.type === "success" ? "form-success" : "form-error"}>{status.message}</p>
          ) : null}

          {suggestedVolunteers.length ? (
            <div className="report-field">
              <span>LLM Suggested Volunteers (select one)</span>
              <div className="report-input" style={{ display: "grid", gap: 8 }}>
                {suggestedVolunteers.map((volunteer) => (
                  <label key={volunteer._id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="radio"
                      name="selectedVolunteer"
                      value={volunteer._id}
                      checked={selectedVolunteerId === volunteer._id}
                      onChange={() => setSelectedVolunteerId(volunteer._id)}
                    />
                    <span>
                      {volunteer.fullName} • Rating {volunteer.volunteerRating}/100 • {volunteer.distanceKm} km
                    </span>
                  </label>
                ))}
              </div>

              <button
                type="button"
                className="report-submit"
                onClick={handleSendSmsToSelected}
                disabled={sendingSms || !selectedVolunteerId}
              >
                {sendingSms ? "Sending SMS..." : "Send SMS to Selected Volunteer"}
              </button>

              <button
                type="button"
                className="dashboard-btn"
                style={{ marginTop: 8 }}
                onClick={() => navigate("/user-dashboard")}
              >
                Skip SMS and Go Back
              </button>
            </div>
          ) : null}

          <button type="submit" className="report-submit" disabled={loading || !isFormValid}>
            {loading ? "Submitting..." : "Submit Report"}
          </button>
        </form>

        {showSuggestionPopup && suggestedVolunteers.length ? (
          <div className="report-suggestion-overlay" role="dialog" aria-modal="true">
            <div className="report-suggestion-popup">
              <h3>Top Rated Volunteers (LLM)</h3>
              <p>Select one volunteer to notify via SMS.</p>

              <div className="report-input" style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {suggestedVolunteers.map((volunteer) => (
                  <label key={volunteer._id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="radio"
                      name="selectedVolunteer"
                      value={volunteer._id}
                      checked={selectedVolunteerId === volunteer._id}
                      onChange={() => setSelectedVolunteerId(volunteer._id)}
                    />
                    <span>
                      {volunteer.fullName} • Rating {volunteer.volunteerRating}/100 • {volunteer.distanceKm} km
                    </span>
                  </label>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  className="report-submit"
                  onClick={handleSendSmsToSelected}
                  disabled={sendingSms || !selectedVolunteerId}
                >
                  {sendingSms ? "Sending SMS..." : "Send SMS to Selected Volunteer"}
                </button>
                <button
                  type="button"
                  className="dashboard-btn"
                  onClick={() => setShowSuggestionPopup(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default ReportIncident;
