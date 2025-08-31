// routes/profileRoutes.js
import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  getLoggedInUser,
  updateProfile,
  saveInterests,
  getInterests,
} from "../controllers/profileController.js";

const router = express.Router();

router.get("/me", authMiddleware, getLoggedInUser);
router.put("/update", authMiddleware, updateProfile);
router.post("/save-interests", authMiddleware, saveInterests);
router.get("/get-interests", authMiddleware, getInterests);

export default router;
