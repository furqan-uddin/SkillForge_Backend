// controllers/aiController.js
import fs from "fs";
import pdfParse from "pdf-parse-fixed";
import mammoth from "mammoth";
import Groq from "groq-sdk";
import User from "../models/User.js";
import { jsonrepair } from "jsonrepair";
import { assignBadge } from "./profileController.js";

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
      await User.findByIdAndUpdate(userId, {      
        resumeScore: score,
        resumeText: extractedText, // 🔹 Save resume text centrally
      });
      if (score >= 80) await assignBadge(userId, "📄 Strong Resume");
      if (score >= 95) await assignBadge(userId, "🏆 Resume Master");
    }

    res.json({ score, suggestions: suggestionsArray });
  } catch (error) {
    console.error("Groq Resume Error:", error);
    res.status(500).json({ error: "Failed to analyze resume" });
  }
};



export const matchResumeWithJD = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.resumeText) {
      return res.status(400).json({
        message: "No resume found. Please upload resume in Resume Analyzer first.",
      });
    }

    const { jdText } = req.body;
    if (!jdText) {
      return res.status(400).json({ message: "Job description is required" });
    }

    const prompt = `
      Compare this resume with the job description.
      Return JSON with:
      {
        "matchScore": number (0-100),
        "missingKeywords": string[],
        "suggestions": string[]
      }
      Resume: ${user.resumeText}
      Job Description: ${jdText}
    `;

    const response = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0].message.content;
    const data = JSON.parse(jsonrepair(raw));

    if (typeof data.matchScore !== "number") data.matchScore = 0;
    if (!Array.isArray(data.missingKeywords)) data.missingKeywords = [];
    if (!Array.isArray(data.suggestions)) data.suggestions = [];

    return res.json(data);
  } catch (error) {
    next(error);
  }
};


export const generateInterviewQuestions = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: "Role is required" });

    const prompt = `
      Generate 10 mock interview questions for role: ${role}.
      Format JSON: { "questions": [ "Q1", "Q2", ... ] }
    `;

    const response = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0].message.content;
    const data = JSON.parse(jsonrepair(raw));
    if (!Array.isArray(data.questions)) data.questions = [];

    return res.json(data);
  } catch (error) {
    next(error);
  }
};

export const analyzeSkillGap = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.resumeText) {
      return res.status(400).json({
        message: "No resume found. Please upload resume in Resume Analyzer first.",
      });
    }

    let { interests } = req.body;

    if (!Array.isArray(interests)) {
      if (typeof interests === "string") {
        interests = interests.split(",").map((s) => s.trim()).filter(Boolean);
      } else {
        interests = [];
      }
    }

    const prompt = `
      Compare resume skills with these interests: ${interests.join(", ") || "N/A"}.
      Return JSON:
      {
        "missingSkills": [ ... ],
        "resources": [ { "skill": string, "link": string } ]
      }
      Resume: ${user.resumeText}
    `;

    const response = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0].message.content;
    let data = {};

    try {
      data = JSON.parse(jsonrepair(raw));
    } catch (err) {
      console.error("Skill Gap JSON parse failed:", err);
      data = { missingSkills: [], resources: [] };
    }

    if (!Array.isArray(data.missingSkills)) data.missingSkills = [];
    if (!Array.isArray(data.resources)) data.resources = [];

    return res.json(data);
  } catch (error) {
    console.error("Skill Gap Error:", error);
    next(error);
  }
};


export const getCareerInsights = async (req, res, next) => {
  try {
    const { resumeScore, interests, streaks, progress } = req.body;

    const prompt = `
      Based on profile:
      Resume Score: ${resumeScore}
      Interests: ${interests}
      Streaks: ${streaks}
      Progress: ${progress}
      
      Suggest 2-3 career paths, relevant certifications, and priority skills.
      Return JSON: {
        "roles": [ ... ],
        "certifications": [ ... ],
        "prioritySkills": [ ... ]
      }
    `;

    const response = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0].message.content;
    const data = JSON.parse(jsonrepair(raw));
    if (!Array.isArray(data.roles)) data.roles = [];
if (!Array.isArray(data.certifications)) data.certifications = [];
if (!Array.isArray(data.prioritySkills)) data.prioritySkills = [];

    return res.json(data);
  } catch (error) {
    next(error);
  }
};
