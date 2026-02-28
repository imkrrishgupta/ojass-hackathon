import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PhoneEntry from "./PhoneEntry";
import OTPVerification from "./OTPVerification";
import { ShieldAlert } from "lucide-react";

function Login({ onAuthSuccess }) {
	const navigate = useNavigate();
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

	const handleCreateNewAccount = () => {
		navigate("/register");
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

			{step === "phone" && (
				<PhoneEntry onContinue={handlePhoneContinue} onCreateAccount={handleCreateNewAccount} />
			)}

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
