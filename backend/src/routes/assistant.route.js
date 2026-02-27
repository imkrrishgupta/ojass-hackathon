import { Router } from "express";
import {
	getCrisisGuidance,
	getVolunteerQuestions,
	rateVolunteer,
} from "../controllers/assistant.controller.js";

const router = Router();

router.route("/crisis-guidance").post(getCrisisGuidance);
router.route("/volunteer-questions").get(getVolunteerQuestions);
router.route("/rate-volunteer").post(rateVolunteer);

export default router;
