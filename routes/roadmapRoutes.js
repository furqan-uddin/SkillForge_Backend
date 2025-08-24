// routes/roadmapRoutes.js
import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  createOrReplaceRoadmap,
  getUserRoadmaps,
  getRoadmapById,
  toggleStep,
  getProgressLogs,
  getStreaks,
  deleteRoadmap,
} from "../controllers/roadmapController.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createOrReplaceRoadmap);           // save/replace by interest
router.get("/", getUserRoadmaps);                   // list user roadmaps
router.get("/streak", getStreaks);                  // motivational streaks

router.get("/:id", getRoadmapById);                 // single roadmap
// ADD THIS
router.delete("/:id", deleteRoadmap);
router.patch("/:id/step", toggleStep);              // toggle a step completed
router.get("/:id/logs", getProgressLogs);           // logs for charts

export default router;
