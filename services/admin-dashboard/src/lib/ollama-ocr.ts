import { Ollama } from 'ollama';

// Configure Ollama client (adjust host or pass headers if accessing a cloud/remote Ollama instance that requires an API key)
// If you're using a specific proxy that acts like Ollama:
const ollama = new Ollama({ 
  host: process.env.OLLAMA_HOST || 'http://localhost:11434',
  headers: process.env.OLLAMA_API_KEY ? { 'Authorization': `Bearer ${process.env.OLLAMA_API_KEY}` } : undefined
});

/**
 * Process an image document using local/cloud Ollama vision model (like GLM-4v bounds to Ollama)
 * 
 * @param base64Image - Base64 encoded string of the image (without data:image/... prefix ideally, though ollama handles some)
 * @returns Extracted markdown text
 */
export async function extractTextWithOllamaOCR(base64Image: string, prompt: string = 'Extract all the text from this image precisely. Do not describe the image, just output the extracted text.'): Promise<string> {
  try {
    const ocrModel = process.env.OLLAMA_OCR_MODEL || 'llama3.2-vision:11b'; // SOTA Vision Model from Meta optimized for local OCR

    const response = await ollama.chat({
      model: ocrModel,
      messages: [{
        role: 'user',
        content: prompt,
        images: [base64Image] // Ollama accepts base64 strings in the images array
      }]
    });

    return response.message.content;
  } catch (error) {
    console.error("Ollama OCR error:", error);
    throw new Error(
      `Ollama OCR processing failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
