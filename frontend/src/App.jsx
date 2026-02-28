import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";
import ReportIncident from "./pages/ReportIncident";
import UserDashboard from "./pages/UserDashboard";
import SkillRegistry from "./pages/SkillRegistry";
import CommunityResources from "./pages/CommunityResources";

const ADMIN_PHONE = "9625113505";

const getStoredUser = () => {
  try {
    const rawUser = localStorage.getItem("user");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
};

const normalizePhone = (phone) => String(phone ?? "").replace(/\D/g, "").slice(-10);

const isAuthenticated = () => Boolean(localStorage.getItem("accessToken"));

const isAdminUser = () => {
  const user = getStoredUser();
  return normalizePhone(user?.phone) === ADMIN_PHONE;
};

function App() {
  const navigate = useNavigate();

  const handleAuthSuccess = (userType) => {
    if (userType === "admin") {
      navigate("/admin-dashboard");
      return;
    }
    navigate("/user-dashboard");
  };

  const backToLogin = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated() ? (
            isAdminUser() ? <Navigate to="/admin-dashboard" replace /> : <Navigate to="/user-dashboard" replace />
          ) : (
            <Login onAuthSuccess={handleAuthSuccess} />
          )
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated() ? (
            isAdminUser() ? <Navigate to="/admin-dashboard" replace /> : <Navigate to="/user-dashboard" replace />
          ) : (
            <Register />
          )
        }
      />
      <Route path="/user-dashboard" element={<UserDashboard onLogout={backToLogin} />} />
      <Route path="/report-incident" element={<ReportIncident />} />
      <Route path="/skill-registry" element={<SkillRegistry />} />
      <Route path="/community-resources" element={<CommunityResources />} />
      <Route
        path="/admin-dashboard"
        element={<AdminDashboard onLogout={backToLogin} />}
      />
      <Route path="/admin" element={<Navigate to="/admin-dashboard" replace />} />
      <Route path="/userdashboard" element={<Navigate to="/user-dashboard" replace />} />
      <Route path="/admindashboard" element={<Navigate to="/admin-dashboard" replace />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
