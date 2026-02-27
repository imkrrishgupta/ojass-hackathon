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
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      length: [10, "Phone number must be 10 digits"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    avatar: {
      type: String, // Cloudinary URL
      default: process.env.DEFAULT_AVATAR_URL,
    },
    avatarPublicId: {
      type: String, // Cloudinary public_id for deletion
      default: "",
    },

    // Skills for Skill Registry
    skills: {
      type: [String],
      enum: [
        "CPR",
        "doctor",
        "nurse",
        "paramedic",
        "firefighter",
        "police",
        "mechanic",
        "electrician",
        "other",
      ],
      default: [],
    },

    // GeoJSON location — 2dsphere for radius queries
    location: {
      type: {
        type: String,
        enum: ["Point"],
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
    suspendedUntil: { type: Date },
    suspendReason: { type: String },

    // Guardian mode — guardians are notified before community
    guardians: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    refreshToken: { type: String },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// 2dsphere index for geospatial radius queries
userSchema.index({ location: "2dsphere" });

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, Number(process.env.ENCRYPTION_ROUND));
  next();
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
      email: this.email,
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