import mongoose from "mongoose";

const responderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["responding", "arrived", "withdrew"],
    default: "responding",
  },
  rating: { type: Number, min: 1, max: 5 },
  ratingNote: { type: String },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
  },
  joinedAt: { type: Date, default: Date.now },
});

const sosSchema = new mongoose.Schema(
  {
    broadcaster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    crisisType: {
      type: String,
      required: true,
      enum: [
        "medical",
        "breakdown",
        "gas_leak",
        "fire",
        "flood",
        "crime",
        "accident",
        "other",
      ],
    },
    description: { type: String, trim: true, maxlength: 500 },

    // GeoJSON point
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },

    // Broadcast radius in meters
    radiusMeters: {
      type: Number,
      enum: [500, 1000, 2000],
      default: 1000,
    },

    status: {
      type: String,
      enum: ["active", "resolved", "false_alarm", "expired"],
      default: "active",
    },

    // AI-generated content stored so we don't re-call Gemini
    aiGuidance: { type: String },    // JSON stringified
    aiSummary: { type: String },     // pre-filled call script
    aiDebrief: { type: String },     // JSON stringified, post-resolution

    responders: [responderSchema],

    // False-alert tracking
    falseAlertReports: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    resolvedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Auto-expire after 2 hours if not resolved
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 2 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

sosSchema.index({ location: "2dsphere" });
sosSchema.index({ status: 1, createdAt: -1 });

export const SOS = mongoose.model("SOS", sosSchema);