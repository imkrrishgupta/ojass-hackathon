import { useState } from "react";
import PhoneEntry from "./PhoneEntry";
import OTPVerification from "./OTPVerification";
import nearhelpLogo from "../assets/nearhelp-logo.svg";

function Login({ onAuthSuccess }) {
	const [step, setStep] = useState("phone"); // phone or otp
	const [phone, setPhone] = useState("");

	const handlePhoneContinue = (enteredPhone) => {
		setPhone(enteredPhone);
		setStep("otp");
	};

	const handleOTPSuccess = (userType) => {
		onAuthSuccess(userType);
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
