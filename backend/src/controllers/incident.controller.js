import { Incident } from "../models/incident.model.js";
import { User } from "../models/user.model.js";
import { CommunityResource } from "../models/communityResource.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { runLLMJson } from "../utils/llm.js";
import { sendEmergencySMS } from "../utils/alertSMS.js";
import { getIO } from "../socketInstance.js";

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

const computeVolunteerSuggestions = async (incident) => {
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
    return {
      recommendedVolunteer: null,
      suggestedVolunteers: [],
      reason: "No volunteers found in incident radius",
      evaluatedCount: 0,
    };
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
    };
  });

  scored.sort((a, b) => b.score - a.score);

  let top = scored[0];
  let llmReason = "Selected using deterministic fallback scoring.";
  let rankedIds = scored.map((item) => String(item.candidate._id));

  try {
    const candidatePayload = scored.map((item) => ({
      candidateId: String(item.candidate._id),
      fullName: item.candidate.fullName,
      volunteerRating: item.candidate.volunteerRating,
      trustScore: item.candidate.trustScore,
      skills: item.candidate.skills || [],
      matchedSkills: item.matchedSkills || [],
      distanceKm: Number(item.distanceKm.toFixed(2)),
      baselineScore: Number(item.score.toFixed(3)),
    }));

    const llmOutput = await runLLMJson({
      systemPrompt:
        "You are an emergency dispatcher AI. Pick the best volunteer based on skill match, rating, trust score, and proximity. Strongly prefer candidates with skills matching the incident type. Return strict JSON only.",
      userPrompt: `Incident context: ${JSON.stringify({
        incidentId: incident._id,
        type: incident.type,
        radiusMeters: incident.radiusMeters,
        description: incident.description,
      })}. Candidates: ${JSON.stringify(candidatePayload)}. Return JSON: { selectedCandidateId: string, rankedCandidateIds: string[], reason: string, confidence: number(0-1) }`,
      temperature: 0.2,
      maxTokens: 500,
    });

    const selectedId = String(llmOutput?.selectedCandidateId || "");
    const llmSelected = scored.find((item) => String(item.candidate._id) === selectedId);

    if (llmSelected) {
      top = llmSelected;
      llmReason = llmOutput?.reason || llmReason;
    }

    if (Array.isArray(llmOutput?.rankedCandidateIds) && llmOutput.rankedCandidateIds.length) {
      const validSet = new Set(scored.map((item) => String(item.candidate._id)));
      const fromLlm = llmOutput.rankedCandidateIds
        .map((id) => String(id))
        .filter((id) => validSet.has(id));

      const remaining = scored
        .map((item) => String(item.candidate._id))
        .filter((id) => !fromLlm.includes(id));

      rankedIds = [...fromLlm, ...remaining];
    }
  } catch {
  }

  const suggestionMap = new Map(
    scored.map((item) => [
      String(item.candidate._id),
      (() => {
        const ratingInFive = Math.max(0, Math.min(5, Number(item.candidate.volunteerRating || 0) / 20));
        const selectionFactor = ratingInFive > 0 ? Number((item.distanceKm / ratingInFive).toFixed(4)) : Number.POSITIVE_INFINITY;

        return {
          _id: item.candidate._id,
          fullName: item.candidate.fullName,
          phone: item.candidate.phone,
          volunteerRating: item.candidate.volunteerRating,
          trustScore: item.candidate.trustScore,
          skills: item.candidate.skills || [],
          distanceKm: Number(item.distanceKm.toFixed(2)),
          recommendationScore: Number(item.score.toFixed(3)),
          ratingInFive: Number(ratingInFive.toFixed(2)),
          selectionFactor,
        };
      })()
    ])
  );

  const suggestedVolunteers = rankedIds
    .map((id) => suggestionMap.get(id))
    .filter(Boolean)
    .sort((a, b) => {
      const factorDiff = Number(a.selectionFactor || Number.POSITIVE_INFINITY) - Number(b.selectionFactor || Number.POSITIVE_INFINITY);
      if (factorDiff !== 0) return factorDiff;

      const ratingDiff = Number(b.volunteerRating || 0) - Number(a.volunteerRating || 0);
      if (ratingDiff !== 0) return ratingDiff;

      return Number(a.distanceKm || 0) - Number(b.distanceKm || 0);
    })
    .slice(0, 3);

  return {
    recommendedVolunteer: suggestedVolunteers[0] || null,
    suggestedVolunteers,
    reason: llmReason,
    evaluatedCount: scored.length,
  };
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

  const typeLower = String(type).toLowerCase();
  const severity =
    typeLower === "health" || typeLower === "fire" ? "high" :
    typeLower === "road" ? "medium" : "low";

  const incident = await Incident.create({
    createdBy: req.user._id,
    type,
    description: description || "",
    radiusMeters: [500, 1000, 2000].includes(Number(radiusMeters))
      ? Number(radiusMeters)
      : 2000,
    location: {
      type: "Point",
      coordinates: [parsedLng, parsedLat],
    },
    severity,
  });

  // --- Auto-dispatch best volunteer ---
  let dispatchInfo = null;
  let skilledRespondersInfo = [];
  let nearbyEmergencyServices = [];

  // ── Auto-surface skilled responders with matching skills ──
  try {
    const skillKeywords = {
      medical: ["doctor", "nurse", "paramedic", "emt", "cpr", "first aid", "surgeon", "pharmacist"],
      gas_leak: ["firefighter", "engineer"],
      car_breakdown: ["mechanic", "electrician", "engineer"],
      urgent_help: ["cpr", "first aid", "paramedic", "emt", "doctor", "nurse"],
      others: [],
    };
    const relevantSkills = skillKeywords[type] || [];

    if (relevantSkills.length > 0) {
      const skilledUsers = await User.find({
        _id: { $ne: req.user._id },
        isSuspended: false,
        skills: { $elemMatch: { $regex: new RegExp(relevantSkills.join("|"), "i") } },
        location: {
          $near: {
            $geometry: { type: "Point", coordinates: [parsedLng, parsedLat] },
            $maxDistance: 10000,
          },
        },
      })
        .select("fullName phone skills trustScore volunteerRating location avatar")
        .limit(10);

      const R = 6371;
      skilledRespondersInfo = skilledUsers.map((u) => {
        const [uLng, uLat] = u.location?.coordinates || [0, 0];
        const dLat = ((uLat - parsedLat) * Math.PI) / 180;
        const dLon = ((uLng - parsedLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((parsedLat * Math.PI) / 180) * Math.cos((uLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
        const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return {
          _id: u._id,
          fullName: u.fullName,
          phone: u.phone,
          skills: u.skills,
          trustScore: u.trustScore,
          volunteerRating: u.volunteerRating,
          avatar: u.avatar,
          lat: uLat,
          lng: uLng,
          distanceKm: Number(distanceKm.toFixed(2)),
        };
      });
    }
  } catch (err) {
    console.error("[SkilledResponders] Could not fetch:", err.message);
  }

  // ── Auto-surface nearby emergency services (hospitals, fire stations, etc.) ──
  try {
    const emergencyTypes = ["hospital", "fire_station", "police_station", "pharmacy"];
    const services = await CommunityResource.find({
      isActive: true,
      type: { $in: emergencyTypes },
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [parsedLng, parsedLat] },
          $maxDistance: 10000,
        },
      },
    }).limit(10);

    const R = 6371;
    nearbyEmergencyServices = services.map((r) => {
      const [rLng, rLat] = r.location?.coordinates || [0, 0];
      const dLat = ((rLat - parsedLat) * Math.PI) / 180;
      const dLon = ((rLng - parsedLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((parsedLat * Math.PI) / 180) * Math.cos((rLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return {
        ...r.toObject(),
        lat: rLat,
        lng: rLng,
        distanceKm: Number(distanceKm.toFixed(2)),
      };
    });
  } catch (err) {
    console.error("[EmergencyServices] Could not fetch:", err.message);
  }

  try {
    const suggestions = await computeVolunteerSuggestions(incident);
    const best = suggestions.recommendedVolunteer;

    if (best && best._id) {
      // Add as auto-responder
      incident.responders.push({ userId: best._id });
      incident.autoDispatch = {
        volunteerId: best._id,
        volunteerName: best.fullName || "",
        volunteerPhone: best.phone || "",
        distanceKm: best.distanceKm ?? null,
        rating: best.volunteerRating ?? null,
        dispatchedAt: new Date(),
        status: "dispatched",
        reason: suggestions.reason || "Auto-dispatched by system",
      };
      incident.suggestedVolunteers = suggestions.suggestedVolunteers
        .map((v) => v._id)
        .filter(Boolean);
      await incident.save();

      dispatchInfo = {
        volunteerId: String(best._id),
        volunteerName: best.fullName,
        volunteerPhone: best.phone,
        distanceKm: best.distanceKm,
        rating: best.volunteerRating,
        reason: suggestions.reason,
        allSuggested: suggestions.suggestedVolunteers,
      };

      // Notify dispatched volunteer via socket
      try {
        const io = getIO();
        if (io) {
          io.emit("VOLUNTEER_DISPATCHED", {
            incidentId: incident._id,
            incidentType: incident.type,
            description: incident.description,
            volunteerId: String(best._id),
            volunteerName: best.fullName,
            distanceKm: best.distanceKm,
            lat: parsedLat,
            lng: parsedLng,
          });
        }
      } catch {}

      // Send SMS to dispatched volunteer
      try {
        if (best.phone) {
          await sendEmergencySMS({
            phones: [best.phone],
            message: `NEARHELP AUTO-DISPATCH: You have been assigned to a ${type.toUpperCase()} incident. ${String(description || "Emergency help needed").slice(0, 80)}. Open app to navigate.`,
          });
        }
      } catch {}
    }
  } catch (err) {
    console.error("[AutoDispatch] Could not auto-dispatch:", err.message);
  }

  const responseData = {
    ...incident.toObject(),
    dispatchInfo,
    skilledResponders: skilledRespondersInfo,
    nearbyEmergencyServices,
  };

  // Broadcast new incident to all connected clients
  try {
    const io = getIO();
    io.emit("INCIDENT_UPDATED", incident);
  } catch {}

  return res
    .status(201)
    .json(new ApiResponse(201, responseData, dispatchInfo
      ? `SOS broadcasted — ${dispatchInfo.volunteerName} auto-dispatched`
      : "SOS broadcasted successfully"
    ));
});

export const listOpenIncidents = asyncHandler(async (_, res) => {
  const incidents = await Incident.find({ status: "open" })
    .populate("createdBy", "fullName phone")
    .populate("responders.userId", "fullName phone")
    .sort({ createdAt: -1 });
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
  })
    .populate("createdBy", "fullName phone")
    .populate("responders.userId", "fullName phone")
    .sort({ createdAt: -1 });

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
    });
    await incident.save();
  }

  // Populate & broadcast updated incident to all clients
  const populated = await Incident.findById(incidentId)
    .populate("createdBy", "fullName phone")
    .populate("responders.userId", "fullName phone");

  try {
    const io = getIO();
    io.emit("INCIDENT_UPDATED", populated);
  } catch {}

  return res.status(200).json(new ApiResponse(200, populated, "Responder joined"));
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

  // Broadcast resolution to all clients
  try {
    const io = getIO();
    io.emit("INCIDENT_UPDATED", incident);
    io.emit("INCIDENT_CLOSED", { incidentId: incident._id });
  } catch {}

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

  const {
    recommendedVolunteer,
    suggestedVolunteers,
    reason,
    evaluatedCount,
  } = await computeVolunteerSuggestions(incident);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        incidentId,
        recommendedVolunteer,
        suggestedVolunteers,
        evaluatedCount,
        reason,
      },
      "Volunteer recommendation generated"
    )
  );
});

export const notifySuggestedVolunteers = asyncHandler(async (req, res) => {
  const { incidentId } = req.params;
  const { selectedVolunteerId } = req.body || {};

  const incident = await Incident.findById(incidentId);
  if (!incident) {
    throw new ApiError(404, "Incident not found");
  }

  const isOwner = String(incident.createdBy) === String(req.user._id);
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    throw new ApiError(403, "Only reporter/admin can notify volunteers");
  }

  const suggestions = await computeVolunteerSuggestions(incident);

  let selectedVolunteers = suggestions.suggestedVolunteers;

  if (selectedVolunteerId) {
    selectedVolunteers = suggestions.suggestedVolunteers.filter(
      (item) => String(item._id) === String(selectedVolunteerId)
    );
  }

  const phones = selectedVolunteers.map((item) => item.phone).filter(Boolean);

  if (!phones.length) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          incidentId,
          sentCount: 0,
          suggestedVolunteers: selectedVolunteers,
          message: selectedVolunteerId
            ? "Selected volunteer is not available for SMS"
            : "No valid volunteer phone numbers found for SMS",
        },
        "Volunteer SMS notification skipped"
      )
    );
  }

  const alertMessage = `NEARHELP SOS: ${incident.type.toUpperCase()} incident near you. Details: ${String(
    incident.description || "Emergency assistance required"
  ).slice(0, 90)}. Please open app to respond.`;

  const smsResult = await sendEmergencySMS({
    phones,
    message: alertMessage,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        incidentId,
        sentCount: smsResult.sentTo?.length || 0,
        sentTo: smsResult.sentTo || [],
        suggestedVolunteers: selectedVolunteers,
      },
      "SMS sent to suggested volunteers"
    )
  );
});
