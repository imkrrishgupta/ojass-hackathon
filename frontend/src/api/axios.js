import axios from "axios";

const apiHost = import.meta.env.VITE_BASE_URL || "http://localhost:5050";
const baseURL = `${apiHost}/api/v1`;

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export { axiosInstance };
export default axiosInstance;
