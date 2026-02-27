import { useState } from "react";
import PhoneEntry from "./PhoneEntry";
import OTPVerification from "./OTPVerification";
import nearhelpLogo from "../assets/nearhelp-logo.svg";

function Login({ onUserLoginSuccess, onAdminLogin }) {
	const [step, setStep] = useState("phone"); // phone or otp
	const [phone, setPhone] = useState("");

	const handlePhoneContinue = (enteredPhone) => {
		setPhone(enteredPhone);
		setStep("otp");
	};

	const handleOTPSuccess = (userType) => {
		if (userType === "admin") {
			onAdminLogin();
		} else {
			onUserLoginSuccess();
		}
	};

	const handleBackToPhone = () => {
		setPhone("");
		setStep("phone");
	};

	return (
		<main className="auth-page">
			<header className="auth-topbar">
				<div className="auth-topbar-inner">
					<div className="auth-logo-wrap">
						<img className="auth-logo" src={nearhelpLogo} alt="NearHelp" />
					</div>
					<button type="button" className="admin-login-btn" onClick={onAdminLogin}>
						Admin Login
					</button>
				</div>
			</header>

			{step === "phone" && <PhoneEntry onContinue={handlePhoneContinue} />}

			{step === "otp" && (
				<OTPVerification
					phone={phone}
					onSuccess={handleOTPSuccess}
					onBack={handleBackToPhone}
				/>
			)}
		</main>
	);
}

export default Login;
