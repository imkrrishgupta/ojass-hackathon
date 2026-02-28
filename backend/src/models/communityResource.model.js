import mongoose from "mongoose";

const communityResourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Resource name is required"], trim: true },
    type: {
      type: String,
      enum: ["aed", "fire_extinguisher", "first_aid_kit", "emergency_phone", "hospital", "fire_station", "police_station", "pharmacy", "shelter", "other"],
      required: [true, "Resource type is required"],
    },
    description: { type: String, trim: true, default: "" },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    address: { type: String, trim: true, default: "" },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    contactPhone: { type: String, trim: true, default: "" },
    operatingHours: { type: String, trim: true, default: "24/7" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

communityResourceSchema.index({ location: "2dsphere" });

export const CommunityResource = mongoose.model("CommunityResource", communityResourceSchema);
