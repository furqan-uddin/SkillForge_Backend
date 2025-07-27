//skillforge-Backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import mongoose from "mongoose";
import User from "./models/User.js"; // ✅ Make sure this is imported at the top
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

import multer from "multer";
import fs from "fs";
import { PDFDocument } from "pdf-lib"; // ✅ New PDF library
import mammoth from "mammoth";

dotenv.config();

// ✅ Multer Config (Only PDF & DOCX)
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
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/profile", profileRoutes);
app.use("/api/dashboard", dashboardRoutes);



const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ AI Roadmap - Now also saves progress to DB
app.post('/api/generate-roadmap', async (req, res) => {
  const { interests, userId } = req.body; // ✅ UserId will be sent from frontend

  try {
    // ✅ Dummy roadmap (replace with AI later)
    const dummyRoadmap = `
      Week 1: Learn basics of HTML & CSS.
      Week 2: Study JavaScript fundamentals.
      Week 3: Explore React.js basics and component lifecycle.
      Week 4: Learn Node.js & Express.js for backend.
      Week 5: Integrate MongoDB with backend.
      Week 6: Build full-stack projects and practice DSA.
    `;

    // ✅ Simulate progress (50% for now)
    const progress = 50;

    // ✅ Save roadmapProgress to DB
    await User.findByIdAndUpdate(userId, { roadmapProgress: progress });

    res.json({ roadmap: dummyRoadmap, progress });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate roadmap' });
  }
});





// ✅ Resume Analyzer (Text + File Upload)
app.post("/api/analyze-resume", upload.single("file"), async (req, res) => {
  let extractedText = "";
  const userId = req.body.userId;

  try {
    // ✅ Extract text from uploaded file
    if (req.file) {
      const filePath = req.file.path;

      if (req.file.mimetype === "application/pdf") {
        const dataBuffer = fs.readFileSync(filePath);

        // ✅ Using pdf-lib instead of pdf-parse
        const pdfDoc = await PDFDocument.load(dataBuffer);
        const pages = pdfDoc.getPages();
        extractedText = pages.map((p) => p.getTextContent?.() || "").join("\n");

        // ⚠️ pdf-lib does not have native getTextContent() in all cases.
        // If it gives empty text for scanned PDFs, we will integrate Tesseract OCR later.
      } else if (
        req.file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const result = await mammoth.extractRawText({ path: filePath });
        extractedText = result.value;
      }

      fs.unlinkSync(filePath);
    } else {
      extractedText = req.body.text || "";
    }

    if (!extractedText.trim()) {
      return res.status(400).json({
        message: "No resume text found! Paste text or upload a valid file.",
      });
    }

    // ✅ Dummy scoring logic
    const wordCount = extractedText.split(/\s+/).length;
    const score = Math.min(100, Math.floor(wordCount / 5));

    console.log(`📄 Resume word count: ${wordCount}, Score: ${score}/100`);

    const suggestions = [
      "Add more action verbs like 'Led', 'Developed', 'Implemented'",
      "Include measurable achievements (e.g., increased sales by 20%)",
      "Highlight technical skills relevant to the job",
    ];

    if (userId) {
      await User.findByIdAndUpdate(userId, { resumeScore: score });
    }

    res.json({ score, suggestions });
  } catch (error) {
    console.error("❌ Error analyzing resume:", error);
    res.status(500).json({
      message:
        error.message || "Failed to analyze resume. Ensure the file format is correct.",
    });
  }
});


const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected Successfully!"))
  .catch((err) => console.error("MongoDB Connection Failed:", err));

app.use("/api/auth", authRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
