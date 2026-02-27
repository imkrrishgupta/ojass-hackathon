import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      length: [10, "Phone number must be 10 digits"],
    },
    avatar: {
      type: String, // Cloudinary URL
      default: process.env.DEFAULT_AVATAR_URL,
    },


    // GeoJSON location — 2dsphere for radius queries
    location: {
      type: {
        type: String,
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },

    // Trust & Verification
    trustScore: { type: Number, default: 5.0, min: 0, max: 10 },
    totalResponses: { type: Number, default: 0 },
    successfulResponses: { type: Number, default: 0 },
    falseAlertCount: { type: Number, default: 0 },
    isSuspended: { type: Boolean, default: false },

    // Guardian mode — guardians are notified before community
    guardians: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    role: {
      type: String,
      default: "user",
    },

    skills: {
      type: [String],
      default: [],
    },
    volunteerRating: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    volunteerAssessment: {
      type: [
        {
          questionId: String,
          answer: String,
          score: Number,
        },
      ],
      default: [],
    },
    volunteerRatingUpdatedAt: {
      type: Date,
      default: null,
    },

    // OTP verification fields
    otp: {
      type: String,
      default: null,
    },
    otpExpiry: {
      type: Date,
      default: null,
    },
    refreshToken: { type: String },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// 2dsphere index for geospatial radius queries
userSchema.index({ location: "2dsphere" });

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, Number(process.env.ENCRYPTION_ROUND));
});

// Compare password
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Generate Access Token (short-lived)
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      phone: this.phone,
      fullName: this.fullName,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

// Generate Refresh Token (long-lived)
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
};

export const User = mongoose.model("User", userSchema);