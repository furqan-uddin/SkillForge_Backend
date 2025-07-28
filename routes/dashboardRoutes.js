// routes/dashboardRoutes.js
import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  getDashboardData,
  updateDashboardData,
} from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/", authMiddleware, getDashboardData);
router.put("/update", authMiddleware, updateDashboardData);

export default router;
