import { Message } from "../models/message.model.js";
import { Incident } from "../models/incident.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ── Get All Messages for an Incident ─────────────────────────────────────────
// GET /api/v1/chat/:incidentId
export const getMessages = asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.incidentId);
  if (!incident) throw new ApiError(404, "Incident not found");

  const messages = await Message.find({ incident: req.params.incidentId })
    .populate("sender", "fullName skills avatar")
    .sort({ createdAt: 1 }); // oldest first

  return res
    .status(200)
    .json(new ApiResponse(200, messages, "Messages fetched"));
});

// ── Send a Message ────────────────────────────────────────────────────────────
// POST /api/v1/chat/:incidentId
export const sendMessage = asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.incidentId);
  if (!incident) throw new ApiError(404, "Incident not found");

  // Only the broadcaster and active responders can send messages
  const isBroadcaster =
    String(incident.broadcaster) === String(req.user._id);
  const isResponder = incident.responders.some(
    (r) => String(r.user) === String(req.user._id)
  );

  if (!isBroadcaster && !isResponder) {
    throw new ApiError(
      403,
      "Only incident participants can send messages"
    );
  }

  const { content } = req.body;
  if (!content?.trim()) {
    throw new ApiError(400, "Message content cannot be empty");
  }

  const message = await Message.create({
    incident: req.params.incidentId,
    sender: req.user._id,
    content: content.trim(),
    messageType: "text",
  });

  await message.populate("sender", "fullName skills avatar");

  // Broadcast to everyone in the incident socket room
  const io = req.app.get("io");
  if (io) {
    io.to(`incident_${incident._id}`).emit("chat:message", { message });
  }

  return res
    .status(201)
    .json(new ApiResponse(201, message, "Message sent"));
});