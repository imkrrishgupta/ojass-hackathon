import { Router } from "express";
import {
  triggerIncident,
  getNearbyIncidents,
  getIncidentById,
  respondToIncident,
  resolveIncident,
  rateResponder,
  reportFalseAlert,
} from "../controllers/incident.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All incident routes require auth
router.use(verifyJWT);

// router.post("/", triggerIncident);
router.route("/").post(triggerIncident);
router.route("/nearby").get(getNearbyIncidents);
router.route("/:id").get(getIncidentById);
router.route("/:id/respond").post(respondToIncident);
router.route("/:id/resolve").patch(resolveIncident);
router.route("/:id/rate/:responderId").post(rateResponder);
router.route("/:id/report-false").post(reportFalseAlert);

export default router;