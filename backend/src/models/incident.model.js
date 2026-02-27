import mongoose from "mongoose";

const incidentSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reporterName: {
      type: String,
      trim: true,
      default: "User",
    },
    reporterPhone: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      enum: ["car_breakdown", "gas_leak", "urgent_help", "medical", "others"],
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
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
    radiusMeters: {
      type: Number,
      default: 2000, // meters (2km)
    },
    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
    },
    responders: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
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
    ],
    suggestedVolunteers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        fullName: {
          type: String,
          default: "",
        },
        phone: {
          type: String,
          default: "",
        },
      },
    ],
    notifiedSuggestedVolunteerIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    suggestedVolunteerNotifiedAt: {
      type: Date,
      default: null,
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
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },
  },
  { timestamps: true }
);

incidentSchema.index({ location: "2dsphere" });

export const Incident = mongoose.model("Incident", incidentSchema);