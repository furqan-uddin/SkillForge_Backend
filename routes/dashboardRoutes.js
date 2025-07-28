// routes/dashboardRoutes.js
import express from "express";
import User from "../models/User.js";
import authMiddleware from "../middlewares/authMiddleware.js"; // ✅ Reuse same middleware

const router = express.Router();

// ✅ Get Dashboard Data

router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("resumeScore roadmapProgress interests");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      resumeScore: user.resumeScore || 0,
      roadmapProgress: user.roadmapProgress || 0,
      interests: user.interests || [],
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// ✅ Update Dashboard Data
router.put("/update", authMiddleware, async (req, res) => {
  try {
    const { resumeScore, roadmapProgress } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { resumeScore, roadmapProgress },
      { new: true }
    ).select("resumeScore roadmapProgress interests");

    res.json({ message: "Dashboard updated successfully", dashboard: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
