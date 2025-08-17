// routes/aiRoutes.js
import express from "express";
import multer from "multer";
import authMiddleware from "../middlewares/authMiddleware.js";
import { analyzeResume, generateRoadmap } from "../controllers/aiController.js";

const router = express.Router();

// ✅ Multer Config
const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only PDF and DOCX files are allowed!"));
    }
    cb(null, true);
  },
});

router.post("/generate-roadmap", authMiddleware, generateRoadmap);
router.post("/analyze-resume",upload.single("file"), analyzeResume);

export default router;
