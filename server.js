// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import roadmapRoutes from "./routes/roadmapRoutes.js";

import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { notFound, errorHandler } from "./middlewares/errorHandler.js";

dotenv.config();
const app = express();

app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.use(cors());
app.use(express.json());

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api", aiRoutes); // ✅ All AI routes prefixed with /api
app.use("/api/roadmaps", roadmapRoutes); // ✅ NEW: roadmap persistence & progress


// Error handling
app.use(notFound);
app.use(errorHandler);

// ✅ Connect DB & Start Server
const PORT = process.env.PORT || 5000;
// start server after DB connect
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB Connected Successfully!");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB Connection Failed:", err);
    process.exit(1);
  });