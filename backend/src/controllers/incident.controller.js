import { Incident } from "../models/incident.model.js";
import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getCrisisGuidance, getDebrief } from "../utils/aiService.js";

// ── Trigger Incident ──────────────────────────────────────────────────────────
// POST /api/v1/incidents
export const triggerIncident = asyncHandler(async (req, res) => {
  const { incidentType, description, lat, lng, radiusMeters } = req.body;

  if (!lat || !lng) throw new ApiError(400, "Location (lat, lng) is required");
  if (!incidentType) throw new ApiError(400, "incidentType is required");

  // Get AI first-response guidance before creating incident
  const aiData = await getCrisisGuidance(incidentType, description);

  const incident = await Incident.create({
    broadcaster: req.user._id,
    incidentType,
    description: description || "",
    location: {
      type: "Point",
      coordinates: [parseFloat(lng), parseFloat(lat)], // MongoDB: [lng, lat]
    },
    radiusMeters: parseInt(radiusMeters) || 1000,
    aiGuidance: JSON.stringify(aiData),
    aiSummary: aiData.callScript,
  });

  await incident.populate("broadcaster", "fullName skills phone avatar");

  // ── Find Nearby Users Using $near ─────────────────────────────────────────
  //
  // All online users continuously push their GPS to MongoDB via socket
  // (socket event: "user:location" every ~5s).
  //
  // $near searches the 2dsphere-indexed location field across ALL user
  // documents and returns only those within maxDistance — in milliseconds.
  //
  // Filters applied:
  //   - Exclude the broadcaster themselves
  //   - Exclude suspended accounts
  //   - Only users active in last 10 minutes (their location data is fresh)
  //
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const nearbyUsers = await User.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        $maxDistance: parseInt(radiusMeters) || 1000, // meters
      },
    },
    _id: { $ne: req.user._id },
    isSuspended: false,
    lastSeen: { $gte: tenMinutesAgo },
  }).select("_id fullName skills phone");

  // ── Emit via Socket.io ────────────────────────────────────────────────────
  const io = req.app.get("io");
  if (io) {
    // Guardian Mode — notify broadcaster's guardians first
    const broadcasterWithGuardians = await User.findById(
      req.user._id
    ).populate("guardians");

    broadcasterWithGuardians.guardians.forEach((guardian) => {
      io.to(`user_${guardian._id}`).emit("guardian:incident_alert", {
        incident: incident.toObject(),
        broadcasterName: req.user.fullName,
        broadcasterPhone: req.user.phone,
      });
    });

    // Notify all nearby active users via their personal socket rooms
    nearbyUsers.forEach((u) => {
      io.to(`user_${u._id}`).emit("incident:new", {
        incident: incident.toObject(),
      });
    });

    // Live feed for admin dashboard
    io.to("admin_room").emit("admin:incident_new", {
      incident: incident.toObject(),
    });
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        incident,
        aiGuidance: aiData,
        nearbyUsersNotified: nearbyUsers.length,
      },
      "Incident triggered successfully"
    )
  );
});

// ── Get Nearby Active Incidents ───────────────────────────────────────────────
// GET /api/v1/incidents/nearby?lat=&lng=&radius=
export const getNearbyIncidents = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 2000 } = req.query;

  if (!lat || !lng) {
    throw new ApiError(400, "lat and lng query params are required");
  }

  const incidents = await Incident.find({
    status: "active",
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        $maxDistance: parseInt(radius),
      },
    },
  }).populate("broadcaster", "fullName skills avatar");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { count: incidents.length, incidents },
        "Nearby incidents fetched"
      )
    );
});

// ── Get Single Incident ───────────────────────────────────────────────────────
// GET /api/v1/incidents/:id
export const getIncidentById = asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.id)
    .populate("broadcaster", "fullName skills location avatar phone")
    .populate("responders.user", "fullName skills location avatar");

  if (!incident) throw new ApiError(404, "Incident not found");

  return res.status(200).json(new ApiResponse(200, incident, "Incident fetched"));
});

// ── Respond to Incident — "I'm Responding" ────────────────────────────────────
// POST /api/v1/incidents/:id/respond
export const respondToIncident = asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.id);

  if (!incident) throw new ApiError(404, "Incident not found");
  if (incident.status !== "active") {
    throw new ApiError(400, "Incident is no longer active");
  }

  const alreadyResponding = incident.responders.find(
    (r) => String(r.user) === String(req.user._id)
  );
  if (alreadyResponding) {
    throw new ApiError(409, "You are already responding to this incident");
  }

  const { lat, lng } = req.body;

  incident.responders.push({
    user: req.user._id,
    location: {
      type: "Point",
      coordinates: [parseFloat(lng || 0), parseFloat(lat || 0)],
    },
  });
  await incident.save();
  await incident.populate("responders.user", "fullName skills avatar");

  // Auto-create a system message in the incident chat
  await Message.create({
    incident: incident._id,
    sender: req.user._id,
    content: `${req.user.fullName} is now responding 🚀`,
    messageType: "system",
  });

  // Notify everyone in the incident room
  const io = req.app.get("io");
  if (io) {
    io.to(`incident_${incident._id}`).emit("incident:responder_joined", {
      responder: {
        id: req.user._id,
        fullName: req.user.fullName,
        skills: req.user.skills,
        avatar: req.user.avatar,
        location: { lat, lng },
      },
    });
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { responders: incident.responders },
        "You are now responding"
      )
    );
});

// ── Resolve Incident ──────────────────────────────────────────────────────────
// PATCH /api/v1/incidents/:id/resolve
export const resolveIncident = asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.id);

  if (!incident) throw new ApiError(404, "Incident not found");
  if (String(incident.broadcaster) !== String(req.user._id)) {
    throw new ApiError(403, "Only the broadcaster can resolve this incident");
  }
  if (incident.status !== "active") {
    throw new ApiError(400, "Incident is already resolved or expired");
  }

  incident.status = "resolved";
  incident.resolvedAt = new Date();
  incident.resolvedBy = req.user._id;

  // Generate AI post-resolution debrief
  const durationMinutes = Math.round(
    (incident.resolvedAt - incident.createdAt) / 60000
  );
  const debrief = await getDebrief(
    incident.incidentType,
    durationMinutes,
    incident.responders.length
  );
  incident.aiDebrief = JSON.stringify(debrief);
  await incident.save();

  // Increment responder stats
  if (incident.responders.length > 0) {
    await User.updateMany(
      { _id: { $in: incident.responders.map((r) => r.user) } },
      { $inc: { totalResponses: 1, successfulResponses: 1 } }
    );
  }

  // Emit — incident pin disappears from map for everyone
  const io = req.app.get("io");
  if (io) {
    io.to(`incident_${incident._id}`).emit("incident:resolved", {
      incidentId: incident._id,
      debrief,
    });
    io.to("admin_room").emit("admin:incident_resolved", {
      incidentId: incident._id,
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { debrief }, "Incident resolved successfully"));
});

// ── Rate Responder ────────────────────────────────────────────────────────────
// POST /api/v1/incidents/:id/rate/:responderId
export const rateResponder = asyncHandler(async (req, res) => {
  const { rating, note } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }

  const incident = await Incident.findById(req.params.id);
  if (!incident) throw new ApiError(404, "Incident not found");

  if (String(incident.broadcaster) !== String(req.user._id)) {
    throw new ApiError(403, "Only the broadcaster can rate responders");
  }
  if (incident.status !== "resolved") {
    throw new ApiError(400, "Can only rate responders after incident is resolved");
  }

  const responderEntry = incident.responders.find(
    (r) => String(r.user) === String(req.params.responderId)
  );
  if (!responderEntry) {
    throw new ApiError(404, "Responder not found in this incident");
  }

  responderEntry.rating = parseInt(rating);
  responderEntry.ratingNote = note || "";
  await incident.save();

  // Update responder trust score — rolling weighted average
  const responder = await User.findById(req.params.responderId);
  const newScore =
    (responder.trustScore * responder.totalResponses + parseInt(rating) * 2) /
    (responder.totalResponses + 1);
  responder.trustScore = Math.min(10, newScore);
  await responder.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Rating submitted successfully"));
});

// ── Report False Alert ────────────────────────────────────────────────────────
// POST /api/v1/incidents/:id/report-false
export const reportFalseAlert = asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.id);
  if (!incident) throw new ApiError(404, "Incident not found");

  if (incident.falseAlertReports.includes(req.user._id)) {
    throw new ApiError(409, "You have already reported this alert");
  }

  incident.falseAlertReports.push(req.user._id);

  // Auto-flag as false_alarm after 3 community reports
  if (incident.falseAlertReports.length >= 3) {
    incident.status = "false_alarm";

    const broadcaster = await User.findById(incident.broadcaster);
    broadcaster.falseAlertCount += 1;
    broadcaster.trustScore = Math.max(0, broadcaster.trustScore - 1.5);

    // Auto-suspend after 3 false alarms total
    if (broadcaster.falseAlertCount >= 3) {
      broadcaster.isSuspended = true;
      broadcaster.suspendReason =
        "Multiple false alerts reported by the community";
      broadcaster.suspendedUntil = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
      );
    }
    await broadcaster.save({ validateBeforeSave: false });

    const io = req.app.get("io");
    if (io) {
      io.to(`incident_${incident._id}`).emit("incident:false_alarm", {
        incidentId: incident._id,
      });
    }
  }

  await incident.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "False alert reported"));
});