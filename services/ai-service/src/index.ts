import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { corsMiddleware } from "./middleware/cors.ts";
import { chatRouter } from "./routes/chat.ts";
import voiceRouter from "./routes/voice.ts";
import { userRouter } from "./routes/user.ts";
import { ragRouter } from "./routes/rag.ts";
import { complaintRouter } from "./routes/complaints.ts";
import { analyticsRouter } from "./routes/analytics.ts";
import { logger } from "./lib/utils/logger.ts";
import { HealthCheckResponse } from "./types/index.ts";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(corsMiddleware);
app.use(express.json());

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  const response: HealthCheckResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "text-chatbot",
  };
  res.json(response);
});

// API routes
app.use("/api", chatRouter);
app.use("/api/voice", voiceRouter);
app.use("/api/user", userRouter);
app.use("/api/rag", ragRouter);
app.use("/api/complaints", complaintRouter);
app.use("/api/analytics", analyticsRouter);

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
