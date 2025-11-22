# PHASE 8: Voice Agent Widget Integration

## 📋 Overview

This phase integrates the Python voice agent (running on LiveKit Cloud) with the React widget frontend, enabling users to have voice conversations directly through the chat interface. The implementation follows the **LiveKit WebRTC architecture** where the React widget connects directly to LiveKit Cloud via WebRTC, and your Express.js server handles token generation only.

**Architecture Clarification:**

- ❌ Widget does NOT connect to Express.js for WebRTC
- ✅ Widget connects directly to LiveKit Cloud via WebRTC
- ✅ Express.js only generates access tokens for authentication
- ✅ Python agent runs as a worker, managed by LiveKit Cloud

---

## 🏗️ Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Voice Call Architecture                     │
└─────────────────────────────────────────────────────────────────┘

User clicks "Call" button in Widget
         ↓
Widget → POST /api/voice/token (Express.js)
         ↓
Express.js generates JWT using livekit-server-sdk
         ↓
Widget receives: { token, wsUrl }
         ↓
Widget connects to LiveKit Cloud directly via WebRTC
         ↓
         wss://your-project.livekit.cloud
         ↓
LiveKit Cloud assigns Python Worker to handle the room
         ↓
Python Agent (running locally for now, later on Railway)
         ↓
┌────────────────────────────────────────────────────────────────┐
│                    Voice Pipeline in Agent                      │
├────────────────────────────────────────────────────────────────┤
│  User Audio → Deepgram STT → OpenAI LLM + RAG → TTS → Audio  │
└────────────────────────────────────────────────────────────────┘
         ↓
Audio + Transcripts streamed back to Widget via WebRTC
         ↓
Widget displays transcripts in chat UI (like text messages)
```

**Key Points:**

1. **Direct WebRTC Connection**: Widget → LiveKit Cloud (no Express.js proxy)
2. **Token-based Auth**: Express.js generates short-lived JWT tokens
3. **Worker Management**: LiveKit Cloud dispatches jobs to your Python worker
4. **Real-time Audio**: Bi-directional audio streams over WebRTC
5. **Transcription Display**: STT transcripts shown as chat messages

---

## 📦 Required Dependencies

### 1. Express.js Server (Text Chatbot Service)

```bash
cd services/text-chatbot
npm install livekit-server-sdk
```

**Package**: `livekit-server-sdk`

- Purpose: Generate access tokens for room authentication
- Used in: Token generation endpoint

### 2. React Widget

```bash
cd services/widget
npm install livekit-client @livekit/components-react
```

**Packages**:

- `livekit-client`: Core LiveKit SDK for browser (WebRTC, Room, Track management)
- `@livekit/components-react`: Pre-built React components (optional, for quick UI)

### 3. Python Voice Agent (Already Set Up)

No new dependencies needed - already using:

- `livekit-agents` SDK
- `deepgram`, `cartesia` for STT/TTS
- `openai` for LLM

---

## 🔧 Implementation Steps

### **Step 1: Express.js Token Generation Endpoint**

**File**: `services/text-chatbot/src/routes/voice.ts` (new file)

**Purpose**: Generate LiveKit access tokens for widget authentication

**Implementation**:

```typescript
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
  const { collegeId, sessionId, participantName } = req.body;

  // Validate required fields
  if (!collegeId || !sessionId) {
    return res.status(400).json({
      error: "collegeId and sessionId are required",
    });
  }

  // Construct room name (unique per college + session)
  const roomName = `${collegeId}-${sessionId}`;

  // Create access token
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity: sessionId, // Unique participant identity
      name: participantName || "User",
      metadata: JSON.stringify({
        collegeId,
        sessionId,
      }),
    }
  );

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

  res.json({
    token,
    wsUrl: process.env.LIVEKIT_URL, // e.g., wss://your-project.livekit.cloud
    roomName,
  });
});

export default router;
```

**Environment Variables** (`.env`):

```bash
LIVEKIT_API_KEY=your-api-key-from-livekit-cloud
LIVEKIT_API_SECRET=your-api-secret-from-livekit-cloud
LIVEKIT_URL=wss://your-project.livekit.cloud
```

**Register Route** in `services/text-chatbot/src/index.ts`:

```typescript
import voiceRouter from "./routes/voice";

app.use("/api/voice", voiceRouter);
```

---

### **Step 2: React Widget - LiveKit Hook**

**File**: `services/widget/src/hooks/useVoiceCall.ts` (new file)

**Purpose**: Manage LiveKit room connection, audio tracks, and transcripts

**Implementation**:

```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  RoomOptions,
} from "livekit-client";

interface VoiceCallConfig {
  apiUrl: string; // Express.js API base URL
  collegeId: string;
  sessionId: string;
}

interface UseVoiceCallReturn {
  // Connection state
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;

  // Audio state
  isMuted: boolean;
  isAgentSpeaking: boolean;

  // Transcripts
  userTranscripts: string[];
  agentTranscripts: string[];

  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  toggleMute: () => Promise<void>;
}

export function useVoiceCall(config: VoiceCallConfig): UseVoiceCallReturn {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);

  const [userTranscripts, setUserTranscripts] = useState<string[]>([]);
  const [agentTranscripts, setAgentTranscripts] = useState<string[]>([]);

  const roomRef = useRef<Room | null>(null);

  // Connect to LiveKit room
  const connect = useCallback(async () => {
    if (roomRef.current?.state === "connected") {
      console.log("Already connected");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Step 1: Get access token from Express.js
      const response = await fetch(`${config.apiUrl}/api/voice/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collegeId: config.collegeId,
          sessionId: config.sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get access token");
      }

      const { token, wsUrl } = await response.json();

      // Step 2: Create LiveKit Room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Step 3: Set up event listeners
      room
        .on(RoomEvent.Connected, () => {
          console.log("Connected to LiveKit room");
          setIsConnected(true);
          setIsConnecting(false);
        })
        .on(RoomEvent.Disconnected, () => {
          console.log("Disconnected from room");
          setIsConnected(false);
          setIsAgentSpeaking(false);
        })
        .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
        .on(RoomEvent.DataReceived, handleDataReceived)
        .on(RoomEvent.AudioPlaybackStatusChanged, () => {
          if (!room.canPlaybackAudio) {
            // Show UI to enable audio (browser autoplay policy)
            room.startAudio();
          }
        });

      // Step 4: Connect to LiveKit Cloud
      await room.connect(wsUrl, token);

      // Step 5: Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true);

      roomRef.current = room;
    } catch (err) {
      console.error("Failed to connect:", err);
      setError(err instanceof Error ? err.message : "Connection failed");
      setIsConnecting(false);
    }
  }, [config]);

  // Handle incoming audio tracks from agent
  const handleTrackSubscribed = useCallback(
    (
      track: RemoteTrack,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (track.kind === Track.Kind.Audio) {
        console.log("Agent audio track subscribed");

        // Attach audio to play through speakers
        const audioElement = track.attach();
        audioElement.autoplay = true;
        document.body.appendChild(audioElement);

        // Monitor audio levels to detect when agent is speaking
        track.on("speaking", () => setIsAgentSpeaking(true));
        track.on("stopped-speaking", () => setIsAgentSpeaking(false));
      }
    },
    []
  );

  // Handle transcripts from agent (sent via data channel)
  const handleDataReceived = useCallback(
    (payload: Uint8Array, participant: RemoteParticipant | undefined) => {
      const decoder = new TextDecoder();
      const data = JSON.parse(decoder.decode(payload));

      // Expecting format: { type: 'transcript', role: 'user' | 'agent', text: '...' }
      if (data.type === "transcript") {
        if (data.role === "user") {
          setUserTranscripts((prev) => [...prev, data.text]);
        } else if (data.role === "agent") {
          setAgentTranscripts((prev) => [...prev, data.text]);
        }
      }
    },
    []
  );

  // Disconnect from room
  const disconnect = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Toggle microphone mute
  const toggleMute = useCallback(async () => {
    if (roomRef.current) {
      const newMutedState = !isMuted;
      await roomRef.current.localParticipant.setMicrophoneEnabled(
        !newMutedState
      );
      setIsMuted(newMutedState);
    }
  }, [isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnecting,
    isConnected,
    error,
    isMuted,
    isAgentSpeaking,
    userTranscripts,
    agentTranscripts,
    connect,
    disconnect,
    toggleMute,
  };
}
```

---

### **Step 3: React Widget - Voice Call UI Component**

**File**: `services/widget/src/components/voice/VoiceCallButton.tsx` (new file)

**Purpose**: UI button to initiate/end voice calls

**ShadCN Components Needed**:

- `button` (already installed)
- `badge` (already installed)
- `tooltip` (already installed)

**Implementation**:

```tsx
import { useState } from "react";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useVoiceCall } from "@/hooks/useVoiceCall";

interface VoiceCallButtonProps {
  apiUrl: string;
  collegeId: string;
  sessionId: string;
  onTranscript?: (role: "user" | "agent", text: string) => void;
}

export function VoiceCallButton({
  apiUrl,
  collegeId,
  sessionId,
  onTranscript,
}: VoiceCallButtonProps) {
  const {
    isConnecting,
    isConnected,
    error,
    isMuted,
    isAgentSpeaking,
    userTranscripts,
    agentTranscripts,
    connect,
    disconnect,
    toggleMute,
  } = useVoiceCall({ apiUrl, collegeId, sessionId });

  // Forward transcripts to parent (to display in chat window)
  useEffect(() => {
    if (onTranscript && userTranscripts.length > 0) {
      const latestUserTranscript = userTranscripts[userTranscripts.length - 1];
      onTranscript("user", latestUserTranscript);
    }
  }, [userTranscripts, onTranscript]);

  useEffect(() => {
    if (onTranscript && agentTranscripts.length > 0) {
      const latestAgentTranscript =
        agentTranscripts[agentTranscripts.length - 1];
      onTranscript("agent", latestAgentTranscript);
    }
  }, [agentTranscripts, onTranscript]);

  return (
    <div className="flex items-center gap-2">
      {/* Call/Hang Up Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isConnected ? "destructive" : "default"}
              size="icon"
              onClick={isConnected ? disconnect : connect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <span className="animate-spin">⏳</span>
              ) : isConnected ? (
                <PhoneOff className="h-5 w-5" />
              ) : (
                <Phone className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isConnected ? "End Call" : "Start Voice Call"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Mute Button (only visible when connected) */}
      {isConnected && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isMuted ? "secondary" : "outline"}
                size="icon"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Agent Speaking Indicator */}
      {isAgentSpeaking && (
        <Badge variant="secondary" className="animate-pulse">
          AI Speaking...
        </Badge>
      )}

      {/* Error Display */}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
```

---

### **Step 4: Integrate Voice Button into Chat Header**

**File**: `services/widget/src/components/chat/ChatHeader.tsx` (modify existing)

**Add Voice Call Button to Header**:

```tsx
import { VoiceCallButton } from "../voice/VoiceCallButton";

interface ChatHeaderProps {
  // ... existing props
  apiUrl: string;
  collegeId: string;
  sessionId: string;
  onVoiceTranscript: (role: "user" | "agent", text: string) => void;
}

export function ChatHeader({
  // ... existing props
  apiUrl,
  collegeId,
  sessionId,
  onVoiceTranscript,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-2">
        {/* Existing header content */}
      </div>

      {/* Voice Call Button */}
      <VoiceCallButton
        apiUrl={apiUrl}
        collegeId={collegeId}
        sessionId={sessionId}
        onTranscript={onVoiceTranscript}
      />
    </div>
  );
}
```

---

### **Step 5: Display Voice Transcripts as Chat Messages**

**File**: `services/widget/src/components/chat/ChatWindow.tsx` (modify existing)

**Add Transcript Messages to Chat**:

```tsx
import { useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isVoice?: boolean; // Flag to distinguish voice messages
}

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);

  // Handler for voice transcripts
  const handleVoiceTranscript = (role: "user" | "agent", text: string) => {
    const newMessage: Message = {
      id: `voice-${Date.now()}`,
      role: role === "user" ? "user" : "assistant",
      content: text,
      isVoice: true,
    };

    setMessages((prev) => [...prev, newMessage]);
  };

  return (
    <div>
      <ChatHeader
        // ... other props
        onVoiceTranscript={handleVoiceTranscript}
      />

      <MessageList messages={messages} />

      {/* Rest of chat window */}
    </div>
  );
}
```

**File**: `services/widget/src/components/chat/MessageBubble.tsx` (modify existing)

**Add Visual Indicator for Voice Messages**:

```tsx
import { Mic } from "lucide-react";

export function MessageBubble({ message }: { message: Message }) {
  return (
    <div className={/* existing className */}>
      {message.isVoice && (
        <Mic className="h-3 w-3 inline-block mr-1 text-blue-500" />
      )}
      {message.content}
    </div>
  );
}
```

---

### **Step 6: Python Agent - Send Transcripts via Data Channel**

**File**: `services/voice-agent/src/agent.py` (modify existing)

**Add Transcript Broadcasting**:

```python
from livekit.agents import Agent, RunContext, function_tool
from livekit import rtc
import json

class Assistant(Agent):
    async def _send_transcript(self, role: str, text: str):
        """Send transcript to all participants via data channel"""
        if self.room and self.room.local_participant:
            data = json.dumps({
                "type": "transcript",
                "role": role,  # 'user' or 'agent'
                "text": text,
            })

            await self.room.local_participant.publish_data(
                data.encode('utf-8'),
                reliable=True,
            )

# Modify STT handler to send user transcripts
async def entrypoint(ctx: JobContext):
    # ... existing code ...

    # When user speaks (STT result)
    @session.on("user_speech_committed")
    async def on_user_speech(speech_data):
        transcript = speech_data.transcript
        await assistant._send_transcript("user", transcript)

    # When agent responds (before TTS)
    @session.on("agent_speech_committed")
    async def on_agent_speech(speech_data):
        transcript = speech_data.text
        await assistant._send_transcript("agent", transcript)
```

---

## 🚀 Deployment Strategy

### **Current Phase (Local Testing)**

1. **Python Agent**: Run locally

   ```bash
   cd services/voice-agent
   uv run python src/agent.py dev
   ```

2. **Express.js**: Run locally or deploy to Vercel

   ```bash
   cd services/text-chatbot
   npm run dev
   ```

3. **Widget**: Run locally for testing
   ```bash
   cd services/widget
   npm run dev
   ```

### **Production Deployment**

#### **1. LiveKit Cloud Setup**

- Sign up at https://cloud.livekit.io
- Create a new project
- Get API Key, API Secret, and WebSocket URL
- Configure webhook URL (for monitoring, optional)

#### **2. Python Agent Deployment (Railway/Render)**

**Option A: Railway**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Set environment variables
railway variables set LIVEKIT_URL=wss://...
railway variables set LIVEKIT_API_KEY=...
railway variables set LIVEKIT_API_SECRET=...

# Deploy
railway up
```

**Dockerfile** for Python agent:

```dockerfile
FROM python:3.13-slim

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN pip install uv && uv sync

COPY . .

CMD ["uv", "run", "python", "src/agent.py", "start"]
```

**Important**: Agent must run continuously as a worker, not serverless

#### **3. Express.js Token Service (Vercel)**

Already deployed - just add environment variables:

```bash
vercel env add LIVEKIT_API_KEY
vercel env add LIVEKIT_API_SECRET
vercel env add LIVEKIT_URL
```

#### **4. Widget (CDN)**

Build and deploy to Cloudflare/Vercel:

```bash
cd services/widget
npm run build
# Upload dist/ to CDN
```

---

## 🎨 UI/UX Enhancements

### **Recommended ShadCN Components**

Already installed:

- ✅ `button` - Call/mute buttons
- ✅ `badge` - Speaking indicator
- ✅ `tooltip` - Button hints
- ✅ `avatar` - User/agent icons

**Optional additions** (for richer UI):

- `progress` - Audio level visualization
- `dialog` - Call permission prompts
- `alert` - Error messages

**Add with**:

```bash
cd services/widget
npx shadcn@latest add progress dialog alert
```

### **Audio Visualizer Component** (Optional)

**File**: `services/widget/src/components/voice/AudioVisualizer.tsx`

```tsx
import { useEffect, useRef } from "react";

export function AudioVisualizer({ isActive }: { isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Simple waveform animation
    let animationId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#3b82f6";

      for (let i = 0; i < 5; i++) {
        const height = Math.random() * 20 + 5;
        ctx.fillRect(i * 10, (canvas.height - height) / 2, 6, height);
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [isActive]);

  return <canvas ref={canvasRef} width={60} height={30} className="rounded" />;
}
```

---

## ✅ Testing Checklist

### **Local Testing**

1. ✅ Start Python agent locally
2. ✅ Start Express.js server
3. ✅ Start widget dev server
4. ✅ Click call button
5. ✅ Verify LiveKit connection
6. ✅ Speak and verify STT transcription appears
7. ✅ Verify agent responds with audio
8. ✅ Verify agent transcript appears
9. ✅ Test mute/unmute
10. ✅ Test call disconnect

### **Production Testing**

1. ✅ Deploy Python agent to Railway
2. ✅ Verify agent connects to LiveKit Cloud
3. ✅ Deploy Express.js to Vercel
4. ✅ Test token generation endpoint
5. ✅ Deploy widget to CDN
6. ✅ Test end-to-end call flow
7. ✅ Load test with multiple concurrent calls
8. ✅ Monitor LiveKit Cloud dashboard for metrics

---

## 📊 Monitoring & Debugging

### **LiveKit Cloud Dashboard**

Monitor:

- Active rooms
- Connected participants
- Worker health
- Audio/video quality metrics
- Error logs

### **Python Agent Logs**

```python
import logging

logger = logging.getLogger("agent")
logger.info(f"Connected participants: {len(room.participants)}")
logger.info(f"User transcript: {transcript}")
logger.info(f"Agent response: {response}")
```

### **Browser Console**

```typescript
// Enable LiveKit debug logs
import { setLogLevel, LogLevel } from "livekit-client";
setLogLevel(LogLevel.debug);
```

---

## 🔒 Security Considerations

1. **Token Expiration**: Set `ttl` in access token (default 6 hours)

   ```typescript
   const at = new AccessToken(key, secret, {
     identity: sessionId,
     ttl: "1h", // Token expires in 1 hour
   });
   ```

2. **Room Isolation**: Each session gets unique room name

   ```typescript
   const roomName = `${collegeId}-${sessionId}`;
   ```

3. **Rate Limiting**: Add rate limit to token endpoint

   ```typescript
   import rateLimit from "express-rate-limit";

   const tokenLimiter = rateLimit({
     windowMs: 60 * 1000, // 1 minute
     max: 5, // Max 5 requests per minute
   });

   app.use("/api/voice/token", tokenLimiter);
   ```

4. **CORS**: Restrict token endpoint to widget origin
   ```typescript
   app.use(
     "/api/voice",
     cors({
       origin: ["https://your-widget-cdn.com"],
     })
   );
   ```

---

## 🎯 Next Steps After Phase 8

1. **Phase 9**: Multi-tenant Architecture (college isolation, billing)
2. **Phase 10**: Analytics & Monitoring (conversation metrics, quality tracking)
3. **Phase 11**: Advanced Features (call recording, conversation history, sentiment analysis)

---

## 📚 Resources

- [LiveKit Documentation](https://docs.livekit.io)
- [LiveKit Client SDK JS](https://github.com/livekit/client-sdk-js)
- [LiveKit Server SDK Node](https://github.com/livekit/node-sdks)
- [LiveKit Agents Python](https://github.com/livekit/agents)
- [LiveKit Cloud Dashboard](https://cloud.livekit.io)

---

## 🤔 Architecture Q&A

**Q: Does the widget connect to Express.js for audio?**
A: No. Widget connects directly to LiveKit Cloud via WebRTC. Express.js only generates authentication tokens.

**Q: Where does the Python agent run?**
A: Python agent runs as a worker process on Railway/Render. It connects to LiveKit Cloud and waits for room assignments.

**Q: How are transcripts sent to the widget?**
A: Python agent sends transcripts over LiveKit's data channel (WebRTC data channel), not HTTP.

**Q: Can I use serverless for the Python agent?**
A: No. The agent must run as a long-lived process (worker) to maintain persistent connection to LiveKit Cloud.

**Q: How many concurrent calls can one agent handle?**
A: One Python worker can typically handle 10-20 concurrent voice calls. Scale horizontally by adding more workers.
