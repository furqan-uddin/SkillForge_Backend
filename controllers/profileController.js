// controllers/profileController.js
import User from "../models/User.js";
import Roadmap from "../models/Roadmap.js";
import ProgressLog from "../models/ProgressLog.js";

// ✅ Get Logged-in User Profile + Stats
export const getLoggedInUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // ---- Roadmap Progress (average) ----
    const roadmaps = await Roadmap.find({ userId: req.userId });
    let roadmapProgress = 0;
    if (roadmaps.length > 0) {
      const total = roadmaps.reduce((acc, r) => acc + r.progressPercent(), 0);
      roadmapProgress = Math.round(total / roadmaps.length);
    }

    // ---- Streaks ----
    const logs = await ProgressLog.find({ userId: req.userId })
      .sort({ date: 1 })
      .select("date");

    const days = [...new Set(logs.map((l) => new Date(l.date.toDateString()).getTime()))].sort();
    let current = 0, longest = 0;
    for (let i = 0; i < days.length; i++) {
      if (i === 0) {
        current = 1;
        longest = 1;
      } else {
        const diff = (days[i] - days[i - 1]) / (1000 * 60 * 60 * 24);
        if (diff === 1) current += 1;
        else if (diff > 1) {
          longest = Math.max(longest, current);
          current = 1;
        }
      }
    }
    longest = Math.max(longest, current);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic,
      resumeScore: user.resumeScore,
      interests: user.interests || [],
      roadmapProgress,
      currentStreak: current || 0,
      longestStreak: longest || 0,
    });
  } catch (err) {
    console.error("Get Profile Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Update Name & Profile Pic
export const updateProfile = async (req, res) => {
  try {
    const { name, profilePic } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, profilePic },
      { new: true }
    ).select("-password");

    res.json({ message: "Profile updated successfully!", user });
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
