import { useContext, useEffect, useState, createContext } from 'react'
import api from "../api/axios.js"
import { useNavigate } from 'react-router-dom';

const UserContext = createContext();
const API = api;

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