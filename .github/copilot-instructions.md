# Copilot Instructions

## Project Overview

SIH 2025 Multi-College AI Assistant - a multilingual chatbot system for Indian college websites with text (SSE streaming) and voice (WebRTC/LiveKit) interfaces. Multi-tenant architecture via `collegeId` filtering.

## Architecture (4 Services)

```
widget (React/Vite) → ai-service (Express/Vercel AI SDK) → Supabase (pgvector)
                    ↘ LiveKit Cloud → voice-agent (Python/LiveKit Agents)
admin-dashboard (Next.js) → Supabase (document upload/embedding)
```

### Service Communication

- **Text Chat**: Widget → `POST /api/chat` (SSE) → ai-service → RAG via `searchDocuments` tool
- **Voice Chat**: Widget → `POST /api/voice/token` → LiveKit room → Python voice-agent → same RAG
- **RAG Flow**: Query → OpenAI embedding (`text-embedding-3-small`) → Supabase `match_documents` RPC

## Key Patterns

### AI SDK v5 (Critical)

Uses Vercel AI SDK v5 - API differs from v4:

```typescript
// ai-service: streamText with stepCountIs for multi-step tool calling
const result = streamText({
  model,
  system: SYSTEM_PROMPT,
  messages,
  tools: createRAGTools(collegeId),
  stopWhen: stepCountIs(5), // Required for tool → response flow
});

// widget: useChat with DefaultChatTransport
const { messages, sendMessage } = useChat({
  transport: new DefaultChatTransport({ api, body: { collegeId } }),
});
```

### Multilingual RAG (Important)

RAG queries MUST be English regardless of user language:

```typescript
// tools.ts - tool description enforces this
description: `CRITICAL: The query parameter MUST ALWAYS be in ENGLISH...`;
```

The LLM translates user queries before tool calls, responds in user's language after retrieval.

### Multi-tenant Filtering

All data filtered by `collegeId` in JSONB metadata:

```sql
-- Supabase RPC uses @> operator
documents.metadata @> '{"college_id": "demo-college"}'::jsonb
```

### Voice Agent TTS Numbers

Voice responses must spell out numbers for natural TTS:

```python
# agent.py instructions
# Write "twenty twenty-four" NOT "2024"
# Write "80 thousand rupees" NOT "₹80,000"
```

## Development Commands

```bash
# ai-service (port 3000)
cd services/ai-service && npm run dev

# widget (port 5173)
cd services/widget && npm run dev

# admin-dashboard (port 3001)
cd services/admin-dashboard && npm run dev

# voice-agent (requires uv)
cd services/voice-agent && uv run python src/agent.py dev
```

## Environment Variables

### ai-service

```
OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL
USE_GEMINI=true  # Optional: switch to Gemini
```

### voice-agent

```
LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
OPENAI_API_KEY, DEEPGRAM_API_KEY
SUPABASE_URL, SUPABASE_SERVICE_KEY
```

## File Structure Conventions

- `services/*/src/lib/` - Core business logic
- `services/ai-service/src/lib/ai/tools.ts` - AI function tools
- `services/ai-service/src/lib/rag/search.ts` - Vector search
- `services/admin-dashboard/src/app/actions/` - Next.js server actions
- `services/admin-dashboard/supabase/schema.sql` - Database schema

## Adding Features

### New AI Tool

1. Add to `services/ai-service/src/lib/ai/tools.ts` using `tool()` from `ai`
2. Mirror in `services/voice-agent/src/agent.py` using `@function_tool` decorator
3. Both must use same Supabase RPC patterns

### New UI Component

- Widget uses shadcn/ui - run `npx shadcn@latest add <component>` in widget dir
- Admin uses shadcn/ui with Next.js - same pattern

## Database Schema

- `files` - Uploaded file metadata (cascade deletes chunks)
- `documents` - Text chunks with `vector(1536)` embeddings
- `match_documents` RPC - Vector similarity search with JSONB filter
