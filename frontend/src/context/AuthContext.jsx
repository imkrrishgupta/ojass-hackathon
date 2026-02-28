import { useContext, useEffect, useState, createContext } from 'react'
import api from "../api/axios.js"
import { axiosInstance } from "../api/axios.js"
import { useNavigate } from 'react-router-dom';

const UserContext = createContext();
const API = api;

// Persist user's live location to the database so geo-queries ($near) work
const persistLocationToDB = () => {
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        await axiosInstance.patch("/users/location", {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        console.log("[Auth] Location persisted to DB:", pos.coords.latitude, pos.coords.longitude);
      } catch (err) {
        console.warn("[Auth] Failed to persist location:", err.message);
      }
    },
    (err) => console.warn("[Auth] Geolocation denied:", err.message)
  );
};

const AuthContext = ({children}) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
      const verifyUser = async () => {  // Call on server(backend) side and verify the user
        try {
          const response = await API.get("/verify")

          if (response.data.success){  // Means user is authenticated
            setUser(response.data.data.user);
            // Persist location to DB so volunteer geo-queries work
            persistLocationToDB();
          }

        } catch (error) {
          setUser(null);
          if (error.response?.status === 401){
            navigate('/login', { replace: true });
            return;
          }
          
          console.log("Unexpected verify error", error.message);

        } finally{
          setLoading(false);
        }
      }
      verifyUser();
    }, [])

    const login = async (user) => {
      setUser(user);
      persistLocationToDB();
    }

    const logout = async () => {
      await API.post("/users/logout");
      setUser(null);
    }

  return (
    <UserContext.Provider value={{user, login, logout, loading}}>
        {children}
    </UserContext.Provider>
  )
}

export const useAuth = () => useContext(UserContext);
export default AuthContext;