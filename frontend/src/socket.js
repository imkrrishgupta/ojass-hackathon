import { io } from "socket.io-client";

const BACKEND_URL =
  import.meta.env.VITE_BASE_URL

export const socket = io(BACKEND_URL, {
  transports: ["websocket"],
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});