// skillforge-backend/routes/dashboardRoutes.js
import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// ✅ Auth Middleware (reuse from other routes)
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ✅ Get Dashboard Data (resumeScore, roadmapProgress, interests)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "resumeScore roadmapProgress interests"
    );

    res.json({
      resumeScore: user.resumeScore || 0,
      roadmapProgress: user.roadmapProgress || 0,
      interests: user.interests || [],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Update Dashboard Data (resumeScore, roadmapProgress)
router.put("/update", authMiddleware, async (req, res) => {
  try {
    const { resumeScore, roadmapProgress } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { resumeScore, roadmapProgress },
      { new: true }
    ).select("resumeScore roadmapProgress interests");

    res.json({
      message: "Dashboard updated successfully",
      dashboard: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
