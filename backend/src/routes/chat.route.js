import { Router } from "express";
import { getMessages, sendMessage } from "../controllers/chat.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/:incidentId").get(getMessages);
router.route("/:incidentId").post(sendMessage);

export default router;