import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { OTP } from "../models/otp.model.js";
import { sendOTPSMS } from "../utils/otpSMS.js";
import jwt from "jsonwebtoken";

const normalizePhone = (phone) => String(phone ?? "").replace(/\D/g, "").slice(-10);

const isAdmin = (user) => user?.role === "admin";

// ── Helper: generate both tokens and save refresh token to DB ─────────────────
const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
    
        if (!user){
            throw new ApiError(404, "User not found");
        }
    
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
    
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        
        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(error.statusCode || 500, "Something went wrong while generating access and refresh tokens");
    }
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
};

// ── Register ─────────────────────────────────────────────────────────────────
// POST /api/v1/users/register
export const registerUser = asyncHandler(async (req, res) => {
   const { fullName, name, phone } = req.body;

  const normalizedName = (fullName || name || "").trim();
  const cleanPhone = normalizePhone(phone);

  if (!normalizedName || !cleanPhone) {
    throw new ApiError(400, "Name and phone are required");
  }

  if (cleanPhone.length !== 10) {
    throw new ApiError(400, "Phone must be 10 digits");
  }

  const existingUser = await User.findOne({ phone: cleanPhone });

  if (existingUser) {
    throw new ApiError(409, "User already registered with this phone");
  }

  const avatarLocalPath = req.file;

  let avatar = null;

  if (avatarLocalPath){
    try {
      avatar = await uploadOnCloudinary(avatarLocalPath.path);
            
      if (process.env.NODE_ENV !== "production"){
        console.log("Uploaded avatar");
      }
            
    } catch (error) {
        console.log("Error uploading avatar", error);
        throw new ApiError(500, "Failed to upload avatar");
    }
  }

  const user = await User.create({
    fullName: normalizedName,
    phone: cleanPhone,
    avatar: avatar?.url
  });

  if (!user){
    throw new ApiError(500, "Failed to create user");
  }

  const createdUser = await User.findById(user._id).select(
    "-refreshToken -location"
  )

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
    
});

export const loginUser = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const cleanPhone = normalizePhone(phone);

  if (!cleanPhone) {
    throw new ApiError(400, "Phone number required");
  }

  const user = await User.findOne({ phone: cleanPhone });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await OTP.deleteMany({ userId: user._id });

  await OTP.create({
    userId: user._id,
    otp: otp,
    attempts: 0,
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 min
  });

  await sendOTPSMS(cleanPhone, otp);

  return res.status(200)
  .cookie("accessToken", accessToken, cookieOptions)
  .cookie("refreshToken", refreshToken, cookieOptions)
  .json(
    new ApiResponse(
      200,
      {},
      "User logged in successfully"
    )
  );

});

// ── Logout ───────────────────────────────────────────────────────────────────
// POST /api/v1/users/logout
export const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { returnDocument: 'after' }
  );

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

// ── Refresh Access Token ──────────────────────────────────────────────────────
// POST /api/v1/users/refresh-token
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token missing");
  }

  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    throw new ApiError(401, "Refresh token expired or invalid");
  }

  const user = await User.findById(decoded._id);
  if (!user || user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "Refresh token mismatch");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken },
        "Access token refreshed"
      )
    );
});

// ── Get Current User ──────────────────────────────────────────────────────────
// GET /api/v1/users/me
export const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

// ── Update Location ───────────────────────────────────────────────────────────
// PATCH /api/v1/users/location
export const updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;

  if (!lat || !lng) {
    throw new ApiError(400, "lat and lng are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      location: {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
      },
      lastSeen: new Date(),
    },
    { returnDocument: 'after' }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, { location: user.location }, "Location updated"));
});

// ── Update Profile ────────────────────────────────────────────────────────────
// PATCH /api/v1/users/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone, skills } = req.body;

  const updates = {};
  if (fullName) updates.fullName = fullName;
  if (phone) updates.phone = phone;
  if (skills)
    updates.skills = Array.isArray(skills) ? skills : JSON.parse(skills);

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    returnDocument: 'after',
    runValidators: true,
  }).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Profile updated successfully"));
});

// ── Update Avatar ─────────────────────────────────────────────────────────────
// PATCH /api/v1/users/avatar
export const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Avatar file is required");
  }

  const uploaded = await uploadOnCloudinary(req.file.path);
  if (!uploaded) {
    throw new ApiError(500, "Avatar upload failed");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: uploaded.secure_url },
    { returnDocument: 'after' }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

// ── Change Password ───────────────────────────────────────────────────────────
// PATCH /api/v1/users/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Old and new password required");
  }

  const user = await User.findById(req.user._id);
  const isCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isCorrect) throw new ApiError(401, "Old password is incorrect");

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// ── Add Guardian ──────────────────────────────────────────────────────────────
// POST /api/v1/users/guardians
// Change: Switched search from email to phone to match your schema.
export const addGuardian = asyncHandler(async (req, res) => {
  const { guardianPhone } = req.body;
  const guardian = await User.findOne({ phone: guardianPhone });
  
  if (!guardian) throw new ApiError(404, "Guardian not found");

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $addToSet: { guardians: guardian._id } }, // $addToSet prevents duplicate IDs
    { returnDocument: 'after' }
  ).select("-password -refreshToken");

  return res.status(200).json(new ApiResponse(200, user.guardians, "Guardian added"));
});

// ── Send OTP ──────────────────────────────────────────────────────────────────
// POST /api/v1/users/send-otp
export const sendOTP = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const cleanPhone = normalizePhone(phone);

  if (!cleanPhone || cleanPhone.length !== 10) {
    throw new ApiError(400, "Phone number is required");
  }

  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

  // Find or create user with this phone
  let user = await User.findOne({ phone: cleanPhone });

  if (!user) {
    // Create a new user with phone (without password initially)
    // This will be completed during OTP verification
    user = await User.create({
      phone: cleanPhone,
      fullName: "New User",
      password: Math.random().toString(36).slice(-8), // Temporary random password
    });
  }

  // Store OTP and expiry
  user.otp = otp;
  user.otpExpiry = otpExpiry;
  await user.save({ validateBeforeSave: false });

  // Send OTP via SMS
  await sendOTPSMS(cleanPhone, otp);

  return res
    .status(200)
    .json(new ApiResponse(200, { message: "OTP sent successfully" }, "OTP sent"));
});

// ── Verify OTP ────────────────────────────────────────────────────────────────
// POST /api/v1/users/verify-otp
export const verifyOTP = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  const cleanPhone = normalizePhone(phone);

  if (!cleanPhone || !otp) {
    throw new ApiError(400, "Phone number and OTP are required");
  }

  const user = await User.findOne({ phone: cleanPhone });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check if OTP is expired
  if (!user.otpExpiry || new Date() > user.otpExpiry) {
    throw new ApiError(400, "OTP has expired. Please request a new one.");
  }

  // Verify OTP
  if (user.otp !== otp) {
    throw new ApiError(400, "Invalid OTP. Please try again.");
  }

  // Mark as verified and clear OTP
  user.isPhoneVerified = true;
  user.otp = null;
  user.otpExpiry = null;
  user.lastSeen = new Date();
  await user.save({ validateBeforeSave: false });

  // Generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -otp -otpExpiry"
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "Logged in successfully"
      )
    );
});

// ── Admin: List all users ─────────────────────────────────────────────────────
// GET /api/v1/users/admin/all
export const adminListUsers = asyncHandler(async (req, res) => {
  if (!isAdmin(req.user)) {
    throw new ApiError(403, "Admin access required");
  }

  const users = await User.find({ role: { $ne: "admin" } })
    .select("fullName phone avatar trustScore volunteerRating skills isSuspended totalResponses successfulResponses falseAlertCount role createdAt lastSeen")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, users, "All users fetched"));
});

// ── Admin: Toggle user suspension ─────────────────────────────────────────────
// PATCH /api/v1/users/admin/:userId/toggle-suspend
export const adminToggleSuspend = asyncHandler(async (req, res) => {
  if (!isAdmin(req.user)) {
    throw new ApiError(403, "Admin access required");
  }

  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  user.isSuspended = !user.isSuspended;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, { _id: user._id, isSuspended: user.isSuspended }, `User ${user.isSuspended ? "suspended" : "unsuspended"}`));
});

// ── Admin: Get dashboard stats ────────────────────────────────────────────────
// GET /api/v1/users/admin/stats
export const adminDashboardStats = asyncHandler(async (req, res) => {
  if (!isAdmin(req.user)) {
    throw new ApiError(403, "Admin access required");
  }

  const notAdmin = { role: { $ne: "admin" } };

  const [totalUsers, suspendedUsers, activeUsers] = await Promise.all([
    User.countDocuments(notAdmin),
    User.countDocuments({ ...notAdmin, isSuspended: true }),
    User.countDocuments({ ...notAdmin, isSuspended: false }),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { totalUsers, suspendedUsers, activeUsers }, "Admin stats fetched"));
});