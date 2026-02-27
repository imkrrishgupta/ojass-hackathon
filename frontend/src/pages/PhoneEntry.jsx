import { useState } from "react";

const normalizeEmail = (value) => value.trim().toLowerCase();
const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

function PhoneEntry({ onContinue }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!gmailRegex.test(email)) {
      setError("Please enter a valid Gmail address.");
      return;
    }

    setError("");
    onContinue(email);
  };

  return (
    <section className="auth-body">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Login or Create Account</h2>
        <p className="subtitle">Enter your Gmail to proceed</p>

        <div className="phone-input-wrap">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(normalizeEmail(event.target.value))}
            placeholder="you@gmail.com"
            autoComplete="email"
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="primary-btn" disabled={!gmailRegex.test(email)}>
          Continue
        </button>

        <p className="terms-text">
          By continuing, I agree to the <a href="#">Terms of Service</a>
        </p>
      </form>
    </section>
  );
}

export default PhoneEntry;
