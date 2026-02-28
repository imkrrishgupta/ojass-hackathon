import { Router } from "express";
import {
  getSkillOptions,
  getMySkills,
  updateMySkills,
  findSkilledResponders,
  getAllSkilledUsers,
} from "../controllers/skill.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public
router.route("/options").get(getSkillOptions);
router.route("/all").get(getAllSkilledUsers);
router.route("/nearby").get(findSkilledResponders);

// Authenticated
router.route("/my").get(verifyJWT, getMySkills);
router.route("/my").put(verifyJWT, updateMySkills);

export default router;
