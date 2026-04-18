/**
 * Video Analysis using @ffmpeg/ffmpeg WASM
 * Extracts frames from a video URL and runs civic issue analysis via Ollama vision model.
 * No system ffmpeg binary required — fully self-contained.
 */

import { Ollama } from 'ollama';

const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || 'http://localhost:11434',
  headers: process.env.OLLAMA_API_KEY
    ? { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` }
    : undefined,
});

const VISION_MODEL = process.env.OLLAMA_OCR_MODEL || 'llama3.2-vision:11b';

const CIVIC_VIDEO_PROMPT = `You are analyzing a frame from a video sent by a citizen reporting a civic issue.
Describe exactly what civic problem you can see: potholes, flooding, broken infrastructure, garbage overflow, sewage, road damage, construction hazards, etc.
Be specific and precise. If no civic issue is visible, say "No civic issue detected in this frame."
Keep your response under 100 words.`;

/**
 * Download a remote URL as a Buffer (handles Twilio media auth via fetch)
 */
async function downloadToBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: url.includes('twilio') ? {
      Authorization: `Basic ${Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString('base64')}`,
    } : {},
  });
  if (!res.ok) throw new Error(`Failed to download media: ${res.status} ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * WASM-based frame extraction using @ffmpeg/ffmpeg
 * Extracts up to maxFrames JPEG snapshots from the video at even intervals.
 */
async function extractFramesWASM(videoBuffer: Buffer, maxFrames = 3): Promise<Buffer[]> {
  // Dynamic import to ensure this only runs server-side and avoids SSR issues
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { fetchFile, toBlobURL } = await import('@ffmpeg/util');

  const ffmpeg = new FFmpeg();

  // Load WASM core — fetch from CDN to avoid bundle size inflation
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  // Write video to virtual WASM filesystem
  await ffmpeg.writeFile('input.mp4', await fetchFile(new Blob([new Uint8Array(videoBuffer)])));

  // Extract frames: 1 frame every N seconds to capture up to maxFrames
  // Use select filter to pick evenly distributed frames
  await ffmpeg.exec([
    '-i', 'input.mp4',
    '-vf', `select='eq(n\\,0)+eq(n\\,30)+eq(n\\,60)'`,  // frames 0, 30, 60 (evenly distributed)
    '-vsync', 'vfr',
    '-q:v', '2',
    '-f', 'image2',
    'frame_%d.jpg',
  ]);

  // Read extracted frames
  const frames: Buffer[] = [];
  for (let i = 1; i <= maxFrames; i++) {
    try {
      const data = await ffmpeg.readFile(`frame_${i}.jpg`);
      frames.push(Buffer.from(data as Uint8Array));
    } catch {
      // Frame might not exist if video is shorter — stop gracefully
      break;
    }
  }

  return frames;
}

/**
 * Analyze a single frame buffer using Ollama vision model.
 */
async function analyzeFrame(frameBuffer: Buffer): Promise<string> {
  const base64 = frameBuffer.toString('base64');
  const response = await ollama.chat({
    model: VISION_MODEL,
    messages: [{
      role: 'user',
      content: CIVIC_VIDEO_PROMPT,
      images: [base64],
    }],
  });
  return response.message.content.trim();
}

/**
 * Main entry point: download video, extract frames, analyze each frame,
 * and merge all civic descriptions into one coherent transcript.
 *
 * @param videoUrl   Publicly accessible video URL (from Twilio MediaUrl0)
 * @param bodyText   Original WhatsApp message text (appended as context)
 * @returns          Combined civic issue description string
 */
export async function extractVideoContext(
  videoUrl: string,
  bodyText: string = ''
): Promise<string> {
  // --- Step 1: Download video ---
  let videoBuffer: Buffer;
  try {
    videoBuffer = await downloadToBuffer(videoUrl);
  } catch (err) {
    console.error('[VideoAnalysis] Failed to download video:', err);
    throw new Error('Could not download video from WhatsApp');
  }

  // --- Step 2: Extract frames via WASM ffmpeg ---
  let frames: Buffer[] = [];
  try {
    frames = await extractFramesWASM(videoBuffer, 3);
  } catch (err) {
    console.error('[VideoAnalysis] Frame extraction failed:', err);
    // Graceful degradation: return original text if video processing fails
    return bodyText || 'Video received but could not be processed.';
  }

  if (frames.length === 0) {
    console.warn('[VideoAnalysis] No frames extracted from video.');
    return bodyText || 'Video received but no frames could be extracted.';
  }

  // --- Step 3: Analyze each frame with Ollama ---
  const frameDescriptions: string[] = [];
  for (let i = 0; i < frames.length; i++) {
    try {
      const description = await analyzeFrame(frames[i]);
      if (!description.toLowerCase().includes('no civic issue')) {
        frameDescriptions.push(`Frame ${i + 1}: ${description}`);
      }
    } catch (err) {
      console.error(`[VideoAnalysis] Frame ${i + 1} analysis failed:`, err);
    }
  }

  // --- Step 4: Compose final transcript ---
  const videoContext = frameDescriptions.length > 0
    ? `Video Analysis:\n${frameDescriptions.join('\n')}`
    : 'Video received but no civic issues were detected in the frames.';

  return bodyText
    ? `${bodyText}\n\n${videoContext}`
    : videoContext;
}
