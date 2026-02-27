import dotenv from "dotenv";
import { connectDB } from "./db/index.js";
import { app } from "./app.js";
import path from "path";
import { fileURLToPath } from "url";

import http from "http";
import { Server } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

const PORT = process.env.PORT;

// 🔥 create HTTP server from express
const server = http.createServer(app);

// 🔥 attach socket.io
const io = new Server(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.CORS_ORIGIN_PROD || process.env.FRONTEND_URL
        : process.env.CORS_ORIGIN_DEV || process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
  }
});

// store connected users with location
let users = [];
// { socketId, lat, lng }

// 📏 Haversine distance function (km)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 🔌 socket logic
io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  // 📍 user sends location after login/dashboard load
  socket.on("REGISTER_LOCATION", ({ lat, lng }) => {
    users = users.filter(u => u.socketId !== socket.id);

    users.push({
      socketId: socket.id,
      lat,
      lng
    });

    console.log("Active users:", users.length);
  });

  // 🚨 incident created by any user
  socket.on("INCIDENT_UPDATE", (incident) => {
    console.log("🚨 Incident received");

    const radiusKm = Number(incident.radiusMeters || 2000) / 1000;

    users.forEach((user) => {
      const distance = getDistance(
        incident.lat,
        incident.lng,
        user.lat,
        user.lng
      );

      // configurable radius (default 2km)
      if (distance <= radiusKm) {
        // Include distance in the emitted data
        io.to(user.socketId).emit("INCIDENT_NEARBY", {
          ...incident,
          distance: distance // distance in km
        });
      }
    });
  });

  socket.on("RESPONDER_UPDATE", (payload) => {
    io.emit("INCIDENT_RESPONDER", payload);
  });

  socket.on("INCIDENT_RESOLVED", (payload) => {
    io.emit("INCIDENT_CLOSED", payload);
  });

  socket.on("disconnect", () => {
    users = users.filter(u => u.socketId !== socket.id);
    console.log("❌ User disconnected");
  });
});

// start server
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("❌ MongoDB connection error", err);
  });