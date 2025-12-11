# 🌟 SkillForge – AI-Powered Career Planner (Frontend)

SkillForge is a MERN + AI platform designed to help students and job-seekers understand their strengths, improve their resumes, generate customized learning roadmaps, and get career insights powered by AI.

This repository contains the **frontend** built using **React + Vite + Tailwind CSS + Framer Motion**.

🔗 **Live Website:** http://skill-forge-bice-seven.vercel.app  
🔗 **Backend API:** https://skillforge-backend-qc22.onrender.com  
🔗 **Frontend Repo:** https://github.com/furqan-uddin/SkillForge  
🔗 **Backend Repo:** https://github.com/furqan-uddin/SkillForge_Backend  

---

## 🚀 Features (Frontend)

### 🎯 AI Career Tools
- AI-generated **Learning Roadmaps**
- Resume Analyzer → Score + Actionable Suggestions
- Job Description Matcher (Resume vs JD)
- Skill Gap Analysis + Recommended Resources
- Career Insights (roles, certifications, priority skills)

### 🧑‍💻 User Features
- Secure Authentication (JWT)
- Dashboard with streaks + progress tracking
- Save & view career interests
- Track weekly roadmap completion
- Profile page with badges and stats

### 🎨 UI / UX Features
- React + Tailwind modern UI
- Framer Motion animations
- Responsive mobile-first design
- Toast notifications
- Clean folder structure with reusable components

---

## 🛠 Tech Stack

### **Frontend**
- React (Vite)
- Tailwind CSS
- Axios
- React Router
- Framer Motion
- Lucide Icons
- React Hot Toast
- Context API (Auth + Theme)

### **AI (Handled in backend)**
- Groq LLaMA 3 models  
- JSON-repaired responses  
- Resume parsing (PDF/DOCX)

---

## 📂 Project Folder Structure
```
src/
│── components/
│ ├── Navbar.jsx
│ ├── ProtectedRoute.jsx
│ ├── ThemeToggle.jsx
│ ├── WeekAccordion.jsx
│ ├── ProgressWeekAccordion.jsx
│
│── contexts/
│ ├── ThemeContext.jsx
│ ├── AuthContext.jsx
│
│── pages/
│ ├── Home.jsx
│ ├── Dashboard.jsx
│ ├── Login.jsx
│ ├── Register.jsx
│ ├── Profile.jsx
│ ├── ResumeAnalyzer.jsx
│ ├── JDMatcher.jsx
│ ├── InterviewPrep.jsx
│ ├── SkillGap.jsx
│ ├── AIRoadmap.jsx
│ ├── MyRoadmaps.jsx
│ ├── RoadmapDetail.jsx
│
│── utils/
│ ├── axiosInstance.js
│
├── App.jsx
├── main.jsx
```

---

## ⚙️ Environment Variables

Create a `.env` file:

VITE_API_BASE_URL=https://skillforge-backend-qc22.onrender.com

Restart the dev server after adding env values.

---

## 🔧 Installation & Setup (Local Development)

```
git clone https://github.com/furqan-uddin/SkillForge
cd SkillForge
npm install
npm run dev
```
---

## 🌐 Connecting to Backend

The frontend communicates with backend through axiosInstance.js.

baseURL: import.meta.env.VITE_API_BASE_URL

---
## 🙌 Author

Mohammad Furqanuddin

🔗 LinkedIn: https://www.linkedin.com/in/mohammadfurqanuddin

📧 Email: mohammedfurqan2108@gmail.com
