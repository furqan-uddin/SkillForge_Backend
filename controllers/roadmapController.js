// controllers/roadmapController.js
import Roadmap from "../models/Roadmap.js";
import ProgressLog from "../models/ProgressLog.js";

/** Normalize AI JSON -> {interest, weeks:[{title, steps:[{text}]}]} */
const normalizeWeeks = (weeksObjectOrArray) => {
  if (Array.isArray(weeksObjectOrArray)) {
    return weeksObjectOrArray.map((w) => ({
      title: w.title,
      steps: (w.steps || []).map((t) => (typeof t === "string" ? { text: t } : t)),
    }));
  }
  const weeks = [];
  Object.keys(weeksObjectOrArray || {}).forEach((wk) => {
    const stepsArr = weeksObjectOrArray[wk] || [];
    weeks.push({
      title: wk,
      steps: stepsArr.map((t) => ({ text: t })),
    });
  });
  return weeks;
};

/** Helper: attach progress inline to a roadmap doc/object */
const withProgress = (roadmapDoc) => {
  const obj = roadmapDoc.toObject ? roadmapDoc.toObject() : roadmapDoc;
  return { ...obj, progress: roadmapDoc.progressPercent() };
};

/** Helper: upsert today’s progress snapshot */
const upsertTodayLog = async (userId, roadmapId, progress) => {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  await ProgressLog.updateOne(
    { userId, roadmapId, date: midnight },
    { $set: { progress } },
    { upsert: true }
  );
};

// POST /api/roadmaps
// Save (or replace) a roadmap for a specific interest (max 10 per user)
export const createOrReplaceRoadmap = async (req, res) => {
  try {
    const { interest, weeks } = req.body;
    if (!interest || !weeks) {
      return res.status(400).json({ message: "interest and weeks are required" });
    }

    const normalizedWeeks = normalizeWeeks(weeks);

    // If new interest (not replacing), enforce max 10
    const existing = await Roadmap.findOne({ userId: req.userId, interest });
    if (!existing) {
      const count = await Roadmap.countDocuments({ userId: req.userId });
      if (count >= 10) {
        return res.status(400).json({ message: "You can only save up to 10 roadmaps." });
      }
    }

    const roadmap = await Roadmap.findOneAndUpdate(
      { userId: req.userId, interest },
      { interest, userId: req.userId, weeks: normalizedWeeks },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const progress = roadmap.progressPercent();
    await upsertTodayLog(req.userId, roadmap._id, progress);

    return res.json({ roadmap: withProgress(roadmap) });
  } catch (err) {
    console.error("createOrReplaceRoadmap error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/roadmaps
export const getUserRoadmaps = async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ userId: req.userId }).sort({ updatedAt: -1 });
    return res.json({
      roadmaps: roadmaps.map((r) => withProgress(r)),
    });
  } catch (err) {
    console.error("getUserRoadmaps error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/roadmaps/:id
export const getRoadmapById = async (req, res) => {
  try {
    const roadmap = await Roadmap.findOne({ _id: req.params.id, userId: req.userId });
    if (!roadmap) return res.status(404).json({ message: "Roadmap not found" });
    return res.json({ roadmap: withProgress(roadmap) });
  } catch (err) {
    console.error("getRoadmapById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/roadmaps/:id/step
// body: { weekIndex, stepIndex, completed?: boolean }  -> if `completed` omitted, toggles
export const toggleStep = async (req, res) => {
  try {
    const { weekIndex, stepIndex, completed } = req.body;

    const roadmap = await Roadmap.findOne({ _id: req.params.id, userId: req.userId });
    if (!roadmap) return res.status(404).json({ message: "Roadmap not found" });

    const week = roadmap.weeks?.[weekIndex];
    if (!week) return res.status(400).json({ message: "Invalid weekIndex" });

    const step = week.steps?.[stepIndex];
    if (!step) return res.status(400).json({ message: "Invalid stepIndex" });

    const nextVal = typeof completed === "boolean" ? !!completed : !step.completed;
    step.completed = nextVal;
    step.completedAt = nextVal ? new Date() : null;

    await roadmap.save();

    const progress = roadmap.progressPercent();
    await upsertTodayLog(req.userId, roadmap._id, progress);

    return res.json({ roadmap: withProgress(roadmap) });
  } catch (err) {
    console.error("toggleStep error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/roadmaps/:id/logs
export const getProgressLogs = async (req, res) => {
  try {
    const logs = await ProgressLog.find({
      userId: req.userId,
      roadmapId: req.params.id,
    })
      .sort({ date: 1 })
      .select("date progress -_id");

    return res.json({ logs });
  } catch (err) {
    console.error("getProgressLogs error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/roadmaps/streak
// Calculates current & longest streak across ALL roadmaps for the user
export const getStreaks = async (req, res) => {
  try {
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

    return res.json({ currentStreak: current || 0, longestStreak: longest || 0 });
  } catch (err) {
    console.error("getStreaks error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/roadmaps/:id
export const deleteRoadmap = async (req, res) => {
  try {
    const roadmap = await Roadmap.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!roadmap) {
      return res.status(404).json({ message: "Roadmap not found" });
    }
    return res.json({ message: "✅ Roadmap deleted successfully" });
  } catch (error) {
    console.error("deleteRoadmap error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
