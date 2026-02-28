import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../api/axios.js";
import { ShieldAlert, UserPlus, ArrowLeft, Upload } from "lucide-react";

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
      return setStatus({ type: "error", message: "Name is required." });
    }

    if (!phoneRegex.test(phone)) {
      return setStatus({
        type: "error",
        message: "Please enter a valid 10-digit phone number.",
      });
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("phone", phone);

      if (avatar) {
        const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

        if (!allowedTypes.includes(avatar.type)) {
          setLoading(false);
          return setStatus({
            type: "error",
            message: "Only JPG, PNG, WEBP images allowed.",
          });
        }

        if (avatar.size > 2 * 1024 * 1024) {
          setLoading(false);
          return setStatus({
            type: "error",
            message: "Image must be less than 2MB.",
          });
        }

        formData.append("avatar", avatar);
      }

      const response = await axiosInstance.post("/users/register", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
        timeout: 15000,
      });

      if (response.data?.success) {
        setStatus({
          type: "success",
          message: "Registration complete. Redirecting to login...",
        });

        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 1200);
      }

    } catch (error) {
      console.error("Register error:", error);

      setStatus({
        type: "error",
        message:
          error.response?.data?.message ||
          "Registration failed. Please try again.",
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
            <span className="auth-brand">
              <ShieldAlert size={20} />
              <strong>NearHelp</strong>
            </span>
          </div>
        </div>
      </header>

      <section className="auth-body">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-card-icon">
            <UserPlus size={28} />
          </div>
          <h2><strong>Create New Account</strong></h2>
          <p className="subtitle"><strong>Join NearHelp</strong> to help your community</p>

          <label className="input-label" htmlFor="register-name">
            <strong>Name</strong>
          </label>
          <input
            id="register-name"
            className="text-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            autoComplete="name"
          />

          <label className="input-label" htmlFor="register-phone">
            <strong>Phone Number</strong>
          </label>
          <div className="phone-input-wrap">
            <span className="country-code"><strong>+91</strong></span>
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
            <Upload size={14} style={{ marginRight: 4 }} />
            <strong>Avatar (optional)</strong>
          </label>
          <input
            id="register-avatar"
            className="text-input"
            type="file"
            accept="image/*"
            onChange={(e) => setAvatar(e.target.files?.[0] || null)}
          />

          {status.message && (
            <p className={status.type === "success" ? "form-success" : "form-error"}>
              <strong>{status.message}</strong>
            </p>
          )}

          <button type="submit" className="primary-btn" disabled={loading}>
            <strong>{loading ? "Registering..." : "Register"}</strong>
          </button>

          <div className="auth-secondary-actions">
            <button
              type="button"
              className="link-btn"
              onClick={() => navigate("/login")}
            >
              <ArrowLeft size={14} style={{ marginRight: 4 }} />
              <strong>Back to Login</strong>
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default Register;