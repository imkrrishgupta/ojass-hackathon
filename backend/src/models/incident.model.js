import mongoose from "mongoose";

const incidentSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["car_breakdown", "gas_leak", "urgent_help", "medical", "others"],
      required: true,
    },
    message: {
      type: String,
      trim: true,
      default: "",
    },
    location: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
    },
    radius: {
      type: Number,
      default: 2000, // meters (2km)
    },
    active: {
      type: Boolean,
      default: true,
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

export const Incident = mongoose.model("Incident", incidentSchema);