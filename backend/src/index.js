import dotenv from "dotenv";
import { connectDB } from "./db/index.js";
import { app } from "./app.js";
import http from "http";
import { Server } from "socket.io";
import { Incident } from "./models/incident.model.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

const PORT = process.env.PORT || 5050;

// create http server
const server = http.createServer(app);

// socket server
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? process.env.CORS_ORIGIN_PROD : process.env.CORS_ORIGIN_DEV,
    credentials: true,
  },
});

const users = new Map(); 

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// socket connection
io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);

  // store user location
  socket.on("REGISTER_LOCATION", ({ lat, lng }) => {
    if (!lat || !lng) return;

    users.set(socket.id, { lat, lng });
    console.log("📍 Users online:", users.size);
  });

  // create incident
  socket.on("INCIDENT_UPDATE", async (data) => {
    try {
      const { userId, lat, lng, type, description } = data;

      if (!lat || !lng || !type) return;

      // severity auto
      let severity = "low";
      if (type === "gas_leak" || type === "medical") severity = "high";
      if (type === "urgent_help") severity = "medium";

      // save incident
      const incident = await Incident.create({
        createdBy: userId,
        type,
        description: description || "",
        location: {
          type: "Point",
          coordinates: [Number(lng), Number(lat)],
        },
        severity,
        radiusMeters: 2000,
        status: "open",
      });

      const radiusKm = (incident.radiusMeters || 2000) / 1000;

      // send only nearby users
      for (const [socketId, user] of users.entries()) {
        const [incidentLng, incidentLat] = incident.location.coordinates;
        const distance = getDistance(incidentLat, incidentLng, user.lat, user.lng);

        if (distance <= radiusKm) {
          io.to(socketId).emit("INCIDENT_NEARBY", {
            ...incident.toObject(),
            distance,
          });
        }
      }

    } catch (err) {
      console.error("❌ Incident error:", err.message);
    }
  });

  // responder joined
  socket.on("RESPONDER_UPDATE", (payload) => {
    io.emit("INCIDENT_RESPONDER", payload);
  });

  // incident resolved
  socket.on("INCIDENT_RESOLVED", (payload) => {
    io.emit("INCIDENT_CLOSED", payload);
  });

  // disconnect
  socket.on("disconnect", () => {
    users.delete(socket.id);
    console.log("🔴 Disconnected:", socket.id);
  });
});

// start server
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please run: lsof -ti:${PORT} | xargs kill -9`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', err);
        process.exit(1);
      }
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB error:", err);
    process.exit(1);
  });