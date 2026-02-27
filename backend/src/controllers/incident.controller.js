import { Incident } from "../models/incident.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { runLLMJson } from "../utils/llm.js";

const sanitizePhone = (phone) => String(phone ?? "").replace(/\D/g, "").slice(-10);

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
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
};

export const createIncident = asyncHandler(async (req, res) => {
  const { type, description, radiusMeters, lat, lng } = req.body;

  if (!type || lat === undefined || lng === undefined) {
    throw new ApiError(400, "type, lat and lng are required");
  }

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
    throw new ApiError(400, "Invalid latitude or longitude");
  }

  const incident = await Incident.create({
    createdBy: req.user._id,
    reporterName: req.user.fullName || "User",
    reporterPhone: sanitizePhone(req.user.phone),
    type,
    description: description || "",
    radiusMeters: [500, 1000, 2000].includes(Number(radiusMeters))
      ? Number(radiusMeters)
      : 2000,
    location: {
      type: "Point",
      coordinates: [parsedLng, parsedLat],
    },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, incident, "SOS broadcasted successfully"));
});

export const listOpenIncidents = asyncHandler(async (_, res) => {
  const incidents = await Incident.find({ status: "open" }).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, incidents, "Open incidents fetched"));
});

export const listNearbyIncidents = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 2000 } = req.query;

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  const parsedRadius = Number(radius);

  if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
    throw new ApiError(400, "lat and lng query params are required");
  }

  const incidents = await Incident.find({
    status: "open",
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [parsedLng, parsedLat],
        },
        $maxDistance: Number.isNaN(parsedRadius) ? 2000 : parsedRadius,
      },
    },
  }).sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, incidents, "Nearby incidents fetched"));
});

export const respondToIncident = asyncHandler(async (req, res) => {
  const { incidentId } = req.params;

  const incident = await Incident.findById(incidentId);
  if (!incident) {
    throw new ApiError(404, "Incident not found");
  }

  if (incident.status !== "open") {
    throw new ApiError(400, "Incident is already resolved");
  }

  const alreadyResponding = incident.responders.some(
    (responder) => String(responder.userId) === String(req.user._id)
  );

  if (!alreadyResponding) {
    incident.responders.push({
      userId: req.user._id,
      fullName: req.user.fullName || "Responder",
      phone: sanitizePhone(req.user.phone),
    });
    await incident.save();
  }

  return res.status(200).json(new ApiResponse(200, incident, "Responder joined"));
});

export const resolveIncident = asyncHandler(async (req, res) => {
  const { incidentId } = req.params;

  const incident = await Incident.findById(incidentId);
  if (!incident) {
    throw new ApiError(404, "Incident not found");
  }

  if (incident.status === "resolved") {
    return res.status(200).json(new ApiResponse(200, incident, "Incident already resolved"));
  }

  incident.status = "resolved";
  incident.resolvedBy = req.user._id;
  incident.resolvedAt = new Date();
  await incident.save();

  return res.status(200).json(new ApiResponse(200, incident, "Incident marked resolved"));
});

export const adminIncidentSummary = asyncHandler(async (_, res) => {
  const [openCount, resolvedCount, recent] = await Promise.all([
    Incident.countDocuments({ status: "open" }),
    Incident.countDocuments({ status: "resolved" }),
    Incident.find().sort({ createdAt: -1 }).limit(20),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        openCount,
        resolvedCount,
        incidents: recent,
      },
      "Admin incident summary fetched"
    )
  );
});

export const suggestBestVolunteer = asyncHandler(async (req, res) => {
  const { incidentId } = req.params;

  const incident = await Incident.findById(incidentId);
  if (!incident) {
    throw new ApiError(404, "Incident not found");
  }

  const [incidentLng, incidentLat] = incident.location.coordinates;

  const candidates = await User.find({
    _id: { $ne: incident.createdBy },
    isSuspended: false,
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [incidentLng, incidentLat],
        },
        $maxDistance: incident.radiusMeters || 2000,
      },
    },
  }).select("fullName phone trustScore volunteerRating skills location");

  if (!candidates.length) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          incidentId,
          recommendedVolunteer: null,
          reason: "No volunteers found in incident radius",
        },
        "Volunteer recommendation generated"
      )
    );
  }

  const incidentType = incident.type;
  const scored = candidates.map((candidate) => {
    const [candidateLng, candidateLat] = candidate.location?.coordinates || [0, 0];
    const distanceKm = getDistanceKm(incidentLat, incidentLng, candidateLat, candidateLng);
    const maxKm = (incident.radiusMeters || 2000) / 1000;
    const proximityScore = Math.max(0, 1 - distanceKm / Math.max(maxKm, 0.5));

    const skillMatch = (candidate.skills || []).some((skill) =>
      String(skill).toLowerCase().includes(String(incidentType).toLowerCase())
    )
      ? 1
      : 0.4;

    const normalizedVolunteerRating = Number(candidate.volunteerRating || 50) / 100;
    const normalizedTrust = Number(candidate.trustScore || 5) / 10;

    const score =
      normalizedVolunteerRating * 0.6 +
      normalizedTrust * 0.2 +
      skillMatch * 0.15 +
      proximityScore * 0.05;

    return {
      candidate,
      score,
      distanceKm,
      skillMatch,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  let top = scored[0];
  let llmReason = "Selected using deterministic fallback scoring.";

  try {
    const candidatePayload = scored.map((item) => ({
      candidateId: String(item.candidate._id),
      fullName: item.candidate.fullName,
      volunteerRating: item.candidate.volunteerRating,
      trustScore: item.candidate.trustScore,
      skills: item.candidate.skills || [],
      distanceKm: Number(item.distanceKm.toFixed(2)),
      baselineScore: Number(item.score.toFixed(3)),
    }));

    const llmOutput = await runLLMJson({
      systemPrompt:
        "You are an emergency dispatcher AI. Pick exactly one best volunteer from provided candidates and return strict JSON only.",
      userPrompt: `Incident context: ${JSON.stringify({
        incidentId,
        type: incident.type,
        radiusMeters: incident.radiusMeters,
        description: incident.description,
      })}. Candidates: ${JSON.stringify(candidatePayload)}. Return JSON: { selectedCandidateId: string, reason: string, confidence: number(0-1) }`,
      temperature: 0.2,
      maxTokens: 500,
    });

    const selectedId = String(llmOutput?.selectedCandidateId || "");
    const llmSelected = scored.find((item) => String(item.candidate._id) === selectedId);

    if (llmSelected) {
      top = llmSelected;
      llmReason = llmOutput?.reason || llmReason;
    }
  } catch {
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        incidentId,
        recommendedVolunteer: {
          _id: top.candidate._id,
          fullName: top.candidate.fullName,
          phone: top.candidate.phone,
          volunteerRating: top.candidate.volunteerRating,
          trustScore: top.candidate.trustScore,
          skills: top.candidate.skills || [],
          distanceKm: Number(top.distanceKm.toFixed(2)),
          recommendationScore: Number(top.score.toFixed(3)),
        },
        evaluatedCount: scored.length,
        reason: llmReason,
      },
      "Volunteer recommendation generated"
    )
  );
});
