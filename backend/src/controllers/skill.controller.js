import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Predefined skill categories
const SKILL_CATEGORIES = {
  medical: ["CPR", "First Aid", "Doctor", "Nurse", "Paramedic", "EMT", "Surgeon", "Pharmacist"],
  rescue: ["Firefighter", "Lifeguard", "Search & Rescue", "Disaster Response", "Hazmat"],
  technical: ["Mechanic", "Electrician", "Plumber", "Engineer", "IT Support"],
  security: ["Police", "Security Guard", "Self-Defense", "Crowd Control"],
  support: ["Counselor", "Translator", "Sign Language", "Crisis Negotiator", "Social Worker"],
};

// ── Get available skill options ──────────────────────────────────────────────
// GET /api/v1/skills/options
export const getSkillOptions = asyncHandler(async (_, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, SKILL_CATEGORIES, "Skill options fetched"));
});

// ── Get current user's skills ────────────────────────────────────────────────
// GET /api/v1/skills/my
export const getMySkills = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("fullName phone skills");
  if (!user) throw new ApiError(404, "User not found");
  return res
    .status(200)
    .json(new ApiResponse(200, { skills: user.skills || [] }, "Your skills fetched"));
});

// ── Update current user's skills ─────────────────────────────────────────────
// PUT /api/v1/skills/my
export const updateMySkills = asyncHandler(async (req, res) => {
  const { skills } = req.body;

  if (!Array.isArray(skills)) {
    throw new ApiError(400, "Skills must be an array of strings");
  }

  // Sanitize: trim and deduplicate
  const cleaned = [...new Set(skills.map((s) => String(s).trim()).filter(Boolean))];

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { skills: cleaned },
    { returnDocument: "after", runValidators: true }
  ).select("fullName phone skills");

  return res
    .status(200)
    .json(new ApiResponse(200, { skills: user.skills }, "Skills updated successfully"));
});

// ── Find skilled responders nearby ───────────────────────────────────────────
// GET /api/v1/skills/nearby?lat=&lng=&radius=&skill=
export const findSkilledResponders = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 5000, skill } = req.query;
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  const parsedRadius = Number(radius);

  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
    throw new ApiError(400, "lat and lng are required");
  }

  const query = {
    isSuspended: false,
    skills: { $exists: true, $ne: [] },
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [parsedLng, parsedLat] },
        $maxDistance: Number.isFinite(parsedRadius) ? parsedRadius : 5000,
      },
    },
  };

  // If a specific skill is requested, filter for it (case-insensitive partial match)
  if (skill) {
    query.skills = { $elemMatch: { $regex: new RegExp(skill, "i") } };
  }

  const responders = await User.find(query)
    .select("fullName phone skills trustScore volunteerRating location avatar")
    .limit(50);

  // Compute distance for each responder
  const R = 6371;
  const results = responders.map((u) => {
    const [uLng, uLat] = u.location?.coordinates || [0, 0];
    const dLat = ((uLat - parsedLat) * Math.PI) / 180;
    const dLon = ((uLng - parsedLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((parsedLat * Math.PI) / 180) *
        Math.cos((uLat * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
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

  return res
    .status(200)
    .json(new ApiResponse(200, results, `Found ${results.length} skilled responders nearby`));
});

// ── Get all skilled users (admin/public leaderboard) ─────────────────────────
// GET /api/v1/skills/all
export const getAllSkilledUsers = asyncHandler(async (_, res) => {
  const users = await User.find({ skills: { $exists: true, $ne: [] } })
    .select("fullName phone skills trustScore volunteerRating avatar")
    .sort({ volunteerRating: -1 })
    .limit(100);

  return res
    .status(200)
    .json(new ApiResponse(200, users, "Skilled users fetched"));
});
