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
import { uploadAvatar } from "../middlewares/multer.middleware.js";

const router = Router();

// Public routes
router.route("/register").post(uploadAvatar.single("avatar"), registerUser);
router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/send-otp").post(sendOTP);
router.route("/verify-otp").post(verifyOTP);

// Protected routes (require JWT)
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/me").get(verifyJWT, getCurrentUser);
router.route("/location").patch(verifyJWT, updateLocation);
router.route("/update-profile").patch(verifyJWT, updateProfile);
router.route("/update-avatar").patch(verifyJWT, uploadAvatar.single("avatar"), updateAvatar);
router.route("/change-password").patch(verifyJWT, changePassword);
router.route("/add-guardians").post(verifyJWT, addGuardian);

export default router;

export default router;