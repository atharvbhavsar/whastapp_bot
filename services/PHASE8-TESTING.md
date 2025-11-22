# Phase 8 Voice Integration - Testing Guide

## ✅ What's Been Implemented

### 1. **Context Sharing Between Text and Voice**

- **Widget → Voice Agent**: Text chat history is passed to voice agent when connecting
- **Voice Agent → Widget**: Voice transcripts are sent back and displayed as chat messages
- **Unified Display**: Both text and voice messages appear in the same chat window
- **Chronological Order**: Messages sorted by timestamp regardless of source

### 2. **Transcript Sending**

- Python agent sends **user transcripts** after speech-to-text
- Python agent sends **assistant transcripts** after text-to-speech
- Transcripts are sent via LiveKit data channel with format:
  ```json
  {
    "type": "transcript",
    "role": "user" | "agent",
    "text": "transcript content",
    "timestamp": 1234567890
  }
  ```

### 3. **Visual Indicators**

- Voice messages show a **microphone icon** badge
- "AI Speaking..." indicator during agent response
- Mute/unmute button when connected

## 🚀 Testing Steps

### Prerequisites

1. **Get LiveKit Credentials**

   - Sign up at https://cloud.livekit.io
   - Create a new project
   - Copy: API Key, API Secret, WebSocket URL

2. **Set Up Environment Variables**

   **services/ai-service/.env**:

   ```env
   PORT=3000
   OPENAI_API_KEY=sk-your-key
   LIVEKIT_API_KEY=your-key
   LIVEKIT_API_SECRET=your-secret
   LIVEKIT_URL=wss://your-project.livekit.cloud
   ```

   **services/voice-agent/.env.local**:

   ```env
   LIVEKIT_URL=wss://your-project.livekit.cloud
   LIVEKIT_API_KEY=your-key
   LIVEKIT_API_SECRET=your-secret
   OPENAI_API_KEY=sk-your-key
   DEEPGRAM_API_KEY=your-deepgram-key
   CARTESIA_API_KEY=your-cartesia-key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-key
   ```

### Step 1: Start Services

**Terminal 1 - AI Service (Express.js)**:

```bash
cd services/ai-service
npm run dev
```

Should see: `🚀 Server running on http://localhost:3000`

**Terminal 2 - Voice Agent (Python)**:

```bash
cd services/voice-agent
uv run python src/agent.py dev
```

Should see: `INFO:agent:Starting agent...`

**Terminal 3 - Widget (React)**:

```bash
cd services/widget
npm run dev
```

Should see: `VITE ready at http://localhost:5173`

### Step 2: Test Text Chat First

1. Open http://localhost:5173
2. Click the chat button (bottom-right)
3. Send a text message: "What courses do you offer?"
4. Verify AI responds with streaming
5. Send 2-3 more messages to build chat history

### Step 3: Test Voice Integration

1. **Click the phone icon** in chat header
2. **Grant microphone permissions** when prompted
3. **Wait for green phone icon** (connected)
4. **Speak a question**: "Tell me about admission fees"
5. Watch for:
   - Your transcript appears as a message with mic icon
   - "AI Speaking..." badge appears
   - Agent's voice response plays
   - Agent transcript appears as message with mic icon

### Step 4: Test Context Sharing

1. Keep the voice call connected
2. Ask a follow-up question referencing previous text chat
3. Example: If you asked about "courses" in text, now say:
   - "What are the fees for those courses?"
4. **Agent should understand** "those courses" from text chat context

### Step 5: Test Mixed Mode

1. During voice call, **type a text message**
2. Verify text message appears in chat
3. **Speak another voice message**
4. Both should appear chronologically
5. Disconnect voice call
6. Continue with text chat
7. Reconnect voice - previous messages should be available

## 🔍 What to Look For

### ✅ Success Indicators

- [ ] Voice button appears in chat header
- [ ] Phone icon turns green when connected
- [ ] User voice transcript appears with mic icon
- [ ] Agent voice transcript appears with mic icon
- [ ] Voice transcripts interleaved with text messages
- [ ] Agent remembers previous text messages during voice call
- [ ] Mute/unmute button works
- [ ] "AI Speaking..." badge shows during agent response
- [ ] Voice call disconnects cleanly
- [ ] Can reconnect after disconnect

### ❌ Common Issues

**"Failed to get access token"**

- Check LIVEKIT_API_KEY/SECRET in services/ai-service/.env
- Verify Express.js server is running
- Check browser console for CORS errors

**"Failed to connect to LiveKit"**

- Check LIVEKIT_URL format: `wss://your-project.livekit.cloud`
- Verify Python agent is running
- Check LiveKit dashboard for active rooms

**No transcripts appearing**

- Check Python agent logs for "Sent user transcript" messages
- Verify data channel is working in browser console
- Check for JSON parsing errors in console

**Agent doesn't remember text chat**

- Verify chatHistory is passed in token request (Network tab)
- Check Python agent logs: "Loaded X previous messages"
- Ensure participant metadata is set correctly

**No audio from agent**

- Check speaker/headphone connection
- Verify CARTESIA_API_KEY in voice-agent/.env.local
- Look for TTS errors in Python agent logs

## 🎯 Test Scenarios

### Scenario 1: Pure Voice Conversation

1. Start voice call immediately (no text)
2. Ask 3-4 questions via voice
3. Verify all transcripts appear
4. Check chronological ordering

### Scenario 2: Text → Voice Transition

1. Have 5+ message text conversation
2. Click voice button
3. Ask follow-up question via voice
4. Agent should reference text history
5. Verify context is maintained

### Scenario 3: Mixed Mode

1. Send 2 text messages
2. Start voice call
3. Ask 1 voice question
4. Type 1 text message (while on call)
5. Ask 1 more voice question
6. Verify: text/voice/text/voice messages all visible

### Scenario 4: Disconnect & Reconnect

1. Start voice call
2. Ask 2 questions
3. Disconnect
4. Send text message
5. Reconnect voice
6. Ask question referencing earlier messages
7. Agent should have full history

## 📊 Architecture Flow

```
┌─────────────┐
│   Widget    │
│  (React)    │
└──────┬──────┘
       │ 1. Request token + chatHistory
       ↓
┌─────────────────────┐
│   Express.js        │
│  (Token Generator)  │
└──────┬──────────────┘
       │ 2. Generate JWT with metadata
       ↓
┌────────────────────────┐
│   LiveKit Cloud        │
│  (WebRTC/Signaling)    │
└───┬─────────────────┬──┘
    │                 │
    │ 3. WebRTC      │ 4. Worker connects
    ↓                 ↓
┌─────────┐      ┌──────────────┐
│ Widget  │←────→│ Python Agent │
│ Audio   │ 5.   │ (Voice AI)   │
└─────────┘ Data │              │
            Chan │              │
            nel  └──────────────┘
```

## 🐛 Debugging Commands

**Check LiveKit room status**:

```bash
# In Python agent terminal, look for:
INFO:agent:Starting agent for college: demo-college
INFO:livekit:Connected to room: demo-college-session_xxx
```

**Check Express.js logs**:

```bash
# Should see token generation:
Generated token for room: demo-college-session_xxx
```

**Check browser console**:

```javascript
// Should see:
"Requesting access token...";
"Access token received, connecting to LiveKit...";
"Connected to LiveKit room";
"Received data: {type: 'transcript', ...}";
```

## 📝 Notes

- **Session ID**: Generated from localStorage, persists across page reloads
- **Room Name**: Format is `{collegeId}-{sessionId}`
- **Token Expiry**: 1 hour (need to reconnect after)
- **Message Ordering**: Based on `createdAt` timestamp
- **Voice Indicator**: `isVoice: true` flag in ChatMessage

## 🎉 Expected User Experience

1. User has natural text conversation
2. Switches to voice seamlessly mid-conversation
3. Agent remembers everything from text chat
4. Voice transcripts appear alongside text messages
5. Can switch back to text anytime
6. Full conversation history maintained
7. Visual distinction (mic icon) for voice messages
