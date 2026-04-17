import logging
import os

from dotenv import load_dotenv
from livekit.agents import (
    NOT_GIVEN,
    Agent,
    AgentFalseInterruptionEvent,
    AgentSession,
    JobContext,
    JobProcess,
    MetricsCollectedEvent,
    RoomInputOptions,
    RunContext,
    WorkerOptions,
    cli,
    metrics,
)
from livekit.agents.llm import function_tool, ChatContext, ChatMessage
from livekit.plugins import (
    cartesia,
    deepgram,
    noise_cancellation,
    openai,
    silero,
)
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from openai import AsyncOpenAI
from supabase import create_client, Client

logger = logging.getLogger("agent")

# Prefer local dev secrets, but also allow fallback to .env
load_dotenv(".env.local")
load_dotenv(".env")


def _is_placeholder(value: str | None) -> bool:
    if not value:
        return True
    lowered = value.strip().lower()
    return (
        lowered.startswith("your-")
        or "your_project" in lowered
        or "your-project" in lowered
        or "your-key" in lowered
        or lowered == "sk-your-openai-key"
        or lowered == "https://your-project.supabase.co"
        or lowered == "wss://your-project.livekit.cloud"
    )


def validate_required_env() -> None:
    required_env = [
        "LIVEKIT_URL",
        "LIVEKIT_API_KEY",
        "LIVEKIT_API_SECRET",
        "OPENAI_API_KEY",
        "DEEPGRAM_API_KEY",
        "CARTESIA_API_KEY",
    ]

    missing_or_placeholder = [
        key for key in required_env if _is_placeholder(os.getenv(key))
    ]

    if missing_or_placeholder:
        joined = ", ".join(missing_or_placeholder)
        raise RuntimeError(
            "Missing required voice-agent environment values: "
            f"{joined}. Create services/voice-agent/.env.local from "
            "services/voice-agent/.env.example and fill real keys."
        )


class Assistant(Agent):
    def __init__(
        self, tenant_id: str = "demo-city", chat_ctx=None, room=None
    ) -> None:
        super().__init__(
            instructions=f"""You are a smart Civic Voice Assistant for {tenant_id}.
                
                LANGUAGE RULES - VERY IMPORTANT:
                1. ALWAYS start conversations in ENGLISH by default or Hindi.
                2. ONLY switch to another language when the user CLEARLY speaks to you in that language.
                3. When you detect the user speaking Hindi, respond in Hindi.
                4. Supported languages: English, Hindi, Tamil, Telugu, Marathi.
                
                YOUR GOAL:
                Your objective is to collect civic issues/grievances from the citizen (e.g. Potholes, Garbage, Streetlights, Water leaks).
                1. Ask them what the issue is (Title).
                2. Ask them for a detailed description.
                3. Ask them for their exact Location (Landmark or street).
                
                TOOL USAGE RULES:
                - Once you have the Title, Description, and Location from the user, you MUST use the `submit_complaint` tool.
                - After calling `submit_complaint`, let the user know if their complaint was recorded, and if it was clustered with an existing "Me Too" ticket.
                
                Your responses are concise, to the point, and helpful.""",
            chat_ctx=chat_ctx,
        )
        self.tenant_id = tenant_id
        self.room = room

    async def on_user_turn_completed(self, turn_ctx, new_message):
        """Called after user speaks - send transcript to widget"""
        import json
        import asyncio

        if self.room and new_message:
            try:
                user_text = (
                    new_message.text_content
                    if hasattr(new_message, "text_content")
                    else str(new_message)
                )
                transcript_data = {
                    "type": "transcript",
                    "role": "user",
                    "text": user_text,
                    "timestamp": int(asyncio.get_event_loop().time() * 1000),
                }
                await self.room.local_participant.publish_data(
                    json.dumps(transcript_data).encode("utf-8"),
                    reliable=True,
                )
                logger.info(f"✅ Sent user transcript: {user_text[:50]}...")
            except Exception as e:
                logger.error(f"❌ Error sending user transcript: {e}", exc_info=True)

    async def tts_node(self, text, model_settings):
        """Override TTS node to send agent transcript before speech synthesis"""
        import json
        import asyncio
        from typing import AsyncIterable

        # Collect the full text
        async def collect_and_send(text_stream: AsyncIterable[str]):
            full_text = ""
            async for chunk in text_stream:
                full_text += chunk
                yield chunk

            # Send transcript after collecting all text
            if self.room and full_text:
                try:
                    transcript_data = {
                        "type": "transcript",
                        "role": "agent",
                        "text": full_text,
                        "timestamp": int(asyncio.get_event_loop().time() * 1000),
                    }
                    await self.room.local_participant.publish_data(
                        json.dumps(transcript_data).encode("utf-8"),
                        reliable=True,
                    )
                    logger.info(f"✅ Sent agent transcript: {full_text[:50]}...")
                except Exception as e:
                    logger.error(
                        f"❌ Error sending agent transcript: {e}", exc_info=True
                    )

        # Return the TTSNode object directly, not awaited
        return Agent.default.tts_node(self, collect_and_send(text), model_settings)

    @function_tool
    async def submit_complaint(
        self,
        context: RunContext,
        title: str,
        description: str,
        location_address: str
    ) -> dict:
        """Submit a collected civic complaint to the centralized system.

        Use this tool ONLY when you have fully collected the title, description, and location of the issue from the citizen.

        Args:
            title: Short summary of the complaint
            description: Detailed explanation of the issue
            location_address: The location mentioned by the user
        """
        try:
            import httpx
            logger.info(f"Submitting complaint via Voice: {title}")

            # Send to our Node Backend (Phase 2 Intelligence API)
            api_url = os.getenv("API_BASE_URL", "http://localhost:3000")
            
            # Since IVR doesn't have GPS, we simulate coordinate parsing
            # A future system would run a Google Maps API Geocode check here
            payload = {
                "title": title,
                "description": f"[VOICE REPORTED]: {description} \nAddress specified: {location_address}",
                # No GPS from IVR — coordinates will be 0,0 (voice complaints are geo-tagged by address only)
                # A future enhancement can call Google Maps Geocode API here using location_address
                "latitude": 0,
                "longitude": 0,
                "address": location_address,
                "citizen_email": "voice-call@scirp.gov"
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{api_url}/api/complaints",
                    json=payload,
                    headers={"X-Tenant-ID": self.tenant_id},
                    timeout=10.0
                )
                result = response.json()

            if response.status_code in (200, 201):
                if result.get("isDuplicate"):
                    return {"success": True, "message": f"This issue was already reported. I have added your voice report to the existing ticket ID {result['complaint']['public_id']}."}
                return {"success": True, "message": f"I have successfully filed your complaint. The ticket ID is {result['complaint']['public_id']}."}
            else:
                return {"success": False, "error": "System error submitting."}

        except Exception as e:
            logger.error(f"Error submitting complaint: {e}", exc_info=True)
            return {"success": False, "error": f"Submission error: {str(e)}"}


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


async def entrypoint(ctx: JobContext):
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Connect to the room first
    await ctx.connect()
    logger.info(f"🔍 Connected to room: {ctx.room.name}")

    # Extract chat history and college_id from participant metadata
    chat_ctx = None
    college_id = "demo-college"  # Default fallback
    try:
        import json

        # Wait for participants to join
        participant = await ctx.wait_for_participant()

        # Debug: Log participant info
        logger.info(
            f"🔍 Participant joined: {participant.identity if participant else 'None'}"
        )
        logger.info(
            f"🔍 Participant metadata: {participant.metadata if participant else 'None'}"
        )

        # Get metadata from the participant that joined
        if participant and participant.metadata:
            metadata_obj = json.loads(participant.metadata)
            logger.info(f"🔍 Parsed metadata: {metadata_obj}")

            # Extract tenant_id from participant metadata
            tenant_id = metadata_obj.get("tenantId", "demo-city")
            logger.info(f"🔍 Tenant ID from metadata: {tenant_id}")

            # Note: chatHistory removed in Phase 4 — voice agent starts fresh each session
            logger.info("Voice session started fresh (no chat history pre-loaded)")
        else:
            logger.warning("⚠️ No participant metadata available")
    except Exception as e:
        logger.warning(f"❌ Could not load participant metadata: {e}")
        tenant_id = "demo-city"

    session = AgentSession(
        llm=openai.LLM(model="gpt-4o-mini"),
        # Use Deepgram multilingual STT for language auto-detection and Indian language support
        stt=deepgram.STT(
            model="nova-3",
            language="multi",
        ),
        # Use Cartesia Sonic v3 TTS with Sagar voice (native Hindi speaker)
        # Sagar - Helpful Friend: Energetic adult male for customer support
        tts="cartesia/sonic-3:6303e5fb-a0a7-48f9-bb1a-dd42c216dc5d",
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=True,
    )

    @session.on("agent_false_interruption")
    def _on_agent_false_interruption(ev: AgentFalseInterruptionEvent):
        logger.info("false positive interruption, resuming")
        session.generate_reply(instructions=ev.extra_instructions or NOT_GIVEN)

    usage_collector = metrics.UsageCollector()

    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent):
        metrics.log_metrics(ev.metrics)
        usage_collector.collect(ev.metrics)

    async def log_usage():
        summary = usage_collector.get_summary()
        logger.info(f"Usage: {summary}")

    ctx.add_shutdown_callback(log_usage)

    # tenant_id is extracted from participant metadata above
    logger.info(f"Starting civic voice agent for tenant: {tenant_id}")

    assistant = Assistant(
        tenant_id=tenant_id,
        chat_ctx=chat_ctx,
        room=ctx.room,
    )

    # Set up transcript sending via data channel
    # Note: .on() requires synchronous callbacks, use asyncio.create_task for async operations
    import json
    import asyncio

    # Log all available events to debug
    logger.info(f"Available session events: {dir(session)}")

    @session.on("user_speech_committed")
    def _on_user_speech_committed(msg):
        """Send user transcript to widget via data channel"""
        logger.info(
            f"🎤 User speech committed event fired: {msg.text if hasattr(msg, 'text') else msg}"
        )

        async def send_transcript():
            try:
                text = msg.text if hasattr(msg, "text") else str(msg)
                transcript_data = {
                    "type": "transcript",
                    "role": "user",
                    "text": text,
                    "timestamp": (
                        int(msg.timestamp * 1000)
                        if hasattr(msg, "timestamp")
                        else int(asyncio.get_event_loop().time() * 1000)
                    ),
                }
                # Send to all participants
                await ctx.room.local_participant.publish_data(
                    json.dumps(transcript_data).encode("utf-8"),
                    reliable=True,
                )
                logger.info(f"✅ Sent user transcript to widget: {text[:50]}...")
            except Exception as e:
                logger.error(f"❌ Error sending user transcript: {e}", exc_info=True)

        asyncio.create_task(send_transcript())

    @session.on("agent_speech_committed")
    def _on_agent_speech_committed(msg):
        """Send agent transcript to widget via data channel"""
        logger.info(
            f"🤖 Agent speech committed event fired: {msg.text if hasattr(msg, 'text') else msg}"
        )

        async def send_transcript():
            try:
                text = msg.text if hasattr(msg, "text") else str(msg)
                transcript_data = {
                    "type": "transcript",
                    "role": "agent",
                    "text": text,
                    "timestamp": (
                        int(msg.timestamp * 1000)
                        if hasattr(msg, "timestamp")
                        else int(asyncio.get_event_loop().time() * 1000)
                    ),
                }
                # Send to all participants
                await ctx.room.local_participant.publish_data(
                    json.dumps(transcript_data).encode("utf-8"),
                    reliable=True,
                )
                logger.info(f"✅ Sent agent transcript to widget: {text[:50]}...")
            except Exception as e:
                logger.error(f"❌ Error sending agent transcript: {e}", exc_info=True)

        asyncio.create_task(send_transcript())

    await session.start(
        agent=assistant,
        room=ctx.room,
        room_input_options=RoomInputOptions(
            noise_cancellation=noise_cancellation.BVC(),
            close_on_disconnect=True,  # Close agent session when user disconnects
        ),
    )

    # Log when session ends
    logger.info(f"Agent session ended for room: {ctx.room.name}")


if __name__ == "__main__":
    validate_required_env()
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))
