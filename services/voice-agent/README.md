# Voice Agent - Multilingual AI Assistant

A multilingual voice AI assistant built with [LiveKit Agents for Python](https://github.com/livekit/agents) for the Language Agnostic Chatbot project (SIH 2025).

## Features

- 🎤 **Speech-to-Text**: Deepgram Nova-3 with automatic language detection
- 🗣️ **Text-to-Speech**: Cartesia Sonic-3 with Indian language support
- 🤖 **LLM**: OpenAI GPT-4o-mini for conversation
- 🎯 **Turn Detection**: Multilingual model for natural conversation flow
- 🔇 **Noise Cancellation**: Background voice cancellation for clear audio
- 📊 **Metrics**: Usage tracking and logging for monitoring

## Supported Languages

The agent can understand and respond in:

- English
- Hindi (हिन्दी)
- Bengali (বাংলা)
- Tamil (தமிழ்)
- Telugu (తెలుగు)
- Marathi (मराठी)
- Gujarati (ગુજરાતી)
- Punjabi (ਪੰਜਾਬੀ)
- Kannada (ಕನ್ನಡ)
- Malayalam (മലയാളം)
- Odia (ଓଡ଼ିଆ)
- Assamese (অসমীয়া)

## Prerequisites

- Python 3.9 or higher
- [UV package manager](https://docs.astral.sh/uv/getting-started/installation/)
- API keys for:
  - LiveKit Cloud
  - OpenAI
  - Deepgram
  - Cartesia

## Quick Start

### 1. Install UV

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### 2. Set up environment

Copy `.env.example` to `.env.local` and fill in your API keys:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials.

### 3. Install dependencies

```bash
uv sync
```

### 4. Download models

```bash
uv run python src/agent.py download-files
```

### 5. Run the agent

**Console mode (local testing):**

```bash
uv run python src/agent.py console
```

**Development mode (LiveKit Cloud):**

```bash
uv run python src/agent.py dev
```

**Production mode:**

```bash
uv run python src/agent.py start
```

## Configuration

### Environment Variables

Required environment variables in `.env.local`:

```bash
# LiveKit Configuration
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# OpenAI (LLM)
OPENAI_API_KEY=sk-your-openai-key

# Deepgram (STT)
DEEPGRAM_API_KEY=your_deepgram_key

# Cartesia (TTS)
CARTESIA_API_KEY=your_cartesia_key
```

### Agent Settings

The agent is configured with:

- **Model**: OpenAI GPT-4o-mini
- **STT**: Deepgram Nova-3 (multilingual)
- **TTS**: Cartesia Sonic-3 (voice ID: `9626c31c-bec5-4cca-baa8-f8ba9e84c8bc`)
- **VAD**: Silero Voice Activity Detection
- **Turn Detection**: Multilingual model
- **Noise Cancellation**: BVC (Background Voice Cancellation)
- **Preemptive Generation**: Enabled for lower latency

## Development

### Code Formatting

```bash
# Format code
uv run ruff format

# Check linting
uv run ruff check
```

### Testing

```bash
uv run pytest
```

## Deployment

### Railway

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Railway will automatically detect the Dockerfile and deploy

### Docker

```bash
# Build image
docker build -t voice-agent .

# Run container
docker run -p 8080:8080 \
  -e LIVEKIT_URL=wss://... \
  -e LIVEKIT_API_KEY=... \
  -e LIVEKIT_API_SECRET=... \
  -e OPENAI_API_KEY=... \
  -e DEEPGRAM_API_KEY=... \
  -e CARTESIA_API_KEY=... \
  voice-agent
```

## Project Structure

```
voice-agent/
├── src/
│   ├── __init__.py
│   └── agent.py          # Main agent implementation
├── tests/
│   └── test_agent.py     # Tests (optional)
├── pyproject.toml        # Dependencies
├── .env.example          # Environment template
├── .env.local           # Your secrets (gitignored)
├── .gitignore
├── .dockerignore
├── Dockerfile           # Production deployment
└── README.md           # This file
```

## How It Works

1. **Worker connects** to LiveKit Cloud via WebSocket
2. **User joins** voice room via React widget
3. **LiveKit Cloud** assigns job to worker
4. **Worker processes**:
   - User speech → Deepgram STT → Text
   - Text → OpenAI LLM → Response
   - Response → Cartesia TTS → Voice
5. **Audio streams** back to user via LiveKit Cloud

## Troubleshooting

### SSL Certificate Error (macOS)

```bash
/Applications/Python\ 3.13/Install\ Certificates.command
```

### Agent not responding

- Verify all API keys in `.env.local`
- Check microphone permissions
- Review logs for errors

### High latency

- Ensure good internet connection
- Check if `preemptive_generation=True` is enabled
- Verify VAD models are preloaded

## Links

- [LiveKit Agents Documentation](https://docs.livekit.io/agents/)
- [Deepgram Documentation](https://developers.deepgram.com/)
- [Cartesia Documentation](https://cartesia.ai/docs)
- [OpenAI Documentation](https://platform.openai.com/docs)

## License

Part of the SIH 2025 Language Agnostic Chatbot project.
