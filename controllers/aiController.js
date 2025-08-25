// controllers/aiController.js
import fs from "fs";
import pdfParse from "pdf-parse-fixed";
import mammoth from "mammoth";
import Groq from "groq-sdk";
import User from "../models/User.js";
import { jsonrepair } from "jsonrepair";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ✅ AI Roadmap Generator
// ✅ Optimized AI Roadmap Generator (Detailed + JSON strict)

export const generateRoadmap = async (req, res) => {
  const { interests } = req.body;

  try {
    if (!interests || interests.length === 0) {
      return res.status(400).json({ error: "No interests provided" });
    }

    const prompt = `
You are an expert career mentor. Create a detailed learning roadmap for each user interest.
- Each roadmap must cover at least 6 weeks.
- Each week should have exactly 4 learning steps (clear, actionable, increasing depth).
- Output ONLY valid JSON (no markdown, no comments, no text).
Format:
{
  "Interest Name": {
    "Week 1": ["Step 1", "Step 2", "Step 3", "Step 4"],
    "Week 2": ["Step 1", "Step 2", "Step 3", "Step 4"]
  }
}
User interests: ${interests.join(", ")}
`;

    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content:
            "You are a JSON generator. Respond ONLY with valid JSON. No explanations, no markdown, no extra text.",
        },
        { role: "user", content: prompt },
      ],
    });

    let aiResponse = completion.choices[0].message.content;

    let roadmaps = {};
    try {
      roadmaps = JSON.parse(aiResponse);
    } catch (err) {
      console.warn("AI response invalid, attempting repair...");
      roadmaps = JSON.parse(jsonrepair(aiResponse));
    }

    // ✅ Schema validation
    Object.values(roadmaps).forEach((weeks) => {
      for (const [week, steps] of Object.entries(weeks)) {
        if (!Array.isArray(steps) || steps.length !== 4) {
          throw new Error(`Invalid roadmap format at ${week}`);
        }
      }
    });

    await User.findByIdAndUpdate(req.userId, { roadmapProgress: 10 });

    res.json({ roadmaps, progress: 10 });
  } catch (error) {
    console.error("Groq Roadmap Error:", error);
    res.status(500).json({ error: "Failed to generate roadmap" });
  }
};




// ✅ Resume Analyzer (fixed PDF extraction)
export const analyzeResume = async (req, res) => {
  let extractedText = "";
  const userId = req.userId;

  try {
    if (req.file) {
      const filePath = req.file.path;

      if (req.file.mimetype === "application/pdf") {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        extractedText = pdfData.text || "";
      } else if (
        req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        req.file.mimetype === "application/msword"
      ) {
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

    // 🔹 Force AI to return valid JSON (score + suggestions[])
    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content: `You are an expert resume reviewer.
Respond ONLY in valid JSON format with the structure:
{
  "score": <number between 0-100>,
  "suggestions": [
    "Use measurable achievements (e.g., increased sales by 20%).",
    "Tailor keywords to match the target job description.",
    "Shorten lengthy sentences for readability."
  ]
}

Scoring criteria:
- Clarity & readability
- Use of strong action verbs
- Quantifiable impact (numbers, percentages, metrics)
- Relevance to target role
- Overall structure & formatting

Make all suggestions specific, concise, and directly actionable (avoid vague advice).`

        },
        { role: "user", content: extractedText },
      ],
    });

    const aiResponse = completion.choices[0].message.content;

    let score = 50;
    let suggestionsArray = [];

    try {
      const parsed = JSON.parse(aiResponse);
      score = Math.min(100, parsed.score || 50);
      suggestionsArray = Array.isArray(parsed.suggestions)
        ? parsed.suggestions
        : [];
    } catch (err) {
      console.error("Resume JSON parse failed, falling back:", err);

      // Fallback: try to salvage useful text
      const scoreMatch = aiResponse.match(/(\d{1,3})/);
      score = scoreMatch ? Math.min(100, parseInt(scoreMatch[1])) : 50;
      suggestionsArray = aiResponse
        .split(/\n|•|-/)
        .map((s) => s.trim())
        .filter((s) => s.length > 5 && !/score/i.test(s));
    }

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
