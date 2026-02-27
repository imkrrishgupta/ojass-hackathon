import { useState } from "react";

function NewUserRegister({
  email,
  onBack,
  onRegister,
  onRegistered,
  onSwitchToSignIn,
}) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleSubmit = (event) => {
    event.preventDefault();

    if (password.length < 6) {
      setStatus({
        type: "error",
        message: "Password must be at least 6 characters.",
      });
      return;
    }

    const response = onRegister({ name: name.trim(), password });

    setStatus({
      type: response.ok ? "success" : "error",
      message: response.message,
    });

    if (response.ok) {
      setTimeout(() => {
        onRegistered();
      }, 800);
    }
  };

  return (
    <section className="auth-body">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Create New Account</h2>
        <p className="subtitle">Register for {email}</p>

        <label className="input-label" htmlFor="name">
          Full Name
        </label>
        <input
          id="name"
          className="text-input"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter full name"
          autoComplete="name"
        />

        <label className="input-label" htmlFor="new-password">
          Password
        </label>
        <input
          id="new-password"
          className="text-input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Set your password"
          autoComplete="new-password"
        />

        {status.message && (
          <p className={status.type === "success" ? "form-success" : "form-error"}>
            {status.message}
          </p>
        )}

        <button
          type="submit"
          className="primary-btn"
          disabled={!name.trim() || !password.trim()}
        >
          Create Account
        </button>

        <div className="auth-secondary-actions">
          <button type="button" className="link-btn" onClick={onBack}>
            Back to Gmail entry
          </button>

          <button type="button" className="link-btn" onClick={onSwitchToSignIn}>
            Already have an account? Sign in
          </button>
        </div>
      </form>
    </section>
  );
}

export default NewUserRegister;
