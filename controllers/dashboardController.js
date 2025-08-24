// controllers/dashboardController.js
import User from "../models/User.js";
import Roadmap from "../models/Roadmap.js";
import ProgressLog from "../models/ProgressLog.js";

// ✅ Get Dashboard Data
export const getDashboardData = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("resumeScore roadmapProgress interests");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // NEW: compute overall progress across roadmaps
    const roadmaps = await Roadmap.find({ userId: req.userId });
    const progresses = roadmaps.map((r) => r.progressPercent());
    const overallProgress =
      progresses.length ? Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length) : 0;

    // NEW: streaks from ProgressLog
    const logs = await ProgressLog.find({ userId: req.userId }).sort({ date: 1 }).select("date");
    const days = [...new Set(logs.map((l) => new Date(l.date.toDateString()).getTime()))].sort();
    let current = 0, longest = 0;
    for (let i = 0; i < days.length; i++) {
      if (i === 0) {
        current = 1; longest = 1;
      } else {
        const diff = (days[i] - days[i - 1]) / (1000 * 60 * 60 * 24);
        if (diff === 1) current += 1;
        else if (diff > 1) { longest = Math.max(longest, current); current = 1; }
      }
    }
    longest = Math.max(longest, current);

    res.json({
      resumeScore: user.resumeScore || 0,
      roadmapProgress: user.roadmapProgress || 0, // legacy field (safe to keep)
      overallProgress,                              // NEW
      interests: user.interests || [],
      streak: { current: current || 0, longest: longest || 0 }, // NEW
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Update Dashboard Data
export const updateDashboardData = async (req, res) => {
  try {
    const { resumeScore, roadmapProgress } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { resumeScore, roadmapProgress },
      { new: true }
    ).select("resumeScore roadmapProgress interests");

    res.json({ message: "Dashboard updated successfully", dashboard: updatedUser });
  } catch (error) {
    console.error("Update Dashboard Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
