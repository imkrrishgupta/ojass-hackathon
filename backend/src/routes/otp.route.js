import { Router } from "express";
import { 
    sendOtpController, 
    verifyOtpController 
} from "../controllers/otp.controller.js";

const router = Router();

router.post("/verify", verifyOtpController);

export default router;