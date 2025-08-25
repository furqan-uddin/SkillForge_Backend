// controllers/dashboardController.js
import Roadmap from "../models/Roadmap.js";
import User from "../models/User.js";
import ProgressLog from "../models/ProgressLog.js";

export const getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("resumeScore interests");

    // Roadmap Progress - average across all roadmaps
    const roadmaps = await Roadmap.find({ userId: req.userId });
    let roadmapProgress = 0;
    if (roadmaps.length > 0) {
      const total = roadmaps.reduce((acc, r) => acc + r.progressPercent(), 0);
      roadmapProgress = Math.round(total / roadmaps.length);
    }

    // Calculate streaks
    const logs = await ProgressLog.find({ userId: req.userId }).sort({ date: 1 }).select("date");
    const days = [...new Set(logs.map((l) => new Date(l.date.toDateString()).getTime()))].sort();

    let current = 0, longest = 0;
    for (let i = 0; i < days.length; i++) {
      if (i === 0) {
        current = 1;
        longest = 1;
      } else {
        const diff = (days[i] - days[i - 1]) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          current += 1;
        } else if (diff > 1) {
          longest = Math.max(longest, current);
          current = 1;
        }
      }
    }
    longest = Math.max(longest, current);

    res.json({
      resumeScore: user?.resumeScore || 0,
      roadmapProgress,
      interests: user?.interests || [],
      currentStreak: current || 0,
      longestStreak: longest || 0,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ message: "Failed to load dashboard" });
  }
};
