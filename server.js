// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";
import multer from "multer";
import { PDFDocument } from "pdf-lib";
import mammoth from "mammoth";
import Groq from "groq-sdk";

import User from "./models/User.js";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import authMiddleware from "./middlewares/authMiddleware.js"; // ✅ Correct path

dotenv.config();
const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.json());

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/dashboard", dashboardRoutes);

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

// ✅ AI Roadmap
app.post("/api/generate-roadmap", authMiddleware, async (req, res) => {
  const { interests } = req.body;
  try {
    if (!interests || interests.length === 0) {
      return res.status(400).json({ error: "No interests provided" });
    }

    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content: "You are an expert career mentor. Generate 6-week roadmaps for each interest.",
        },
        {
          role: "user",
          content: `My interests are: ${interests.join(", ")}.`,
        },
      ],
    });

    const roadmap = completion.choices[0].message.content;
    await User.findByIdAndUpdate(req.userId, { roadmapProgress: 10 });

    res.json({ roadmap, progress: 10 });
  } catch (error) {
    console.error("Groq Roadmap Error:", error);
    res.status(500).json({ error: "Failed to generate roadmap" });
  }
});

// ✅ Resume Analyzer
app.post("/api/analyze-resume", upload.single("file"), async (req, res) => {
  let extractedText = "";
  const userId = req.body.userId;

  try {
    if (req.file) {
      const filePath = req.file.path;
      if (req.file.mimetype === "application/pdf") {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(dataBuffer);
        extractedText = pdfDoc.getPages().map((p) => p.getTextContent?.() || "").join("\n");
      } else if (req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const result = await mammoth.extractRawText({ path: filePath });
        extractedText = result.value;
      }
      fs.unlinkSync(filePath);
    } else {
      extractedText = req.body.text || "";
    }

    if (!extractedText.trim()) {
      return res.status(400).json({ message: "No resume text found!" });
    }

    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content:
            "You are a professional resume reviewer. Give a score (0-100) and 3-5 suggestions.",
        },
        { role: "user", content: extractedText },
      ],
    });

    const aiResponse = completion.choices[0].message.content;
    const scoreMatch = aiResponse.match(/(\d{1,3})/);
    const score = scoreMatch ? Math.min(100, parseInt(scoreMatch[1])) : 50;

    let suggestionsArray = aiResponse
      .split(/\n|•|-/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5 && !/score/i.test(s));

    if (suggestionsArray.length === 0) {
      suggestionsArray = [
        "Add measurable achievements.",
        "Use strong action verbs.",
        "Tailor resume for specific roles.",
      ];
    }

    if (userId) {
      await User.findByIdAndUpdate(userId, { resumeScore: score });
    }

    res.json({ score, suggestions: suggestionsArray });
  } catch (error) {
    console.error("Groq Resume Error:", error);
    res.status(500).json({ error: "Failed to analyze resume" });
  }
});

// ✅ Connect DB & Start Server
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected Successfully!"))
  .catch((err) => console.error("MongoDB Connection Failed:", err));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
