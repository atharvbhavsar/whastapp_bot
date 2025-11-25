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

load_dotenv(".env.local")


class Assistant(Agent):
    def __init__(
        self, college_id: str = "demo-college", chat_ctx=None, room=None
    ) -> None:
        super().__init__(
            instructions=f"""You are a helpful college assistant for {college_id}.
                You can speak multiple languages, with an emphasis on Indian native languages including Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Punjabi, Kannada, Malayalam, Odia and Assamese but MAINLY Marwadi.
                Detect the caller's language and respond using the same language when possible.
                
                When asked about college information (admissions, fees, courses, facilities, etc.), use the search_documents tool to find accurate information.
                Always base your answers on the search results when available.
                
                IMPORTANT: When you need to search for information, first say something like "Let me check the documents for you" or "Give me a moment to look that up" to acknowledge the user while you search. This improves the user experience during the brief wait.
                
                You can call the search_documents tool multiple times in the same conversation if needed to gather comprehensive information or if the first search doesn't yield useful results.
                
                CRITICAL - Your responses will be converted to speech using Text-to-Speech (TTS). Never write numbers as digits. Always write them as words so they sound natural when spoken:
                - Years: Write "twenty twenty-four to twenty twenty-five" NOT "2024-25" or "2024-2025"
                - Large amounts: Write "80 thousand rupees" NOT "80,000 rupees" or "₹80,000"
                - Lakhs: Write "1 lakh 5 thousand rupees" NOT "1,05,000" or "₹1,05,000"
                - Small amounts: Write "5 thousand rupees" NOT "5,000 rupees"
                - Single digits: Write "3 thousand rupees" NOT "3,000"
                - Phone numbers: Write them digit by digit like "9 8 7 6 5 4 3 2 1 0"
                
                NEVER use digit characters (0-9) in your responses. Always spell out numbers as words for natural speech.
                
                Your responses are concise, to the point, and without any complex formatting or punctuation including emojis, asterisks, or other symbols.
                You are curious, friendly, and have a helpful tone.""",
            chat_ctx=chat_ctx,
        )
        self.college_id = college_id
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
    async def search_documents(
        self,
        context: RunContext,
        query: str,
    ) -> dict:
        """Search college documents for relevant information.

        Use this tool when the user asks about college-specific information like:
        - Admission process, eligibility, or deadlines
        - Fee structure or payment details
        - Courses, programs, or curriculum
        - Facilities, infrastructure, or campus
        - Placements, internships, or career support
        - Contact information or location

        Args:
            query: The search query based on the user's question
        """
        try:
            logger.info(f"Searching documents for: {query}")

            # Get credentials from environment
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
            openai_api_key = os.getenv("OPENAI_API_KEY")

            if not all([supabase_url, supabase_key, openai_api_key]):
                logger.error("Missing Supabase or OpenAI credentials")
                return {
                    "success": False,
                    "error": "Configuration error - missing credentials",
                }

            # Initialize clients
            openai_client = AsyncOpenAI(api_key=openai_api_key)
            supabase_client: Client = create_client(supabase_url, supabase_key)

            # Step 1: Generate embedding using OpenAI SDK
            embed_response = await openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=query,
            )
            query_embedding = embed_response.data[0].embedding

            # Step 2: Convert embedding to PostgreSQL vector string format
            vector_string = f"[{','.join(map(str, query_embedding))}]"

            # Step 3: Search Supabase pgvector using RPC
            # Pass embedding as text and include filter for college_id
            # Lower threshold (0.1) to cast a wider net for semantic matches
            response = supabase_client.rpc(
                "match_documents",
                {
                    "query_embedding_text": vector_string,
                    "match_threshold": 0.1,
                    "match_count": 10,
                    "filter": {"college_id": self.college_id},
                },
            ).execute()

            results = response.data

            # Results are already filtered by college_id via the filter parameter
            if not results or len(results) == 0:
                logger.info(f"No results found for college {self.college_id}")
                return {
                    "success": True,
                    "found": False,
                    "message": "I don't have specific information about that in our records.",
                }

            # Format results for LLM - use all retrieved documents
            context_text = "\n\n".join(
                [
                    f"Document {i+1} (similarity: {r['similarity']:.2f}):\n{r['content']}"
                    for i, r in enumerate(results)  # Use all results
                ]
            )

            logger.info(f"Found {len(results)} relevant documents")

            return {
                "success": True,
                "found": True,
                "context": context_text,
                "num_results": len(results),
            }

        except Exception as e:
            logger.error(f"Error in search_documents: {e}", exc_info=True)
            return {"success": False, "error": f"Search error: {str(e)}"}


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


async def entrypoint(ctx: JobContext):
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Connect to the room first
    await ctx.connect()
    logger.info(f"🔍 Connected to room: {ctx.room.name}")

    # Extract chat history from participant metadata if available
    chat_ctx = None
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
            chat_history = metadata_obj.get("chatHistory", [])
            logger.info(f"🔍 Chat history from metadata: {chat_history}")

            # Convert plain list to proper ChatContext object
            if chat_history:
                chat_ctx = ChatContext()
                for msg in chat_history:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    logger.info(
                        f"🔍 Adding to chat_ctx: role={role}, content={content[:50] if content else 'empty'}..."
                    )
                    if role == "user":
                        chat_ctx.add_message(role="user", content=content)
                    elif role == "assistant":
                        chat_ctx.add_message(role="assistant", content=content)
                logger.info(
                    f"✅ Loaded {len(chat_history)} previous messages into ChatContext"
                )
            else:
                logger.info("⚠️ No chat history found in metadata")
        else:
            logger.warning("⚠️ No participant metadata available")
    except Exception as e:
        logger.warning(f"❌ Could not load chat history: {e}")

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

    # Get college_id from room metadata (default to demo-college to match DB format)
    college_id = (
        ctx.room.metadata.get("college_id", "demo-college")
        if ctx.room.metadata
        else "demo-college"
    )
    logger.info(f"Starting agent for college: {college_id}")

    assistant = Assistant(
        college_id=college_id,
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
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))
