import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  updateLocation,
  updateProfile,
  updateAvatar,
  changePassword,
  addGuardian,
  sendOTP,
  verifyOTP,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Public routes
router.post("/api/v1/users/register", upload.single("avatar"), registerUser);
router.post("/api/v1/users/login", loginUser);
router.post("/api/v1/users/refresh-token", refreshAccessToken);
router.post("/api/v1/users/send-otp", sendOTP);
router.post("/api/v1/users/verify-otp", verifyOTP);

// Protected routes (require JWT)
router.post("/api/v1/users/logout", verifyJWT, logoutUser);
router.get("/api/v1/users/me", verifyJWT, getCurrentUser);
router.patch("/api/v1/users/location", verifyJWT, updateLocation);
router.patch("/api/v1/users/profile", verifyJWT, updateProfile);
router.patch("/api/v1/users/avatar", verifyJWT, upload.single("avatar"), updateAvatar);
router.patch("/api/v1/users/change-password", verifyJWT, changePassword);
router.post("/api/v1/users/guardians", verifyJWT, addGuardian);

export default router;