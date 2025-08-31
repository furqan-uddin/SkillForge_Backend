// controllers/aiController.js
import fs from "fs";
import pdfParse from "pdf-parse-fixed";
import mammoth from "mammoth";
import Groq from "groq-sdk";
import User from "../models/User.js";
import { jsonrepair } from "jsonrepair";
import { assignBadge } from "./profileController.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

//AI Roadmap Generator
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

    const normalized = {};
    Object.keys(roadmaps).forEach((k) => {
      normalized[k.toLowerCase().trim()] = roadmaps[k];
    });

    //  Schema validation
    Object.values(normalized).forEach((weeks) => {
      for (const [week, steps] of Object.entries(weeks)) {
        if (!Array.isArray(steps) || steps.length !== 4) {
          throw new Error(`Invalid roadmap format at ${week}`);
        }
      }
    });

    await User.findByIdAndUpdate(req.userId, { roadmapProgress: 10 });

    res.json({ roadmaps: normalized, progress: 10 });
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
        req.file.mimetype ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
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

            Make all suggestions specific, concise, and directly actionable (avoid vague advice).
          `,
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
        resumeText: extractedText,
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
        message:
          "No resume found. Please upload resume in Resume Analyzer first.",
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

    // console.log(`[Interview] Request received for role: "${role}" (user: ${req.userId || "unknown"})`);

    const prompt = `
      Generate 15 mock interview questions for the role: ${role}.
      For each question, also provide a concise model answer.
      And try to give different question each time.
      Return ONLY valid JSON in this exact format:
      {
        "questions": [
          { "question": "Q1 text here", "answer": "Answer text here" },
          { "question": "Q2 text here", "answer": "Answer text here" }
        ]
      }
      `;

    const response = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content:
            "You are a strict JSON generator. Reply only with valid JSON matching the requested schema.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = response?.choices?.[0]?.message?.content;
    // console.log("[Interview] Raw AI response:", raw?.slice ? raw.slice(0, 2000) : raw);

    if (!raw) {
      console.error("[Interview] No content returned from AI for role:", role);
      return res.status(502).json({ error: "No response from AI service" });
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err1) {
      try {
        parsed = JSON.parse(jsonrepair(raw));
      } catch (err2) {
        console.error(
          "[Interview] Failed to parse AI output (raw):",
          err1,
          err2
        );
        return res.status(502).json({ error: "Failed to parse AI response" });
      }
    }

    if (!parsed || typeof parsed !== "object") {
      console.error("[Interview] Parsed AI output is not an object:", parsed);
      return res.status(502).json({ error: "Invalid AI response structure" });
    }

    if (!Array.isArray(parsed.questions)) parsed.questions = [];

    // Normalize shape: ensure each item is { question, answer }
    const normalized = parsed.questions
      .map((q) =>
        typeof q === "string"
          ? { question: q, answer: "" }
          : {
              question:
                q && (q.question ?? q.q ?? q.prompt)
                  ? String(q.question ?? q.q ?? q.prompt)
                  : "",
              answer:
                q && (q.answer ?? q.a ?? q.response)
                  ? String(q.answer ?? q.a ?? q.response)
                  : "",
            }
      )
      .filter((item) => item.question && item.question.trim().length > 0); 

    if (!normalized.length) {
      console.error(
        "[Interview] AI returned zero valid questions after normalization for role:",
        role
      );
      return res
        .status(502)
        .json({ error: "AI returned no valid questions. Try again." });
    }

    return res.json({ questions: normalized });
  } catch (error) {
    console.error("generateInterviewQuestions error:", error);
    next(error);
  }
};

export const analyzeSkillGap = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.resumeText) {
      return res.status(400).json({
        message:
          "No resume found. Please upload resume in Resume Analyzer first.",
      });
    }

    let { interests } = req.body;

    if (!Array.isArray(interests)) {
      if (typeof interests === "string") {
        interests = interests
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        interests = [];
      }
    }

    const prompt = `
      Compare resume skills with these interests: ${
        interests.join(", ") || "N/A"
      }.
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
      Interests: ${Array.isArray(interests) ? interests.join(", ") : interests}
      Streaks: ${streaks}
      Progress: ${progress}

      Suggest 2-3 career paths, relevant certifications (with provider), and priority skills.
      IMPORTANT: Return ONLY valid JSON in this exact format:
      {
        "roles": [ { "role": "Software Engineer", "description": "..." } ],
        "certifications": [ { "certification": "AWS Cloud Practitioner", "provider": "AWS" } ],
        "prioritySkills": [ "JavaScript", "System Design" ]
      }
    `;

    const response = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content:
            "You are a strict JSON generator. Respond ONLY with valid JSON matching the schema, no extra text or comments.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = response.choices?.[0]?.message?.content;
    if (!raw) {
      return res.status(502).json({ error: "No response from AI service" });
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      try {
        parsed = JSON.parse(jsonrepair(raw));
      } catch (err) {
        console.error("CareerInsights JSON parse failed:", err);
        return res.status(502).json({ error: "Failed to parse AI response" });
      }
    }

    // Normalize schema
    const data = {
      roles: Array.isArray(parsed.roles)
        ? parsed.roles.map((r) =>
            typeof r === "string"
              ? { role: r, description: "" }
              : { role: r.role || String(r), description: r.description || "" }
          )
        : [],
      certifications: Array.isArray(parsed.certifications)
        ? parsed.certifications.map((c) =>
            typeof c === "string"
              ? { certification: c, provider: "" }
              : {
                  certification: c.certification || String(c),
                  provider: c.provider || "",
                }
          )
        : [],
      prioritySkills: Array.isArray(parsed.prioritySkills)
        ? parsed.prioritySkills.map((s) => String(s))
        : [],
    };

    const isEmpty =
      data.roles.length === 0 &&
      data.certifications.length === 0 &&
      data.prioritySkills.length === 0;

    if (isEmpty) {
      return res
        .status(502)
        .json({ error: "AI did not return valid insights. Please try again." });
    }

    return res.json(data);
  } catch (error) {
    console.error("Career Insights Error:", error);
    next(error);
  }
};
