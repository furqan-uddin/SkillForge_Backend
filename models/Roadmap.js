// models/Roadmap.js
import mongoose from "mongoose";

const StepSchema = new mongoose.Schema({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
});

const WeekSchema = new mongoose.Schema({
  title: { type: String, required: true }, // e.g., "Week 1"
  steps: { type: [StepSchema], default: [] }, // exactly 4 per your AI format
});

const RoadmapSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    interest: { type: String, required: true }, // e.g., "Full Stack Development"
    weeks: { type: [WeekSchema], default: [] },
  },
  { timestamps: true }
);

// helper (not virtual) to compute % done
RoadmapSchema.methods.progressPercent = function () {
  const total = this.weeks.reduce((acc, w) => acc + w.steps.length, 0);
  if (!total) return 0;
  const done = this.weeks.reduce(
    (acc, w) => acc + w.steps.filter((s) => s.completed).length,
    0
  );
  return Math.round((done / total) * 100);
};

const Roadmap = mongoose.model("Roadmap", RoadmapSchema);
export default Roadmap;
