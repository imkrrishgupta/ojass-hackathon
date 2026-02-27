import { useNavigate } from "react-router-dom";

function ReportIncident() {
  const navigate = useNavigate();

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

        <form className="report-form">
          <label className="report-field">
            <span>Your Name</span>
            <input className="report-input" type="text" placeholder="Your Name" />
          </label>

          <label className="report-field">
            <span>Select Incident Type</span>
            <select className="report-input report-select" defaultValue="">
              <option value="" disabled>
                Select Incident Type
              </option>
              <option value="fire">Fire Accident</option>
              <option value="road">Road Accident</option>
              <option value="theft">Theft</option>
              <option value="health">Health Issue</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="report-field">
            <span>Describe the incident</span>
            <textarea
              className="report-input report-textarea"
              rows={4}
              placeholder="Describe the incident"
            />
          </label>

          <button type="submit" className="report-submit">
            Submit Report
          </button>
        </form>
      </section>
    </main>
  );
}

export default ReportIncident;
