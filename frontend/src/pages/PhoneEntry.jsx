import { useState } from "react";
import { axiosInstance } from "../api/axios.js";

const phoneRegex = /^[0-9]{10}$/; // 10-digit phone number

function PhoneEntry({ onContinue, onCreateAccount }) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (event) => {
    const value = event.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!phoneRegex.test(phone)) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    setLoading(true);
    try {
      // Request OTP from backend
      const response = await axiosInstance.post("/users/send-otp", {
        phone: `+91${phone}`, // Add country code
      });

      if (response.status === 200) {
        // Pass phone to parent component for OTP verification step
        onContinue(phone);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-body">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Login or Create Account</h2>
        <p className="subtitle">Enter your phone number to proceed</p>

        <div className="phone-input-wrap">
          <span className="country-code">+91</span>
          <input
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="Enter 10-digit number"
            autoComplete="tel"
            maxLength="10"
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <button
          type="submit"
          className="primary-btn"
          disabled={!phoneRegex.test(phone) || loading}
        >
          {loading ? "Sending OTP..." : "Continue"}
        </button>

        <p className="terms-text">
          By continuing, I agree to the <a href="#">Terms of Service</a>
        </p>

        <div className="auth-secondary-actions">
          <button type="button" className="link-btn" onClick={onCreateAccount}>
            Create New Account
          </button>
        </div>
      </form>
    </section>
  );
}

export default PhoneEntry;
