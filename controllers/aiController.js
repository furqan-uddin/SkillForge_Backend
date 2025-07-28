// controllers/aiController.js
import fs from "fs";
import { PDFDocument } from "pdf-lib";
import mammoth from "mammoth";
import Groq from "groq-sdk";
import User from "../models/User.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ✅ AI Roadmap Generator
export const generateRoadmap = async (req, res) => {
  const { interests } = req.body;

  try {
    if (!interests || interests.length === 0) {
      return res.status(400).json({ error: "No interests provided" });
    }

    const roadmaps = {};

    for (const interest of interests) {
      const completion = await groq.chat.completions.create({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content:
              "You are an expert career mentor. Generate a clear 6-week step-by-step learning roadmap. Each step should be concise (1-2 lines).",
          },
          {
            role: "user",
            content: `Generate a 6-week learning roadmap for: ${interest}.`,
          },
        ],
      });

      roadmaps[interest] =
        completion.choices[0].message.content
          .split("\n")
          .filter((line) => line.trim() !== "");
    }

    await User.findByIdAndUpdate(req.userId, { roadmapProgress: 10 });

    res.json({ roadmaps, progress: 10 });
  } catch (error) {
    console.error("Groq Roadmap Error:", error);
    res.status(500).json({ error: "Failed to generate roadmap" });
  }
};

// ✅ Resume Analyzer
export const analyzeResume = async (req, res) => {
  let extractedText = "";
  const userId = req.body.userId;

  try {
    if (req.file) {
      const filePath = req.file.path;

      if (req.file.mimetype === "application/pdf") {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(dataBuffer);
        const pages = pdfDoc.getPages();
        for (const page of pages) {
          const textContent = await page.getTextContent();
          const text = textContent.items.map((item) => item.str).join(" ");
          extractedText += text + "\n";
        }
      } else if (req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const result = await mammoth.extractRawText({ path: filePath });
        extractedText = result.value;
      }

      fs.unlinkSync(filePath); // Clean up uploaded file
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
          content: "You are a professional resume reviewer. Give a score (0-100) and 3-5 suggestions.",
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
};
