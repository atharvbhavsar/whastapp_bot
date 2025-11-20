# Phase 1: Text Chatbot API (Basic) - Implementation Guide

**Status**: ✅ Complete  
**Goal**: Get a simple LLM chatbot API working with SSE streaming  
**Tech Stack**: Node.js, Express, Vercel AI SDK, OpenAI GPT-4o

---

## 📁 Project Structure

```
services/text-chatbot/
├── src/
│   ├── index.ts                   # Express server entry point
│   ├── routes/
│   │   └── chat.ts                # POST /api/chat endpoint
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── chat.ts            # Vercel AI SDK streamText logic
│   │   │   └── prompts.ts         # System prompts
│   │   └── utils/
│   │       └── logger.ts          # Simple console logger
│   ├── middleware/
│   │   └── cors.ts                # CORS configuration
│   └── types/
│       └── index.ts               # TypeScript type definitions
├── .env                           # Environment variables (add your API key)
├── .env.example                   # Environment template
├── .gitignore
├── package.json
└── tsconfig.json
```

---

## 🚀 Setup Instructions

### 1. Install Dependencies

Navigate to the text-chatbot directory and install packages:

```bash
cd services/text-chatbot
npm install
```

### 2. Configure Environment Variables

Edit the `.env` file and add your OpenAI API key:

```bash
# .env
PORT=3000
NODE_ENV=development
OPENAI_API_KEY=sk-your-actual-api-key-here
ALLOWED_ORIGINS=*
```

**⚠️ Important**: Replace `sk-your-actual-api-key-here` with your real OpenAI API key.

### 3. Start the Development Server

```bash
npm run dev
```

You should see:

```
[INFO] 2025-11-17T... 🚀 Text Chatbot API server running on port 3000
[INFO] 2025-11-17T... 📊 Health check: http://localhost:3000/health
[INFO] 2025-11-17T... 💬 Chat endpoint: http://localhost:3000/api/chat
[INFO] 2025-11-17T... 🌍 Environment: development
```

---

## ✅ Testing Checklist

### Test 1: Health Check

```bash
curl http://localhost:3000/health
```

**Expected Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-11-17T...",
  "service": "text-chatbot"
}
```

---

### Test 2: Basic Chat (English)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Hello! What can you help me with?"
      }
    ]
  }'
```

**Expected**: You should see Server-Sent Events (SSE) streaming response starting with:

```
data: {"type":"start","messageId":"..."}

data: {"type":"text-start","id":"..."}

data: {"type":"text-delta","id":"...","delta":"Hello"}
...
```

---

### Test 3: Multi-turn Conversation

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "What is the admission process?"
      },
      {
        "role": "assistant",
        "content": "I can help you with admission information. The admission process typically involves..."
      },
      {
        "role": "user",
        "content": "What documents do I need?"
      }
    ]
  }'
```

**Expected**: The bot should respond in context, understanding the previous conversation.

---

### Test 4: Hindi Language Support

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "नमस्ते! प्रवेश प्रक्रिया के बारे में बताएं"
      }
    ]
  }'
```

**Expected**: Response should be in Hindi (हिन्दी).

---

### Test 5: Tamil Language Support

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "வணக்கம்! சேர்க்கை செயல்முறை என்ன?"
      }
    ]
  }'
```

**Expected**: Response should be in Tamil (தமிழ்).

---

### Test 6: Telugu Language Support

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "హలో! ప్రవేశ ప్రక్రియ ఏమిటి?"
      }
    ]
  }'
```

**Expected**: Response should be in Telugu (తెలుగు).

---

### Test 7: Code-Switching (Mixed Languages)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "मुझे admission के बारे में जानना है"
      }
    ]
  }'
```

**Expected**: Bot should handle Hindi-English code-switching naturally.

---

### Test 8: Invalid Request Handling

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": []
  }'
```

**Expected Response:**

```json
{
  "error": "Bad Request",
  "message": "Messages array is required and must not be empty",
  "statusCode": 400
}
```

---

## 🎯 Key Features Implemented

✅ **Express Server**: Running on port 3000  
✅ **Vercel AI SDK Integration**: Using `streamText()` with GPT-4o  
✅ **SSE Streaming**: Via `pipeUIMessageStreamToResponse()`  
✅ **Multilingual Support**: Automatic language detection  
✅ **CORS Enabled**: Allows browser requests  
✅ **Error Handling**: Proper error responses  
✅ **Health Check**: `/health` endpoint  
✅ **Logging**: Console logging with timestamps  
✅ **Type Safety**: Full TypeScript support

---

## 🔧 Available NPM Scripts

```bash
npm run dev         # Start development server with hot reload
npm run build       # Compile TypeScript to JavaScript
npm start           # Run compiled production build
npm run type-check  # Check TypeScript types without building
```

---

## 📊 API Endpoints

### `GET /health`

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-11-17T12:00:00.000Z",
  "service": "text-chatbot"
}
```

---

### `POST /api/chat`

Streaming chat endpoint.

**Request Body:**

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Your message here"
    }
  ],
  "collegeId": "optional-college-id",
  "sessionId": "optional-session-id"
}
```

**Response:** Server-Sent Events (SSE) stream with UI message format.

---

## 🌍 Multilingual Capabilities

The chatbot automatically detects and responds in the user's language:

- **Supported Languages**: Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi, English
- **Code-Switching**: Handles mixed language inputs
- **Language Consistency**: Maintains the conversation language throughout
- **Instant Switch**: Can switch languages mid-conversation

---

## 🐛 Troubleshooting

### Server won't start

**Problem**: `Error: Cannot find module 'express'`  
**Solution**: Run `npm install` in the `services/text-chatbot` directory.

---

### API Key Error

**Problem**: `Error: OpenAI API key not found`  
**Solution**: Make sure you've set `OPENAI_API_KEY` in your `.env` file.

---

### Port already in use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`  
**Solution**: Either kill the process using port 3000 or change the port in `.env`:

```bash
# Find and kill process on port 3000 (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Or change port in .env
PORT=3001
```

---

### CORS errors in browser

**Problem**: Browser shows CORS error  
**Solution**: Make sure `ALLOWED_ORIGINS=*` is set in `.env` (for development only).

---

## 🎓 How It Works

### 1. Request Flow

```
Client → POST /api/chat → Express Server
                          ↓
                    Validate Request
                          ↓
                    Create Chat Stream (Vercel AI SDK)
                          ↓
                    OpenAI GPT-4o
                          ↓
                    Stream Response (SSE)
                          ↓
                    Client receives tokens in real-time
```

### 2. System Prompt

The chatbot uses a carefully crafted system prompt that:

- Emphasizes multilingual support
- Instructs language detection and consistency
- Defines the assistant's role as a college helper
- Lists common query types it can handle

### 3. Streaming Implementation

Uses Vercel AI SDK's `pipeUIMessageStreamToResponse()`:

- Converts `streamText()` result to UI message format
- Sends Server-Sent Events (SSE)
- Compatible with React `useChat` hook (Phase 2)
- Provides structured message format for tool calls (Phase 4)

---

## 📝 Environment Variables Reference

| Variable          | Description          | Default       | Required |
| ----------------- | -------------------- | ------------- | -------- |
| `PORT`            | Server port          | `3000`        | No       |
| `NODE_ENV`        | Environment mode     | `development` | No       |
| `OPENAI_API_KEY`  | OpenAI API key       | -             | **Yes**  |
| `ALLOWED_ORIGINS` | CORS allowed origins | `*`           | No       |

---

## 🚦 Success Criteria

- ✅ Server starts without errors
- ✅ Health check responds correctly
- ✅ Chat endpoint accepts and validates requests
- ✅ Streaming SSE works properly
- ✅ LLM responds in user's language
- ✅ Multiple messages maintain conversation context
- ✅ Error handling works for invalid requests
- ✅ At least 3 Indian languages tested successfully

---

## ➡️ Next Steps

**Phase 2**: Build React widget that connects to this API

- Create chat UI with message list and input
- Implement `useChat` hook from Vercel AI SDK
- Add floating button for easy embedding
- Build as embeddable widget for college websites

---

## 🔗 Related Documentation

- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Express.js Documentation](https://expressjs.com/)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

---

**Phase 1 Complete! 🎉**

You now have a working multilingual chatbot API with streaming support.
