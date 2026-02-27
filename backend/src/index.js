import dotenv from "dotenv";
import { connectDB } from "./db/index.js";
import { app } from "./app.js";

import http from "http";
import { Server } from "socket.io";

dotenv.config({
    path: "./.env" 
});

const PORT = process.env.PORT;

// 🔥 create HTTP server from express
const server = http.createServer(app);

// 🔥 attach socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? process.env.CORS_ORIGIN_PROD : process.env.CORS_ORIGIN_DEV,
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

    users.forEach((user) => {
      const distance = getDistance(
        incident.lat,
        incident.lng,
        user.lat,
        user.lng
      );

      // 🔥 only within 2km
      if (distance <= 2) {
        // Include distance in the emitted data
        io.to(user.socketId).emit("INCIDENT_NEARBY", {
          ...incident,
          distance: distance // distance in km
        });
      }
    });
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