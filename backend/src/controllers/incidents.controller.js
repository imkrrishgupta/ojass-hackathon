import { SOS } from "../models/sos.model.js";
import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getCrisisGuidance, getDebrief } from "../utils/aiService.js";

// ── Trigger SOS ───────────────────────────────────────────────────────────────
// POST /api/v1/sos
export const triggerSOS = asyncHandler(async (req, res) => {
  const { crisisType, description, lat, lng, radiusMeters } = req.body;

  if (!lat || !lng) {
    throw new ApiError(400, "Location (lat, lng) is required");
  }
  if (!crisisType) {
    throw new ApiError(400, "crisisType is required");
  }

  // Get AI guidance (runs in parallel with SOS creation)
  const aiData = await getCrisisGuidance(crisisType, description);

  const sos = await SOS.create({
    broadcaster: req.user._id,
    crisisType,
    description: description || "",
    location: {
      type: "Point",
      coordinates: [parseFloat(lng), parseFloat(lat)],
    },
    radiusMeters: parseInt(radiusMeters) || 1000,
    aiGuidance: JSON.stringify(aiData),
    aiSummary: aiData.callScript,
  });

  await sos.populate("broadcaster", "fullName skills");

  // Find nearby users for socket broadcast
  const nearbyUsers = await User.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        $maxDistance: parseInt(radiusMeters) || 1000,
      },
    },
    isSuspended: false,
    _id: { $ne: req.user._id },
  }).select("_id fullName skills");

  // Emit via Socket.io to nearby users and guardians
  const io = req.app.get("io");
  if (io) {
    // Guardian Mode — notify guardians first
    const broadcaster = await User.findById(req.user._id).populate("guardians");
    broadcaster.guardians.forEach((guardian) => {
      io.to(`user_${guardian._id}`).emit("guardian:sos_alert", {
        sos: sos.toObject(),
        broadcasterName: req.user.fullName,
      });
    });

    // Broadcast to all nearby users
    nearbyUsers.forEach((u) => {
      io.to(`user_${u._id}`).emit("sos:new", {
        sos: sos.toObject(),
      });
    });

    // Notify admin room
    io.to("admin_room").emit("admin:sos_new", { sos: sos.toObject() });
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        sos,
        aiGuidance: aiData,
        nearbyUsersCount: nearbyUsers.length,
      },
      "SOS triggered successfully"
    )
  );
});

// ── Get Nearby Active SOS ─────────────────────────────────────────────────────
// GET /api/v1/sos/nearby?lat=&lng=&radius=
export const getNearbySOS = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 2000 } = req.query;

  if (!lat || !lng) {
    throw new ApiError(400, "lat and lng query params are required");
  }

  const sosList = await SOS.find({
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
    .json(new ApiResponse(200, { count: sosList.length, sosList }, "Nearby SOS fetched"));
});

// ── Get Single SOS ────────────────────────────────────────────────────────────
// GET /api/v1/sos/:id
export const getSOSById = asyncHandler(async (req, res) => {
  const sos = await SOS.findById(req.params.id)
    .populate("broadcaster", "fullName skills location avatar")
    .populate("responders.user", "fullName skills location avatar");

  if (!sos) throw new ApiError(404, "SOS not found");

  return res.status(200).json(new ApiResponse(200, sos, "SOS fetched"));
});

// ── Respond to SOS ────────────────────────────────────────────────────────────
// POST /api/v1/sos/:id/respond
export const respondToSOS = asyncHandler(async (req, res) => {
  const sos = await SOS.findById(req.params.id);

  if (!sos) throw new ApiError(404, "SOS not found");
  if (sos.status !== "active") {
    throw new ApiError(400, "SOS is no longer active");
  }

  const alreadyResponding = sos.responders.find(
    (r) => String(r.user) === String(req.user._id)
  );
  if (alreadyResponding) {
    throw new ApiError(409, "You are already responding to this SOS");
  }

  const { lat, lng } = req.body;

  sos.responders.push({
    user: req.user._id,
    location: {
      type: "Point",
      coordinates: [parseFloat(lng || 0), parseFloat(lat || 0)],
    },
  });
  await sos.save();
  await sos.populate("responders.user", "fullName skills avatar");

  // System message in chat
  await Message.create({
    sos: sos._id,
    sender: req.user._id,
    content: `${req.user.fullName} is now responding 🚀`,
    messageType: "system",
  });

  // Socket broadcast
  const io = req.app.get("io");
  if (io) {
    io.to(`sos_${sos._id}`).emit("sos:responder_joined", {
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
    .json(new ApiResponse(200, { responders: sos.responders }, "You are now responding"));
});

// ── Resolve SOS ───────────────────────────────────────────────────────────────
// PATCH /api/v1/sos/:id/resolve
export const resolveSOS = asyncHandler(async (req, res) => {
  const sos = await SOS.findById(req.params.id);

  if (!sos) throw new ApiError(404, "SOS not found");
  if (String(sos.broadcaster) !== String(req.user._id)) {
    throw new ApiError(403, "Only the broadcaster can resolve this SOS");
  }
  if (sos.status !== "active") {
    throw new ApiError(400, "SOS is already resolved or expired");
  }

  sos.status = "resolved";
  sos.resolvedAt = new Date();
  sos.resolvedBy = req.user._id;

  // Generate AI debrief
  const durationMinutes = Math.round((sos.resolvedAt - sos.createdAt) / 60000);
  const debrief = await getDebrief(
    sos.crisisType,
    durationMinutes,
    sos.responders.length
  );
  sos.aiDebrief = JSON.stringify(debrief);
  await sos.save();

  // Update responder stats
  if (sos.responders.length > 0) {
    await User.updateMany(
      { _id: { $in: sos.responders.map((r) => r.user) } },
      { $inc: { totalResponses: 1, successfulResponses: 1 } }
    );
  }

  // Socket broadcast
  const io = req.app.get("io");
  if (io) {
    io.to(`sos_${sos._id}`).emit("sos:resolved", { sosId: sos._id, debrief });
    io.to("admin_room").emit("admin:sos_resolved", { sosId: sos._id });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { debrief }, "SOS resolved successfully"));
});

// ── Rate Responder ────────────────────────────────────────────────────────────
// POST /api/v1/sos/:id/rate/:responderId
export const rateResponder = asyncHandler(async (req, res) => {
  const { rating, note } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }

  const sos = await SOS.findById(req.params.id);
  if (!sos) throw new ApiError(404, "SOS not found");
  if (String(sos.broadcaster) !== String(req.user._id)) {
    throw new ApiError(403, "Only broadcaster can rate responders");
  }
  if (sos.status !== "resolved") {
    throw new ApiError(400, "Can only rate after SOS is resolved");
  }

  const responderEntry = sos.responders.find(
    (r) => String(r.user) === String(req.params.responderId)
  );
  if (!responderEntry) throw new ApiError(404, "Responder not in this SOS");

  responderEntry.rating = parseInt(rating);
  responderEntry.ratingNote = note || "";
  await sos.save();

  // Update responder trust score (rolling weighted average)
  const responder = await User.findById(req.params.responderId);
  const newScore =
    (responder.trustScore * responder.totalResponses + rating * 2) /
    (responder.totalResponses + 1);
  responder.trustScore = Math.min(10, newScore);
  await responder.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Rating submitted successfully"));
});

// ── Report False Alert ────────────────────────────────────────────────────────
// POST /api/v1/sos/:id/report-false
export const reportFalseAlert = asyncHandler(async (req, res) => {
  const sos = await SOS.findById(req.params.id);
  if (!sos) throw new ApiError(404, "SOS not found");

  if (sos.falseAlertReports.includes(req.user._id)) {
    throw new ApiError(409, "You have already reported this alert");
  }

  sos.falseAlertReports.push(req.user._id);

  // Auto-flag after 3 reports
  if (sos.falseAlertReports.length >= 3) {
    sos.status = "false_alarm";

    const broadcaster = await User.findById(sos.broadcaster);
    broadcaster.falseAlertCount += 1;
    broadcaster.trustScore = Math.max(0, broadcaster.trustScore - 1.5);

    // Auto-suspend after 3 false alarms
    if (broadcaster.falseAlertCount >= 3) {
      broadcaster.isSuspended = true;
      broadcaster.suspendReason = "Multiple false alerts reported by community";
      broadcaster.suspendedUntil = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      );
    }
    await broadcaster.save({ validateBeforeSave: false });

    // Emit update
    const io = req.app.get("io");
    if (io) {
      io.to(`sos_${sos._id}`).emit("sos:false_alarm", { sosId: sos._id });
    }
  }

  await sos.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "False alert reported"));
});