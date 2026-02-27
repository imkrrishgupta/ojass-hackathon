import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

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
  const { fullName, email, password, phone, skills } = req.body;

  if ([fullName, email, password].some((f) => !f?.trim())) {
    throw new ApiError(400, "fullName, email, and password are required");
  }

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, "Email already registered");

  // Handle optional avatar upload
  let avatarUrl = "";
  let avatarPublicId = "";
  if (req.file) {
    const uploaded = await uploadOnCloudinary(req.file.path);
    if (uploaded) {
      avatarUrl = uploaded.secure_url;
      avatarPublicId = uploaded.public_id;
    }
  }

  const user = await User.create({
    fullName,
    email,
    password,
    phone: phone || "",
    skills: skills ? (Array.isArray(skills) ? skills : JSON.parse(skills)) : [],
    avatar: avatarUrl,
    avatarPublicId,
  });

  const created = await User.findById(user._id).select("-password -refreshToken");

  return res
    .status(201)
    .json(new ApiResponse(201, created, "User registered successfully"));
});

// ── Login ────────────────────────────────────────────────────────────────────
// POST /api/v1/users/login
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  const isValid = await user.isPasswordCorrect(password);
  if (!isValid) throw new ApiError(401, "Invalid credentials");

  if (user.isSuspended) {
    throw new ApiError(403, `Account suspended: ${user.suspendReason}`);
  }

  user.lastSeen = new Date();
  await user.save({ validateBeforeSave: false });

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
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

// ── Logout ───────────────────────────────────────────────────────────────────
// POST /api/v1/users/logout
export const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { new: true }
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
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, { location: user.location }, "Location updated"));
});

// ── Update Profile ────────────────────────────────────────────────────────────
// PATCH /api/v1/users/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone, skills, anonymousMode } = req.body;

  const updates = {};
  if (fullName) updates.fullName = fullName;
  if (phone) updates.phone = phone;
  if (skills)
    updates.skills = Array.isArray(skills) ? skills : JSON.parse(skills);
  if (typeof anonymousMode === "boolean") updates.anonymousMode = anonymousMode;
  if (anonymousMode === "true") updates.anonymousMode = true;
  if (anonymousMode === "false") updates.anonymousMode = false;

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
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

  // Delete old avatar from Cloudinary
  if (req.user.avatarPublicId) {
    await deleteFromCloudinary(req.user.avatarPublicId);
  }

  const uploaded = await uploadOnCloudinary(req.file.path);
  if (!uploaded) {
    throw new ApiError(500, "Avatar upload failed");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: uploaded.secure_url },
    { new: true }
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
export const addGuardian = asyncHandler(async (req, res) => {
  const { guardianEmail } = req.body;
  if (!guardianEmail) throw new ApiError(400, "Guardian email is required");

  const guardian = await User.findOne({ email: guardianEmail });
  if (!guardian) throw new ApiError(404, "No user found with that email");

  const user = await User.findById(req.user._id);
  if (user.guardians.includes(guardian._id)) {
    throw new ApiError(409, "Already a guardian");
  }

  user.guardians.push(guardian._id);
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, { guardianId: guardian._id }, "Guardian added"));
});