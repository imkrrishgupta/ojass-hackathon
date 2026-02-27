import axios from "axios";

const baseURL = import.meta.env.VITE_BASE_URL + "/api/v1";

const API = axios.create({
  baseURL,
  withCredentials: true
});

export default API;