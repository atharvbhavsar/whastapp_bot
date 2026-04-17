import { Router } from "express";
import { AccessToken } from "livekit-server-sdk";
import { logger } from "../lib/utils/logger.js";

const router = Router();

/**
 * POST /api/voice/token
 * Generate LiveKit access token for a civic voice reporting session.
 *
 * Request Body:
 * {
 *   "tenantId": "pune-uuid",
 *   "sessionId": "session_abc123",
 *   "participantName": "Citizen" (optional)
 * }
 *
 * Response:
 * {
 *   "token": "eyJhbGc...",
 *   "wsUrl": "wss://your-project.livekit.cloud",
 *   "roomName": "scirp-pune-session_abc123"
 * }
 */
router.post("/token", async (req, res) => {
  try {
    const { tenantId, sessionId, participantName, citizenEmail } = req.body;

    if (!tenantId || !sessionId) {
      return res.status(400).json({
        error: "tenantId and sessionId are required",
      });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      logger.error("Missing LiveKit credentials in environment variables");
      return res.status(500).json({
        error: "Server configuration error - LiveKit credentials not configured",
      });
    }

    const timestamp = Date.now();
    // Room name scoped to tenant (city) — ensures civic voice rooms are city-isolated
    const roomName = `scirp-${tenantId}-${sessionId}-${timestamp}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: `${sessionId}-${timestamp}`,
      name: participantName || "Citizen",
      metadata: JSON.stringify({
        tenantId,           // City identifier for voice agent to scope complaints
        sessionId,
        citizenEmail: citizenEmail || null,
      }),
      ttl: "1h",
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,      // Citizen can send audio
      canSubscribe: true,    // Citizen can receive AI audio response
      canPublishData: true,  // For transcript relay
    });

    const token = await at.toJwt();

    logger.info(`Voice token generated for room: ${roomName}, tenant: ${tenantId}`);

    res.json({
      token,
      wsUrl: livekitUrl,
      roomName,
    });
  } catch (error) {
    logger.error("Error generating voice token:", error);
    res.status(500).json({
      error: "Failed to generate access token",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/voice/message
 * Save a voice transcript message (complaint interaction) to status logs.
 *
 * Request Body:
 * {
 *   "tenantId": "pune-uuid",
 *   "complaintId": "uuid-of-complaint",
 *   "role": "user" | "assistant",
 *   "content": "The transcript text"
 * }
 */
router.post("/message", async (req, res) => {
  try {
    const { tenantId, complaintId, role, content } = req.body;

    if (!tenantId || !role || !content) {
      return res.status(400).json({
        error: "tenantId, role, and content are required",
      });
    }

    // If we have a complaint ID, log the voice interaction in status_logs
    if (complaintId) {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.SUPABASE_URL || "",
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ""
      );

      await supabase.from("status_logs").insert({
        tenant_id: tenantId,
        complaint_id: complaintId,
        status: "Voice Interaction",
        notes: `[${role.toUpperCase()}]: ${content.substring(0, 200)}`,
        updated_by_email: "voice-agent@scirp.gov",
      });
    }

    logger.info(`Voice message logged — tenant: ${tenantId}, role: ${role}`);
    res.json({ success: true, saved: !!complaintId });
  } catch (error) {
    logger.error("Error saving voice message:", error);
    res.status(500).json({
      error: "Failed to save voice message",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
