import { CommunityResource } from "../models/communityResource.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Resource type metadata for the frontend
const RESOURCE_TYPES = [
  { value: "aed", label: "AED (Defibrillator)", icon: "heart" },
  { value: "fire_extinguisher", label: "Fire Extinguisher", icon: "flame" },
  { value: "first_aid_kit", label: "First Aid Kit", icon: "plus" },
  { value: "emergency_phone", label: "Emergency Phone", icon: "phone" },
  { value: "hospital", label: "Hospital / Clinic", icon: "hospital" },
  { value: "fire_station", label: "Fire Station", icon: "fire_station" },
  { value: "police_station", label: "Police Station", icon: "police" },
  { value: "pharmacy", label: "Pharmacy", icon: "pill" },
  { value: "shelter", label: "Emergency Shelter", icon: "shelter" },
  { value: "other", label: "Other", icon: "other" },
];

// ── Get resource type options ────────────────────────────────────────────────
// GET /api/v1/community-resources/types
export const getResourceTypes = asyncHandler(async (_, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, RESOURCE_TYPES, "Resource types fetched"));
});

// ── Add a community resource ─────────────────────────────────────────────────
// POST /api/v1/community-resources
export const addResource = asyncHandler(async (req, res) => {
  const { name, type, description, lat, lng, address, contactPhone, operatingHours } = req.body;

  if (!name || !type || lat === undefined || lng === undefined) {
    throw new ApiError(400, "name, type, lat, and lng are required");
  }

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
    throw new ApiError(400, "Invalid latitude or longitude");
  }

  const resource = await CommunityResource.create({
    name: name.trim(),
    type,
    description: (description || "").trim(),
    location: { type: "Point", coordinates: [parsedLng, parsedLat] },
    address: (address || "").trim(),
    addedBy: req.user._id,
    contactPhone: (contactPhone || "").trim(),
    operatingHours: (operatingHours || "24/7").trim(),
  });

  return res
    .status(201)
    .json(new ApiResponse(201, resource, "Community resource added successfully"));
});

// ── Get nearby resources ─────────────────────────────────────────────────────
// GET /api/v1/community-resources/nearby?lat=&lng=&radius=&type=
export const getNearbyResources = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 5000, type } = req.query;
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  const parsedRadius = Number(radius);

  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
    throw new ApiError(400, "lat and lng query params are required");
  }

  const query = {
    isActive: true,
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [parsedLng, parsedLat] },
        $maxDistance: Number.isFinite(parsedRadius) ? parsedRadius : 5000,
      },
    },
  };

  if (type) {
    query.type = type;
  }

  const resources = await CommunityResource.find(query)
    .populate("addedBy", "fullName")
    .limit(100);

  // Compute distance
  const R = 6371;
  const results = resources.map((r) => {
    const [rLng, rLat] = r.location?.coordinates || [0, 0];
    const dLat = ((rLat - parsedLat) * Math.PI) / 180;
    const dLon = ((rLng - parsedLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((parsedLat * Math.PI) / 180) *
        Math.cos((rLat * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return {
      ...r.toObject(),
      lat: rLat,
      lng: rLng,
      distanceKm: Number(distanceKm.toFixed(2)),
    };
  });

  return res
    .status(200)
    .json(new ApiResponse(200, results, `Found ${results.length} nearby resources`));
});

// ── Get all resources ────────────────────────────────────────────────────────
// GET /api/v1/community-resources
export const getAllResources = asyncHandler(async (_, res) => {
  const resources = await CommunityResource.find({ isActive: true })
    .populate("addedBy", "fullName")
    .sort({ createdAt: -1 })
    .limit(200);

  return res
    .status(200)
    .json(new ApiResponse(200, resources, "All community resources fetched"));
});

// ── Verify a resource (admin) ────────────────────────────────────────────────
// PATCH /api/v1/community-resources/:resourceId/verify
export const verifyResource = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;

  const resource = await CommunityResource.findByIdAndUpdate(
    resourceId,
    { verified: true, verifiedBy: req.user._id },
    { returnDocument: "after" }
  );

  if (!resource) throw new ApiError(404, "Resource not found");

  return res
    .status(200)
    .json(new ApiResponse(200, resource, "Resource verified successfully"));
});

// ── Delete a resource ────────────────────────────────────────────────────────
// DELETE /api/v1/community-resources/:resourceId
export const deleteResource = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;

  const resource = await CommunityResource.findById(resourceId);
  if (!resource) throw new ApiError(404, "Resource not found");

  // Only the creator or admin can delete
  const isOwner = String(resource.addedBy) === String(req.user._id);
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) {
    throw new ApiError(403, "Only the creator or admin can delete this resource");
  }

  await CommunityResource.findByIdAndDelete(resourceId);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Resource deleted successfully"));
});

// ── Get nearby emergency services (auto-surfaced on SOS) ─────────────────────
// GET /api/v1/community-resources/emergency-services?lat=&lng=
export const getNearbyEmergencyServices = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
    throw new ApiError(400, "lat and lng are required");
  }

  // Fetch hospitals, fire stations, police stations, pharmacies within 10 km
  const emergencyTypes = ["hospital", "fire_station", "police_station", "pharmacy"];

  const services = await CommunityResource.find({
    isActive: true,
    type: { $in: emergencyTypes },
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [parsedLng, parsedLat] },
        $maxDistance: 10000, // 10 km
      },
    },
  })
    .populate("addedBy", "fullName")
    .limit(20);

  // Compute distance
  const R = 6371;
  const results = services.map((r) => {
    const [rLng, rLat] = r.location?.coordinates || [0, 0];
    const dLat = ((rLat - parsedLat) * Math.PI) / 180;
    const dLon = ((rLng - parsedLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((parsedLat * Math.PI) / 180) *
        Math.cos((rLat * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return {
      ...r.toObject(),
      lat: rLat,
      lng: rLng,
      distanceKm: Number(distanceKm.toFixed(2)),
    };
  });

  return res
    .status(200)
    .json(new ApiResponse(200, results, `Found ${results.length} nearby emergency services`));
});
