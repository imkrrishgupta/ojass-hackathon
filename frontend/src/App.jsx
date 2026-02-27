import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import UserDashboard from "./pages/UserDashboard";

function App() {
  const navigate = useNavigate();

  const openUserDashboard = () => {
    navigate("/userdashboard");
  };

  const openAdminDashboard = () => {
    navigate("/admindashboard");
  };

  const backToLogin = () => {
    navigate("/login");
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={<Login onUserLoginSuccess={openUserDashboard} onAdminLogin={openAdminDashboard} />}
      />
      <Route path="/user-dashboard" element={<UserDashboard onLogout={backToLogin} />} />
      <Route path="/admin-dashboard" element={<AdminDashboard onLogout={backToLogin} />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
