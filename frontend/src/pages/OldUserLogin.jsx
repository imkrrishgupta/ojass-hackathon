import { useState } from "react";

function OldUserLogin({ email, onBack, onLogin, onSwitchToSignUp }) {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleSubmit = (event) => {
    event.preventDefault();
    const response = onLogin(password);

    setStatus({
      type: response.ok ? "success" : "error",
      message: response.message,
    });
  };

  return (
    <section className="auth-body">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Welcome Back</h2>
        <p className="subtitle">Login for {email}</p>

        <label className="input-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          className="text-input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
        />

        {status.message && (
          <p className={status.type === "success" ? "form-success" : "form-error"}>
            {status.message}
          </p>
        )}

        <button type="submit" className="primary-btn" disabled={!password.trim()}>
          Login
        </button>

        <div className="auth-secondary-actions">
          <button type="button" className="link-btn" onClick={onBack}>
            Use another Gmail
          </button>

          <button type="button" className="link-btn" onClick={onSwitchToSignUp}>
            Don't have an account? Sign up
          </button>
        </div>
      </form>
    </section>
  );
}

export default OldUserLogin;
