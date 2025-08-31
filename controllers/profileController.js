// controllers/profileController.js
import User from "../models/User.js";


// Get Logged-in User Profile + Stats
export const getLoggedInUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic,
      interests: user.interests || [],
      badges: user.badges || [],
    });
  } catch (err) {
    console.error("Get Profile Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update Name & Profile Pic
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

export const assignBadge = async (userId, badge) => {
  const user = await User.findById(userId);
  if (user && !user.badges.includes(badge)) {
    user.badges.push(badge);
    await user.save();
  }
};


// Save Career Interests
export const saveInterests = async (req, res) => {
  try {
    let { interests } = req.body;

    if (!Array.isArray(interests)) {
      return res.status(400).json({ message: "Interests must be an array" });
    }

    interests = [
      ...new Set(
        interests
          .map((i) => i.trim())
          .filter(
            (i) =>
              i.length >= 3 && i.length <= 50 && /^[a-zA-Z\s\-\&]+$/.test(i)
          )
      ),
    ];

    if (interests.length > 10) {
      return res.status(400).json({ message: "Maximum 10 interests allowed" });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { interests },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "✅ Interests saved successfully",
      interests: user.interests,
    });
  } catch (error) {
    console.error("Error saving interests:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Career Interests
export const getInterests = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("interests");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ interests: user.interests || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
