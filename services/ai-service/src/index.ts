import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { corsMiddleware } from "./middleware/cors.js";
import { chatRouter } from "./routes/chat.js";
import voiceRouter from "./routes/voice.js";
import { userRouter } from "./routes/user.js";
import { ragRouter } from "./routes/rag.js";
import { complaintRouter } from "./routes/complaints.js";
import { analyticsRouter } from "./routes/analytics.js";
import { twilioRouter } from "./routes/twilio.js";
import { registerRouter } from "./routes/register.js";
import { logger } from "./lib/utils/logger.js";
import { HealthCheckResponse } from "./types/index.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  const response: HealthCheckResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "text-chatbot",
  };
  res.json(response);
});

// Serve PCMC Registration Form natively over Ngrok
import path from "path";
app.get("/register", (req: Request, res: Response) => {
  res.sendFile(path.resolve("D:\\www.pcmcindia.gov.in\\register.html"));
});

// API routes
app.use("/api", chatRouter);
app.use("/api/voice", voiceRouter);
app.use("/api/user", userRouter);
app.use("/api/rag", ragRouter);
app.use("/api/complaints", complaintRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/twilio", twilioRouter);
app.use("/api/register", registerRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: any) => {
  logger.error("Unhandled error:", err);

  if (!res.headersSent) {
    res.status(500).json({
      error: "Internal Server Error",
      message:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Something went wrong",
      statusCode: 500,
    });
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 SCIRP+ AI Service running on port ${PORT}`);
  logger.info(`📊 Health: http://localhost:${PORT}/health`);
  logger.info(`📝 Complaints: http://localhost:${PORT}/api/complaints`);
  logger.info(`📡 Analytics: http://localhost:${PORT}/api/analytics`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT signal received: closing HTTP server");
  process.exit(0);
});
