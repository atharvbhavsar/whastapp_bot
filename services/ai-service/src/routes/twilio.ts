import { Router, Request, Response } from "express";
import twilioPkg from "twilio";
const { twiml } = twilioPkg;
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import fetch from "node-fetch";

import { logger } from "../lib/utils/logger.js";
import { getSupabase } from "../lib/rag/supabase.js";
import { SYSTEM_PROMPT } from "../lib/ai/prompts.js";
import { createRAGTools } from "../lib/ai/tools.js";
import { generateAndUploadAudio } from "../lib/audio/cartesia.js";

export const twilioRouter = Router();

// Ensure the parser handles form-urlencoded for Twilio webhook payloads
twilioRouter.use((req, _res, next) => {
  if (req.is("application/x-www-form-urlencoded")) {
    return next();
  }
  next();
});

twilioRouter.post("/webhook", async (req: Request, res: Response): Promise<void> => {
  try {
    const { Body, From, NumMedia, MediaUrl0, MediaContentType0 } = req.body;
    logger.info(`Received WhatsApp message from ${From}: ${Body}`);

    // Registration Form Intercept (Web App Link Approach)
    if (typeof Body === "string" && Body.trim().toLowerCase() === "hi") {
      const host = req.get('host') || 'italicize-abroad-next.ngrok-free.dev';
      const formUrl = `https://${host}/register`;
      logger.info(`Hi received — sending registration link: ${formUrl}`);
      
      const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>*Welcome to the PCMC Helpdesk!* 🏛️

To formally register your civic case, please click our secure portal link below:

🔗 ${formUrl}</Message>
</Response>`;
      
      res.set("Content-Type", "text/xml");
      res.status(200).send(twimlResponse);
      logger.info("Hi response sent successfully.");
      return;
    }

    // Intercept the return message after successful Registration completion
    if (typeof Body === "string" && Body.includes("Registration Completed!")) {
      const successMessage = `*✅ Registration Confirmed!*\nWe have successfully received your case data in our system.\n\nYou can ask me for status updates anytime by typing:\n_"Check status of [Your ID]"_`;
      
      const messagingResponse = new twiml.MessagingResponse();
      messagingResponse.message(successMessage);
      
      res.type("text/xml");
      res.send(messagingResponse.toString());
      return;
    }

    let userContent: any[] = [];
    let hasGeotag = false;
    let detectedLocation = "";
    
    // Default text
    if (Body) {
      userContent.push({ type: "text", text: Body });
    }

    // 1. Media/Image Intake with EXIF Geotag Enforcement
    if (NumMedia && parseInt(NumMedia) > 0 && MediaUrl0) {
      logger.info(`Processing media: ${MediaUrl0} (${MediaContentType0})`);

      if (MediaContentType0 && MediaContentType0.startsWith("image/")) {
        try {
          // WhatsApp strips EXIF from all photos — use Gemini Vision to detect
          // any visible geotag text/watermark or GPS coordinates in the image itself
          const twilioAuth = Buffer.from(
            `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
          ).toString("base64");

          const imgRes = await fetch(MediaUrl0, {
            headers: { Authorization: `Basic ${twilioAuth}` }
          });
          const imgBuffer = await imgRes.arrayBuffer();
          const imgBase64 = Buffer.from(imgBuffer).toString("base64");
          const mimeType = (MediaContentType0 || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp";

          // Ask Groq Vision to check for visible geotag/GPS text in the image
          const visionGroq = createOpenAI({
            baseURL: "https://api.groq.com/openai/v1",
            apiKey: process.env.GROQ_API_KEY || "",
          });

          const { text: visionResult } = await generateText({
            model: visionGroq("llama-3.2-11b-vision-preview"),
            messages: [{
              role: "user",
              content: [
                {
                  type: "image",
                  image: imgBase64,
                  mimeType,
                },
                {
                  type: "text",
                  text: `Look at this image carefully. Does it contain any visible GPS coordinates, geotag watermark, location text, or address overlay burned into the image? Reply ONLY: "YES: <the location text>" if found, or "NO" if not. No extra words.`
                }
              ]
            }]
          });

          logger.info(`Gemini Vision geotag check: ${visionResult}`);

          if (visionResult.trim().toUpperCase().startsWith("YES")) {
            hasGeotag = true;
            detectedLocation = visionResult.replace(/^YES[:\s]*/i, "").trim();
            logger.info(`✅ Geotag detected by Vision AI: ${detectedLocation}`);
          }

        } catch (visionErr) {
          // If vision check fails (quota / network), fail OPEN and accept the photo
          logger.warn(`Vision geotag check failed — accepting photo by default: ${visionErr}`);
          hasGeotag = true;
          detectedLocation = "Location unverified (Vision AI unavailable)";
        }

        // Reject if no geotag detected in the photo
        if (!hasGeotag) {
          logger.info("❌ Rejecting photo — no visible geotag found.");
          const messagingResponse = new twiml.MessagingResponse();
          messagingResponse.message(
            `⚠️ *Photo Rejected — No Location Data Found*\n\nYour photo does not contain a Geotag (GPS location). PCMC requires all complaint photos to have a visible location.\n\n*How to enable Geotag on your phone:*\n📱 *Android*: Open Camera → Settings → turn ON "Location tags"\n🍎 *iPhone*: Settings → Privacy → Location Services → Camera → "While Using"\n\nPlease retake the photo with location enabled and send it again.`
          );
          res.type("text/xml");
          res.send(messagingResponse.toString());
          return;
        }

        // Accepted — inject verified location into AI context
        userContent.push({ type: "text", text: `[SYSTEM: Geotagged photo verified by AI Vision. Detected location data: ${detectedLocation}. Image URL: ${MediaUrl0}]` });
        if (!Body) {
          userContent.push({ type: "text", text: `I am reporting a civic issue at this geotagged location. Please see the attached image.` });
        }

      } else {
        // Non-image media — pass through normally
        userContent.push({ type: "text", text: `[SYSTEM: User uploaded a media file: ${MediaUrl0}]` });
        if (!Body) {
          userContent.push({ type: "text", text: `I uploaded this media file for reference. Please help me.` });
        }
      }
    }

    // 2. Format the model selection dynamically for Vision support
    const groq = createOpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY || "", 
    });
    const model = groq("llama-3.3-70b-versatile");

    // 3. Manual Pre-RAG Check (Bypasses Groq Vercel Tool Crash)
    let extraContext = "";
    const civMatch = typeof Body === "string" ? Body.match(/CIV-\d+/i) : null;
    if (civMatch) {
      const public_id = civMatch[0].toUpperCase();
      const supabase = getSupabase();
      const { data } = await supabase.from("complaints").select("*").eq("public_id", public_id).single();
      if (data) {
         if (data.status === "Resolved") {
            const docText = `DOCUMENT OF COMPLETION\nTitle: ${data.title}\nStatus: RESOLVED\nDate: ${data.updated_at}\n\nThis civic issue has been formally addressed and resolved by the municipality.`;
            extraContext = `\n\nSYSTEM DB LOOKUP RESULT: The user is asking about ${public_id}. Tell them it is resolved and format this exact text for their receipt: ${docText}\nIf there is an image URL: {RESOLUTION_IMAGE_URL=${data.resolution_image_url || ''}}, include it exactly wrapped in those brackets natively inside your text!`;
         } else {
            extraContext = `\n\nSYSTEM DB LOOKUP RESULT: The user is asking about ${public_id}. Tell them it is currently ${data.status}. Title: ${data.title}.`;
         }
      }
    }

    // 4. Generate AI Text Response (1-shot)
    const { text: aiResponseText } = await generateText({
      model,
      system: SYSTEM_PROMPT + "\nNote: Keep your response concise as it's meant for WhatsApp and Voice format. If you see a {RESOLUTION_IMAGE_URL=...} string, embed that EXACT URL directly in your text so the user can click it." + extraContext,
      messages: [
        {
          role: "user",
          content: Array.isArray(userContent) ? userContent.map(u => u.text || "").join("\n") : userContent,
        }
      ]
    });

    logger.info(`Generated AI Text Response for WhatsApp: ${aiResponseText}`);

    // If there is an image URL in the AI text, let's extract it to send as a proper Twilio media attachment
    let twilioMediaAttachment: string | null = null;
    let cleanTextResponse = aiResponseText;
    
    const regex = /\{RESOLUTION_IMAGE_URL=(https?:\/\/[^\s}]+)\}/;
    const match = aiResponseText.match(regex);
    if (match && match[1]) {
      twilioMediaAttachment = match[1];
      cleanTextResponse = cleanTextResponse.replace(regex, "\nHere is your resolution image attached.");
    }

    if (!cleanTextResponse || cleanTextResponse.trim() === "") {
      cleanTextResponse = "This is an automated fallback response. The AI engine processed your request but returned an empty receipt. If you requested a solved case, resolution details are attached.";
    }

    // 5. Explicit Image Verification Response appending
    let finalTextResponse = cleanTextResponse;
    if (hasGeotag && detectedLocation) {
       finalTextResponse = `✅ *Photo Accepted*\nLocation verified: ${detectedLocation}\n\n` + finalTextResponse;
    }

    // 6. Generate Audio TTS Output (using original text without the checkmark emoji for TTS stability)
    let audioUrl: string | null = null;
    try {
      // Create spoken voice via Cartesia TTS and upload to Supabase
      audioUrl = await generateAndUploadAudio(cleanTextResponse);
    } catch (e) {
      logger.error(`Failed to generate TTS audio: ${e}`);
      // Fail gracefully: we will proceed and just send the text
    }

    // 7. Build TwiML Response with strictly separated Text and Media
    const messagingResponse = new twiml.MessagingResponse();
    
    // Send the text response
    messagingResponse.message(finalTextResponse);

    // Send the Audio file as a separate message payload so WhatsApp doesn't hide text
    if (audioUrl) {
      const audioMsg = messagingResponse.message();
      audioMsg.media(audioUrl);
    }
    
    // Send the resolution image as a separate message
    if (twilioMediaAttachment) {
      const imgMsg = messagingResponse.message();
      imgMsg.media(twilioMediaAttachment);
    }

    // Send back to Twilio
    res.type("text/xml");
    res.send(messagingResponse.toString());

  } catch (error) {
    logger.error("Twilio route error:", error);
    const errRes = new twiml.MessagingResponse();
    const errMessage = error instanceof Error ? error.message : "Technical difficulties";
    errRes.message(`AI Routing Error: ${errMessage}`);
    res.type('text/xml');
    res.send(errRes.toString());
  }
});
