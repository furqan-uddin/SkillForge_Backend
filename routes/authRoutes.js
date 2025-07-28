// routes/authRoutes.js
import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  registerUser,
  loginUser,
  resetPassword,
  saveInterests,
  getInterests,
  getUserProfile,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/reset-password", resetPassword);
router.post("/save-interests", authMiddleware, saveInterests);
router.get("/get-interests", authMiddleware, getInterests);
router.get("/me", authMiddleware, getUserProfile);

export default router;
