import mongoose from "mongoose";

// Sub-schema for each responder embedded inside an incident
const responderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // "responding", "arrived", "withdrew"
  status: {
    type: String,
    default: "responding",
  },
  rating: { type: Number, min: 1, max: 5 },
  ratingNote: { type: String, default: "" },
  // Live location of this responder at time of responding
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
  },
  joinedAt: { type: Date, default: Date.now },
});

const incidentSchema = new mongoose.Schema(
  {
    // The user who triggered this incident
    broadcaster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    incidentType: {
      type: String,
      required: [true, "Incident type is required"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },

    // GeoJSON Point — 2dsphere index enables $near queries
    // IMPORTANT: coordinates are stored as [longitude, latitude]
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, "Location coordinates are required"],
      },
    },

    // Broadcast radius — how far to notify users (in meters)
    // 500, 1000, 2000
    radiusMeters: {
      type: Number,
      default: 1000,
    },
    // "active", "resolved", "false_alarm", "expired"
    status: {
      type: String,
      default: "active",
    },

    // All users who responded to this incident
    responders: [responderSchema],

    // Users who flagged this as a false alarm
    falseAlertReports: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],

    resolvedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Auto-expire after 2 hours if broadcaster never resolves it
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 2 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

// 2dsphere index — REQUIRED for $near and $geoWithin queries
incidentSchema.index({ location: "2dsphere" });

// Compound index for fast status + time queries (used in admin dashboard)
incidentSchema.index({ status: 1, createdAt: -1 });

export const Incident = mongoose.model("Incident", incidentSchema);