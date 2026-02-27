import { useState } from "react";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import UserDashboard from "./pages/UserDashboard";

function App() {
  const [view, setView] = useState("auth");

  const openUserDashboard = () => {
    setView("user-dashboard");
  };

  const openAdminDashboard = () => {
    setView("admin-dashboard");
  };

  const backToLogin = () => {
    setView("auth");
  };

  return (
    <>
      {view === "auth" && (
        <Login onUserLoginSuccess={openUserDashboard} onAdminLogin={openAdminDashboard} />
      )}

      {view === "user-dashboard" && <UserDashboard onLogout={backToLogin} />}

      {view === "admin-dashboard" && <AdminDashboard onLogout={backToLogin} />}
    </>
  );
}

export default App;
