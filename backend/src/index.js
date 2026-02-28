import dotenv from "dotenv";
import { connectDB } from "./db/index.js";
import { app } from "./app.js";
import http from "http";
import { Server } from "socket.io";
import { Incident } from "./models/incident.model.js";
import { User } from "./models/user.model.js";
import { setIO } from "./socketInstance.js";
import { registerUserSocket, removeUserSocket } from "./socketInstance.js";
import { sendEmergencySMS } from "./utils/alertSMS.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: "./.env",
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

// Share io instance so controllers can emit events
setIO(io);

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

<<<<<<< HEAD
  // store user location (in-memory + persist to MongoDB)
  socket.on("REGISTER_LOCATION", async ({ lat, lng, userId }) => {
    if (!lat || !lng) return;

    users.set(socket.id, { lat, lng, userId });
=======
  // store user location + register userId↔socketId mapping
  socket.on("REGISTER_LOCATION", ({ lat, lng, userId }) => {
    if (!lat || !lng) return;

    users.set(socket.id, { lat, lng, userId });
    if (userId) registerUserSocket(userId, socket.id);
>>>>>>> 981559b (Implement chat room functionality for incident creators and responders)
    console.log("📍 Users online:", users.size);

    // Persist location to database so $near queries work
    if (userId) {
      try {
        await User.findByIdAndUpdate(userId, {
          location: {
            type: "Point",
            coordinates: [Number(lng), Number(lat)],
          },
          lastSeen: new Date(),
        });
        console.log(`📍 DB location updated for user ${userId}: [${lng}, ${lat}]`);
      } catch (err) {
        console.error("📍 Failed to persist location:", err.message);
      }
    }
  });

  // create incident
  socket.on("INCIDENT_UPDATE", async (data) => {
    try {
      const { userId, lat, lng, type, description } = data;

      if (!lat || !lng || !type) return;

      // severity auto
      const typeLower = String(type).toLowerCase();
      let severity = "low";
      if (typeLower === "health" || typeLower === "fire") severity = "high";
      if (typeLower === "road") severity = "medium";

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

      // --- Auto-dispatch best volunteer via socket path ---
      try {
        const candidates = await User.find({
          _id: { $ne: userId },
          isSuspended: false,
          location: {
            $near: {
              $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
              $maxDistance: incident.radiusMeters || 2000,
            },
          },
        }).select("fullName phone trustScore volunteerRating skills location").limit(10);

        if (candidates.length) {
          // Pick the highest-rated candidate
          candidates.sort((a, b) => (b.volunteerRating || 0) - (a.volunteerRating || 0));
          const best = candidates[0];
          const [cLng, cLat] = best.location?.coordinates || [0, 0];
          const distanceKm = getDistance(Number(lat), Number(lng), cLat, cLng);

          incident.responders.push({ userId: best._id });
          incident.autoDispatch = {
            volunteerId: best._id,
            volunteerName: best.fullName || "",
            volunteerPhone: best.phone || "",
            distanceKm: Number(distanceKm.toFixed(2)),
            rating: best.volunteerRating || 50,
            dispatchedAt: new Date(),
            status: "dispatched",
            reason: "Auto-dispatched (socket path)",
          };
          await incident.save();

          // Notify dispatched volunteer via socket
          io.emit("VOLUNTEER_DISPATCHED", {
            incidentId: incident._id,
            incidentType: type,
            description: description || "",
            volunteerId: String(best._id),
            volunteerName: best.fullName,
            distanceKm: Number(distanceKm.toFixed(2)),
            lat: Number(lat),
            lng: Number(lng),
          });

          // Send SMS
          try {
            if (best.phone) {
              await sendEmergencySMS({
                phones: [best.phone],
                message: `NEARHELP AUTO-DISPATCH: You are assigned to a ${type.toUpperCase()} incident. Open app to navigate.`,
              });
            }
          } catch {}
        }
      } catch (dispatchErr) {
        console.error("[Socket AutoDispatch]", dispatchErr.message);
      }

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

  // ── Per-incident chat rooms ──
  // Client emits this to join the chat room for an incident
  socket.on("JOIN_INCIDENT_CHAT", ({ incidentId, userName }) => {
    if (!incidentId) return;
    const room = `chat:${incidentId}`;
    socket.join(room);
    console.log(`💬 ${userName || socket.id} joined room ${room}`);
    // Announce to everyone in the room
    io.to(room).emit("CHAT_MESSAGE", {
      incidentId,
      sender: "System",
      message: `${userName || "A responder"} joined the chat`,
      timestamp: new Date().toISOString(),
      isSystem: true,
    });
  });

  socket.on("LEAVE_INCIDENT_CHAT", ({ incidentId }) => {
    if (!incidentId) return;
    socket.leave(`chat:${incidentId}`);
  });

  socket.on("SEND_CHAT_MESSAGE", ({ incidentId, sender, message }) => {
    if (!incidentId || !message) return;
    // Send to everyone in the incident's chat room
    io.to(`chat:${incidentId}`).emit("CHAT_MESSAGE", {
      incidentId,
      sender: sender || "Anonymous",
      message,
      timestamp: new Date().toISOString(),
      isSystem: false,
    });
  });

  // incident resolved
  socket.on("INCIDENT_RESOLVED", (payload) => {
    io.emit("INCIDENT_CLOSED", payload);
  });

  // disconnect
  socket.on("disconnect", () => {
    users.delete(socket.id);
    removeUserSocket(socket.id);
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