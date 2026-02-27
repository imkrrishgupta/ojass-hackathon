import { Router } from "express";
import {
  adminIncidentSummary,
  createIncident,
  listNearbyIncidents,
  listOpenIncidents,
  resolveIncident,
  respondToIncident,
  suggestBestVolunteer,
} from "../controllers/incident.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").post(verifyJWT, createIncident);
router.route("/open").get(listOpenIncidents);
router.route("/nearby").get(listNearbyIncidents);
router.route("/admin-summary").get(adminIncidentSummary);
router.route("/:incidentId/respond").post(verifyJWT, respondToIncident);
router.route("/:incidentId/resolve").post(verifyJWT, resolveIncident);
router.route("/:incidentId/best-volunteer").get(verifyJWT, suggestBestVolunteer);

export default router;
