import { useMemo, useState } from "react";
import ExistingUserLogin from "./OldUserLogin";
import NewUserRegister from "./NewUserRegister";
import PhoneEntry from "./PhoneEntry";
import nearhelpLogo from "../assets/nearhelp-logo.svg";

const STORAGE_KEY = "ojass_auth_users";

const sanitizeEmail = (value) => value.trim().toLowerCase();

const readUsers = () => {
	const rawUsers = localStorage.getItem(STORAGE_KEY);

	if (!rawUsers) {
		return [];
	}

	try {
		const parsedUsers = JSON.parse(rawUsers);
		return Array.isArray(parsedUsers) ? parsedUsers : [];
	} catch {
		return [];
	}
};

const writeUsers = (users) => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
};

function Login({ onUserLoginSuccess, onAdminLogin }) {
	const [step, setStep] = useState("email");
	const [email, setEmail] = useState("");

	const users = useMemo(readUsers, [step]);

	const handleEmailContinue = (enteredEmail) => {
		const normalizedEmail = sanitizeEmail(enteredEmail);
		const existingUser = users.find((user) => user.email === normalizedEmail);

		setEmail(normalizedEmail);
		setStep(existingUser ? "existing" : "new");
	};

	const handleLogin = (password) => {
		const matchedUser = users.find(
			(user) => user.email === email && user.password === password
		);

		if (!matchedUser) {
			return { ok: false, message: "Invalid password. Please try again." };
		}

		return { ok: true, message: `Welcome back, ${matchedUser.name}!` };
	};

	const handleRegister = ({ name, password }) => {
		const updatedUsers = [
			...users,
			{
				name,
				email,
				password,
			},
		];

		writeUsers(updatedUsers);

		return { ok: true, message: "Account created successfully. Please login." };
	};

	const goBackToEmail = () => {
		setEmail("");
		setStep("email");
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

			{step === "email" && <PhoneEntry onContinue={handleEmailContinue} />}

			{step === "existing" && (
				<ExistingUserLogin
					email={email}
					onBack={goBackToEmail}
					onLogin={handleLogin}
					onSwitchToSignUp={() => setStep("new")}
					onLoginSuccess={onUserLoginSuccess}
				/>
			)}

			{step === "new" && (
				<NewUserRegister
					email={email}
					onBack={goBackToEmail}
					onRegister={handleRegister}
					onRegistered={() => setStep("existing")}
					onSwitchToSignIn={() => setStep("existing")}
				/>
			)}
		</main>
	);
}

export default Login;
