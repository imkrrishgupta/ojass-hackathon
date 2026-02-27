import mongoose from "mongoose";

const responderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fullName: {
      type: String,
      default: "Responder",
    },
    phone: {
      type: String,
      default: "",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const incidentSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reporterName: {
      type: String,
      required: true,
      trim: true,
    },
    reporterPhone: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["fire", "road", "theft", "health", "other"],
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    radiusMeters: {
      type: Number,
      default: 2000,
      enum: [500, 1000, 2000],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
      index: true,
    },
    responders: {
      type: [responderSchema],
      default: [],
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

incidentSchema.index({ location: "2dsphere" });

export const Incident = mongoose.model("Incident", incidentSchema);
