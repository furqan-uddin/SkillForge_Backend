// routes/roadmapRoutes.js
import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  createOrReplaceRoadmap,
  getUserRoadmaps,
  getRoadmapById,
  toggleStep,
  getProgressLogs,
  // getStreaks,
  deleteRoadmap,
} from "../controllers/roadmapController.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createOrReplaceRoadmap); 
router.get("/", getUserRoadmaps); 
// router.get("/streak", getStreaks); 
router.get("/:id", getRoadmapById); 
router.delete("/:id", deleteRoadmap);
router.patch("/:id/step", toggleStep);
router.get("/:id/logs", getProgressLogs); 

export default router;
