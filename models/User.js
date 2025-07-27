// skillforge-backend/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // ✅ Already existing field
  interests: { type: [String], default: [] },

  // ✅ NEW fields for Profile
  profilePic: { type: String, default: "" }, // Will store URL only

  // ✅ NEW fields for Dashboard progress
  resumeScore: { type: Number, default: 0 },
  roadmapProgress: { type: Number, default: 0 }
});

// ✅ Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model("User", userSchema);
export default User;
