import { Router } from "express";

import { 
    verifyOTP
} from "../controllers/otp.controller.js";

const router = Router();

router.route("/verify").post(verifyOTP);

export default router;