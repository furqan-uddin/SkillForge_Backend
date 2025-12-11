# ⚡ SkillForge Backend – AI Career Planner API (Node.js + Express)

This is the backend API for **SkillForge**, a MERN + AI platform that provides:
- AI-generated learning roadmaps  
- Resume analysis & scoring  
- Job description matching  
- Skill gap analysis  
- Career insights  
- User authentication & dashboard stats  

The backend is built using **Node.js, Express.js, MongoDB, JWT**, and **Groq LLaMA AI models**.

🔗 **Live API Base URL:** https://skillforge-backend-qc22.onrender.com  
🔗 **Frontend Repo:** https://github.com/furqan-uddin/SkillForge  
🔗 **Backend Repo:** https://github.com/furqan-uddin/SkillForge_Backend  

---

## 🚀 Features (Backend)

### 🤖 AI-Powered Services
- AI Roadmap Generator (LLaMA-3)
- Resume Analyzer → Score + Suggestions
- Job Description Matcher (Resume vs JD)
- Skill Gap Analysis + Suggested Resources
- Career Insights (roles, certifications, priority skills)
- Interview Questions Generator

### 👤 User & Profile System
- Register, Login (JWT Auth)
- Reset password
- Save career interests
- Resume text storage
- Badge assignment (streaks, resume)

### 📊 Dashboard System
- Tracks learning streaks
- Tracks overall roadmap progress
- Calculates user metrics dynamically

### 📘 Roadmap System
- Create roadmaps for each interest
- Save progress for each week/step
- Fetch roadmaps by ID

---

## 🛠 Tech Stack

- Node.js  
- Express.js  
- MongoDB + Mongoose  
- Groq AI (LLaMA 3 models)  
- PDF & DOCX text extraction  
- JWT Authentication  
- Multer (Resume uploads)  
- JSONRepair for fixing AI output  

---

## 📂 Backend Folder Structure

```
skillforge-backend/
│── controllers/
│   ├── aiController.js
│   ├── authController.js
│   ├── dashboardController.js
│   ├── profileController.js
│   ├── roadmapContoller.js
│
│── middlewares/
│   ├── authMiddleware.js
│   ├── errorHandler.js
│
│── models/
│   ├── User.js
│   ├── ProgressLog.js
│   ├── Roadmap.js
│
│── routes/
│   ├── aiRoutes.js
│   ├── authRoutes.js
│   ├── dashboardRoutes.js
│   ├── profileRoutes.js
│   ├── roadmapRoutes.js
│
│── uploads/               # Temporary resume uploads
│── server.js              # Main entry
│── package.json
```

---

## 🧠 Controller Overview (Short Summary)


### **AI Controller**
- `generateRoadmap()` → Creates structured AI learning roadmap  
- `analyzeResume()` → Resume score + suggestions  
- `matchResumeWithJD()` → Resume vs job description comparison  
- `analyzeSkillGap()` → Missing skills + resources  
- `generateInterviewQuestions()` → 10 AI-generated interview questions  
- `getCareerInsights()` → Roles + Certifications + Priority skills  

### **Auth Controller**
- Register user  
- Login user  
- Reset password  

### **Profile Controller**
- Fetch logged-in user profile  
- Assign badges  
- Save resume text  

### **Dashboard Controller**
- Compute streaks  
- Calculate roadmap progress  
- Return dashboard metrics  

### **Roadmap Controller**
- Create roadmap  
- Get roadmap by ID  
- Update weekly roadmap step progress  

---

## ⚙️ Environment Variables
```
Create a `.env` file:

MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret_key
GROQ_API_KEY=your_groq_api_key
PORT=5000
```

---

## 🔧 Installation & Setup

```bash
git clone https://github.com/furqan-uddin/SkillForge_Backend
cd SkillForge_Backend
npm install
npm run dev
Backend runs on http://localhost:5000 by default.
```
---

## 🧪 Resume Upload Support

The backend supports:

PDF resume parsing

DOC / DOCX parsing

Plain text input

Temporary files are stored in /uploads and removed after processing.

---
## 🌐 Deployment

The backend is deployed on Render:
https://skillforge-backend-qc22.onrender.com
Make sure to configure environment variables in Render dashboard.


---

## 🧑‍💻 Author

**Mohammad Furqanuddin**  
🔗 LinkedIn: https://www.linkedin.com/in/mohammadfurqanuddin  
📧 Email: mohammedfurqan2108@gmail.com


