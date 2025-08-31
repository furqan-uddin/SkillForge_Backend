// routes/aiRoutes.js
import express from "express";
import multer from "multer";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  analyzeResume,
  generateRoadmap,
  analyzeSkillGap,
  generateInterviewQuestions,
  getCareerInsights,
  matchResumeWithJD,
} from "../controllers/aiController.js";

const router = express.Router();

// Multer Config
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      "-" +
      file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/pdf" ||
      file.mimetype === "text/plain" ||
      file.mimetype === "application/msword" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, TXT, or Word (DOC/DOCX) files allowed"));
    }
  },
});

router.post("/generate-roadmap", authMiddleware, generateRoadmap);
router.post(
 "/analyze-resume",
  authMiddleware,
  upload.single("file"),
  analyzeResume
);
router.post("/match-jd", authMiddleware, matchResumeWithJD);
router.post("/interview", authMiddleware, generateInterviewQuestions);
router.post("/skill-gap", authMiddleware, analyzeSkillGap);
router.post("/insights", authMiddleware, getCareerInsights);

export default router;
