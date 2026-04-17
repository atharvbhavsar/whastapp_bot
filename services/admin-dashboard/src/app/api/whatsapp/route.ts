export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { submitCivicComplaint } from "@/app/actions/submit-civic-complaint";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { extractTextWithOllamaOCR } from "@/lib/ollama-ocr";
import { supabaseAdmin } from "@/lib/supabase";
import twilio from "twilio";
import { waitUntil } from "@vercel/functions";
import { createHash } from "crypto";

// Derive a deterministic UUID v5-like string from a phone number.
// This keeps reporter_id as a valid UUID format without storing raw PII in that column.
function phoneToUuid(phone: string): string {
  const hash = createHash("sha256").update(phone).digest("hex");
  // Format first 32 hex chars as a UUID (8-4-4-4-12)
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "5" + hash.slice(13, 16), // version 5 marker
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join("-");
}

// Escape XML special characters to prevent TwiML injection.
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Fast synchronous TwiML response to prevent Twilio latency timeouts
function buildTwimlResponse(message: string, mediaUrl?: string) {
  const safeMessage = escapeXml(message);
  const mediaXml = mediaUrl ? `<Media>${escapeXml(mediaUrl)}</Media>` : "";
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message><Body>${safeMessage}</Body>${mediaXml}</Message></Response>`,
    {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    }
  );
}

// -------------------------------------------------------------
// The latency-proof asynchronous Background Worker
// -------------------------------------------------------------
async function processHeavyMultimodalPipeline(
  fromNumber: string, 
  mediaType: "photo" | "video" | "voice" | "text", 
  mediaUrl: string | undefined, 
  bodyText: string, 
  latitude: number, 
  longitude: number
) {
  try {
    let extractedText = bodyText;

    // [1] Vision Pipeline (Local Ollama) - This is slow!
    if (mediaType === "photo" && mediaUrl) {
      try {
        const imageRes = await fetch(mediaUrl);
        const arrayBuffer = await imageRes.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        
        // Blocking, but running safely in the background
        const ocrText = await extractTextWithOllamaOCR(base64);
        extractedText = bodyText ? `${bodyText}\n\n[Image Extract: ${ocrText}]` : ocrText;
      } catch (ocrErr) {
        console.error("OCR Failed:", ocrErr);
      }
    }

    if (!extractedText && !mediaUrl) return;

    // [2] Heavy Classification (Gemini 2.5 Flash) via native Action
    // reporter_id must be UUID — derive one deterministically from the phone number.
    const reporterUuid = phoneToUuid(fromNumber);
    const result = await submitCivicComplaint({
      reporter_id: reporterUuid,
      media_type: mediaType,
      media_url: mediaUrl,
      transcript_or_text: extractedText,
      location: { latitude, longitude },
      device_language: "en",
    });

    if (!result.success || !result.data) {
      throw new Error("Gemini Complaint Parsing Failed");
    }

    // [3] Conversational Reasoning (Groq Llama-3.3-70b-versatile) ~ incredibly fast
    let conversationalReply = "";
    try {
      const { text } = await generateText({
        model: groq("llama-3.3-70b-versatile"), // Leveraging Groq for instant inference
        prompt: `You are a helpful civic assistant. Rewrite this complaint confirmation into a warm, empathetic 1 or 2 sentence response for a citizen via WhatsApp. Do not use markdown. Just pure text.\nIssue: ${result.data.ai_explanation}\nNote: ${result.data.message}`
      });
      conversationalReply = text;
    } catch(e) {
      console.error("Groq generation failed", e);
      conversationalReply = `We received your report. ${result.data.ai_explanation}`;
    }

    const finalMessage = `✅ *Complaint Registered!*\nID: ${result.data.master_id.substring(0,8).toUpperCase()}\n\n${conversationalReply}`;

    // [4] Real-time SOTA Audio Synthesis (Deepgram Aura) via standard fetch to bypass Turbopack ES-Module conflicts
    let audioUrl = undefined;
    if (process.env.DEEPGRAM_API_KEY && process.env.SUPABASE_URL) {
      try {
        const response = await fetch("https://api.deepgram.com/v1/speak?model=aura-asteria-en", {
          method: "POST",
          headers: {
            "Authorization": `Token ${process.env.DEEPGRAM_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ text: conversationalReply })
        });

        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          const fileName = `tts/${Date.now()}-${fromNumber.replace("+", "")}.mp3`;
          
          await supabaseAdmin.storage.from("media").upload(fileName, buffer, {
            contentType: "audio/mpeg"
          });
          
          audioUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/media/${fileName}`;
        } else {
          console.error("Deepgram Fetch Failed:", await response.text());
        }
      } catch (ttsErr) {
        console.error("TTS Failed:", ttsErr);
      }
    }

    // [5] Push final processed voice + text backward synchronously to Twilio WhatsApp
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      const messagePayload: any = {
        from: process.env.TWILIO_PHONE_NUMBER,
        to: fromNumber,
        body: finalMessage,
      };

      if (audioUrl) {
         messagePayload.mediaUrl = [audioUrl]; // Attach Deepgram Audio output
      }

      await client.messages.create(messagePayload);
    } else {
        console.warn("TWILIO API Keys missing from environment variables! Cannot send background WhatsApp response.");
    }

    // [6] Trace the interaction to Admin logs
    try {
      await supabaseAdmin.from("whatsapp_logs").insert({
        user_phone: fromNumber,
        message_received: extractedText,
        ai_reply: conversationalReply,
        media_url: mediaUrl || null
      });
    } catch (logErr) {
      console.error("Failed to insert whatsapp_log", logErr);
    }

  } catch (err) {
    console.error("Background Webhook Pipeline Engine Error:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    // --- [SECURITY] Twilio Signature Validation ---
    // Reject any request not originating from Twilio's servers.
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    if (!twilioAuthToken) {
      console.error("TWILIO_AUTH_TOKEN is not set — cannot validate webhook");
      return new NextResponse("Server misconfiguration", { status: 500 });
    }

    const twilioSignature = req.headers.get("x-twilio-signature") ?? "";
    // Reconstruct the full URL Twilio signed (must match exactly what Twilio sees)
    const webhookUrl =
      process.env.TWILIO_WEBHOOK_URL ??
      `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("host")}/api/whatsapp`;

    // Read body once as text to validate signature, then re-parse as FormData
    const rawBody = await req.text();
    const params: Record<string, string> = {};
    new URLSearchParams(rawBody).forEach((v, k) => { params[k] = v; });

    const isValid = twilio.validateRequest(twilioAuthToken, twilioSignature, webhookUrl, params);
    if (!isValid) {
      console.warn("[SECURITY] Invalid Twilio signature — request rejected", {
        url: webhookUrl,
        signature: twilioSignature,
      });
      return new NextResponse("Forbidden", { status: 403 });
    }
    // --- End Signature Validation ---

    const bodyText = params["Body"] ?? "";
    const fromNumber = params["From"] ?? "Unknown";
    const numMedia = parseInt(params["NumMedia"] ?? "0", 10);
    
    let mediaUrl: string | undefined = undefined;
    let mediaType: "photo" | "video" | "voice" | "text" = "text";

    if (numMedia > 0) {
      mediaUrl = params["MediaUrl0"];
      const contentType = params["MediaContentType0"] ?? "";

      if (contentType.includes("image")) mediaType = "photo";
      else if (contentType.includes("video")) mediaType = "video";
      else if (contentType.includes("audio")) mediaType = "voice";
    }

    // Only use location data if Twilio actually sent it (WhatsApp location share).
    // Do NOT default to a city center — that poisons the clustering algorithm.
    const latRaw = params["Latitude"];
    const lonRaw = params["Longitude"];
    const latitude = latRaw ? parseFloat(latRaw) : undefined;
    const longitude = lonRaw ? parseFloat(lonRaw) : undefined;

    // Start Heavy Processing without blocking the thread
    waitUntil(
        processHeavyMultimodalPipeline(fromNumber, mediaType, mediaUrl, bodyText, latitude, longitude)
    );

    // Return instant acknowledgement to defeat latencies natively (< 50ms)
    // WhatsApp citizens will receive an instant ping and 5 seconds later receive Voice + Text.
    return buildTwimlResponse("_Analyzing your report... Please allow a few seconds for the AI to process it._");

  } catch (err) {
    console.error("Twilio WhatsApp Webhook Init Error:", err);
    return buildTwimlResponse("We are experiencing extremely high volume right now.");
  }
}
