import { Router } from "express";
import {
  getResourceTypes,
  addResource,
  getNearbyResources,
  getAllResources,
  verifyResource,
  deleteResource,
  getNearbyEmergencyServices,
} from "../controllers/communityResource.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public
router.route("/types").get(getResourceTypes);
router.route("/nearby").get(getNearbyResources);
router.route("/emergency-services").get(getNearbyEmergencyServices);
router.route("/").get(getAllResources);

// Authenticated
router.route("/").post(verifyJWT, addResource);
router.route("/:resourceId/verify").patch(verifyJWT, verifyResource);
router.route("/:resourceId").delete(verifyJWT, deleteResource);

export default router;
