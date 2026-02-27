import { io } from "socket.io-client";

const SOCKET_URL =
	import.meta?.env?.VITE_SOCKET_URL || import.meta?.env?.VITE_BASE_URL || "http://localhost:5050";

export const socket = io(SOCKET_URL ?? undefined, {
	withCredentials: true,
	transports: ["websocket"],
	autoConnect: true
});

export const registerLocation = ({ lat, lng }) => {
	if (!socket.connected) return;
	socket.emit("REGISTER_LOCATION", { lat, lng });
};

export const emitIncidentUpdate = (incident) => {
	if (!socket.connected) return;
	socket.emit("INCIDENT_UPDATE", incident);
};

export const emitResponderUpdate = (payload) => {
	if (!socket.connected) return;
	socket.emit("RESPONDER_UPDATE", payload);
};

export const emitIncidentResolved = (payload) => {
	if (!socket.connected) return;
	socket.emit("INCIDENT_RESOLVED", payload);
};
