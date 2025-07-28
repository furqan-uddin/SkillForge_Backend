// routes/profileRoutes.js
import express from "express";
import User from "../models/User.js";
import authMiddleware from "../middlewares/authMiddleware.js"; // ✅ Reuse same middleware

const router = express.Router();

// ✅ Get Logged-in User Profile
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Update Profile (Name & Profile Pic)
router.put("/update", authMiddleware, async (req, res) => {
  try {
    const { name, profilePic } = req.body;
    const user = await User.findByIdAndUpdate(req.userId, { name, profilePic }, { new: true }).select("-password");
    res.json({ message: "Profile updated successfully!", user });
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
