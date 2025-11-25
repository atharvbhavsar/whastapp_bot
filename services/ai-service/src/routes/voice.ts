import { Router } from "express";
import { AccessToken } from "livekit-server-sdk";

const router = Router();

/**
 * POST /api/voice/token
 * Generate LiveKit access token for voice room
 *
 * Request Body:
 * {
 *   "collegeId": "demo-college",
 *   "sessionId": "session_abc123",
 *   "participantName": "User" (optional)
 * }
 *
 * Response:
 * {
 *   "token": "eyJhbGc...",
 *   "wsUrl": "wss://your-project.livekit.cloud",
 *   "roomName": "demo-college-session_abc123"
 * }
 */
router.post("/token", async (req, res) => {
  try {
    const { collegeId, sessionId, participantName, chatHistory } = req.body;

    // Debug: Log received chat history
    console.log(
      `🔍 Received chatHistory: ${JSON.stringify(chatHistory || [])}`
    );
    console.log(`🔍 Chat history length: ${chatHistory?.length || 0}`);

    // Validate required fields
    if (!collegeId || !sessionId) {
      return res.status(400).json({
        error: "collegeId and sessionId are required",
      });
    }

    // Validate environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error("Missing LiveKit credentials in environment variables");
      return res.status(500).json({
        error:
          "Server configuration error - LiveKit credentials not configured",
      });
    }

    // Construct room name (unique per college + session + timestamp)
    // Adding timestamp ensures a fresh room for each connection
    const timestamp = Date.now();
    const roomName = `${collegeId}-${sessionId}-${timestamp}`;

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: `${sessionId}-${timestamp}`, // Unique participant identity with timestamp
      name: participantName || "User",
      metadata: JSON.stringify({
        collegeId,
        sessionId,
        chatHistory: chatHistory || [], // Pass chat history to agent
      }),
      ttl: "1h", // Token expires in 1 hour
    });

    // Grant permissions
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true, // User can send audio
      canSubscribe: true, // User can receive audio
      canPublishData: true, // User can send data (for transcripts)
    });

    // Generate JWT token
    const token = await at.toJwt();

    console.log(`Generated token for room: ${roomName}, session: ${sessionId}`);

    res.json({
      token,
      wsUrl: livekitUrl,
      roomName,
    });
  } catch (error) {
    console.error("Error generating voice token:", error);
    res.status(500).json({
      error: "Failed to generate access token",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
