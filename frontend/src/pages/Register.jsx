import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../api/axios.js";
import nearhelpLogo from "../assets/nearhelp-logo.svg";

const phoneRegex = /^[0-9]{10}$/;

function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const handlePhoneChange = (event) => {
    const value = event.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", message: "" });

    if (!name.trim()) {
      setStatus({ type: "error", message: "Name is required." });
      return;
    }

    if (!phoneRegex.test(phone)) {
      setStatus({ type: "error", message: "Please enter a valid 10-digit phone number." });
      return;
    }

    if (!avatar) {
      setStatus({ type: "error", message: "Avatar is required." });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("phone", phone);
      formData.append("avatar", avatar);

      await axiosInstance.post("/users/register", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setStatus({
        type: "success",
        message: "Registration complete. Redirecting to login...",
      });

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1000);
    } catch (error) {
      setStatus({
        type: "error",
        message: error.response?.data?.message || "Registration failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <header className="auth-topbar">
        <div className="auth-topbar-inner">
          <div className="auth-logo-wrap">
            <img className="auth-logo" src={nearhelpLogo} alt="NearHelp" />
          </div>
        </div>
      </header>

      <section className="auth-body">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h2>Create New Account</h2>
          <p className="subtitle">Enter name, phone number, and avatar to register</p>

          <label className="input-label" htmlFor="register-name">
            Name
          </label>
          <input
            id="register-name"
            className="text-input"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your name"
            autoComplete="name"
          />

          <label className="input-label" htmlFor="register-phone">
            Phone Number
          </label>
          <div className="phone-input-wrap">
            <span className="country-code">+91</span>
            <input
              id="register-phone"
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="Enter 10-digit number"
              autoComplete="tel"
              maxLength="10"
            />
          </div>

          <label className="input-label" htmlFor="register-avatar">
            Avatar
          </label>
          <input
            id="register-avatar"
            className="text-input"
            type="file"
            accept="image/*"
            onChange={(event) => setAvatar(event.target.files?.[0] || null)}
          />

          {status.message && (
            <p className={status.type === "success" ? "form-success" : "form-error"}>{status.message}</p>
          )}

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>

          <div className="auth-secondary-actions">
            <button type="button" className="link-btn" onClick={() => navigate("/login")}> 
              Back to Login
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default Register;