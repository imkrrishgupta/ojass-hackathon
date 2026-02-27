import { useState, useRef, useEffect } from "react";
import { axiosInstance } from "../api/axios.js";

function OTPVerification({ phone, onSuccess, onBack }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input if value is entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (index, event) => {
    if (event.key === "Backspace") {
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);

      // Move to previous input if backspace is pressed
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter a complete 6-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post("/api/v1/users/verify-otp", {
        phone: `+91${phone}`,
        otp: otpCode,
      });

      if (response.status === 200) {
        // Store tokens and user info
        const { accessToken, refreshToken, user } = response.data.data;
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("user", JSON.stringify(user));

        // Check if user is admin
        if (user.role === "admin") {
          onSuccess("admin");
        } else {
          onSuccess("user");
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setCanResend(false);
    setResendTimer(30);

    try {
      await axiosInstance.post("/api/v1/users/send-otp", {
        phone: `+91${phone}`,
      });
      setOtp(["", "", "", "", "", ""]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP.");
      setCanResend(true);
    }
  };

  return (
    <section className="auth-body">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Verify OTP</h2>
        <p className="subtitle">Enter the 6-digit code sent to +91{phone}</p>

        <div className="otp-input-wrap">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleBackspace(index, e)}
              maxLength="1"
              className="otp-input"
              inputMode="numeric"
            />
          ))}
        </div>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="primary-btn" disabled={loading || otp.some((d) => !d)}>
          {loading ? "Verifying..." : "Verify OTP"}
        </button>

        <div className="otp-actions">
          <button
            type="button"
            className="resend-btn"
            onClick={handleResendOtp}
            disabled={!canResend}
          >
            {canResend ? "Resend OTP" : `Resend in ${resendTimer}s`}
          </button>
          <button type="button" onClick={onBack} className="back-btn">
            Change Number
          </button>
        </div>

        <p className="terms-text">
          By continuing, I agree to the <a href="#">Terms of Service</a>
        </p>
      </form>
    </section>
  );
}

export default OTPVerification;
