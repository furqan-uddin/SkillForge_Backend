// models/ProgressLog.js
import mongoose from "mongoose";

const ProgressLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    roadmapId: { type: mongoose.Schema.Types.ObjectId, ref: "Roadmap", index: true, required: true },
    date: { type: Date, required: true },  // truncate to midnight
    progress: { type: Number, required: true }, // 0-100 snapshot for that date
  },
  { timestamps: true }
);

ProgressLogSchema.index({ userId: 1, roadmapId: 1, date: 1 }, { unique: true });

const ProgressLog = mongoose.model("ProgressLog", ProgressLogSchema);
export default ProgressLog;
