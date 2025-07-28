// controllers/profileController.js
import User from "../models/User.js";

// ✅ Get Logged-in User Profile
export const getLoggedInUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
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
