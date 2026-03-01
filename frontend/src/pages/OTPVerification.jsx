import { useState, useRef, useEffect } from "react";
import { axiosInstance } from "../api/axios.js";
import { KeyRound, CheckCircle2, RefreshCw, ArrowLeft } from "lucide-react";

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
      const response = await axiosInstance.post("/users/verify-otp", {
        phone: `+91${phone}`,
        otp: otpCode,
      });

      if (response.status === 200) {
        // Store tokens and user info
        const { accessToken, refreshToken, user } = response.data.data;
        const normalizedUser = {
          ...user,
          phone: user?.phone ?? `+91${phone}`,
        };

        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("user", JSON.stringify(normalizedUser));

        onSuccess(user?.role === "admin" ? "admin" : "user");
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
      await axiosInstance.post("/users/send-otp", {
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
        <div className="auth-card-icon">
          <KeyRound size={28} />
        </div>
        <h2><strong>Verify OTP</strong></h2>
        <p className="subtitle"><strong>Enter the 6-digit code</strong> sent to +91{phone}</p>

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

        {error && <p className="form-error"><strong>{error}</strong></p>}

        <button type="submit" className="primary-btn" disabled={loading || otp.some((d) => !d)}>
          <CheckCircle2 size={16} style={{ marginRight: 6 }} />
          <strong>{loading ? "Verifying..." : "Verify OTP"}</strong>
        </button>

        <div className="otp-actions">
          <button
            type="button"
            className="resend-btn"
            onClick={handleResendOtp}
            disabled={!canResend}
          >
            <RefreshCw size={14} style={{ marginRight: 6 }} />
            <strong>{canResend ? "Resend OTP" : `Resend in ${resendTimer}s`}</strong>
          </button>
          <button type="button" onClick={onBack} className="back-btn">
            <ArrowLeft size={14} style={{ marginRight: 6 }} />
            <strong>Change Number</strong>
          </button>
        </div>

        <p className="terms-text">
          By continuing, I agree to the <a href="#"><strong>Terms of Service</strong></a>
        </p>
      </form>
    </section>
  );
}

export default OTPVerification;
