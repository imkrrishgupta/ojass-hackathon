import { io } from "socket.io-client";

const BACKEND_URL =
  import.meta.env.VITE_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5050";

export const socket = io(BACKEND_URL, {
  transports: ["websocket"],
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const registerLocation = ({ lat, lng }) => {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return;

  const token = localStorage.getItem("accessToken");
  const user = getStoredUser();
  const userId = user?._id;

  if (!token || !userId) return;

  socket.emit("REGISTER_LOCATION", {
    lat: parsedLat,
    lng: parsedLng,
    userId,
  });
};

export const emitIncidentUpdate = (incidentData) => {
  const user = getStoredUser();
  const userId = user?._id;
  const parsedLat = Number(incidentData?.lat);
  const parsedLng = Number(incidentData?.lng);
  const type = incidentData?.type;
  const description = incidentData?.description || incidentData?.title || "";

  if (!userId || !Number.isFinite(parsedLat) || !Number.isFinite(parsedLng) || !type) return;

  socket.emit("INCIDENT_UPDATE", {
    userId,
    type,
    description,
    lat: parsedLat,
    lng: parsedLng,
  });
};

export const emitResponderUpdate = (payload) => {
  socket.emit("RESPONDER_UPDATE", payload);
};

export const emitIncidentResolved = (payload) => {
  socket.emit("INCIDENT_RESOLVED", payload);
};