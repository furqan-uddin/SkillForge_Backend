// routes/profileRoutes.js
import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  getLoggedInUser,
  updateProfile,
} from "../controllers/profileController.js";

const router = express.Router();

router.get("/me", authMiddleware, getLoggedInUser);
router.put("/update", authMiddleware, updateProfile);

export default router;
