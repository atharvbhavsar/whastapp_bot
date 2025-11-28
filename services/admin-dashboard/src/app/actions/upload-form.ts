"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { parseFile } from "@/lib/parser";
import { extractTextWithOCR } from "@/lib/mistral-ocr";
import { openai } from "@ai-sdk/openai";
import { embed, generateText } from "ai";

/**
 * Upload Form/Notice Action
 *
 * This action handles uploading forms and notices with summary-based embedding.
 * Unlike regular documents, forms are NOT chunked. Instead:
 * 1. Server generates a signed upload URL
 * 2. Client uploads directly to Supabase Storage using signed URL
 * 3. Server processes: text extraction (with optional OCR), summary generation, embedding
 * 4. When matched in RAG, the full document is retrieved for AI context
 */

export interface UploadFormResult {
  success: boolean;
  fileId?: string;
  publicUrl?: string;
  error?: string;
}

export interface SignedUploadUrlResult {
  success: boolean;
  signedUrl?: string;
  token?: string;
  filePath?: string;
  publicUrl?: string;
  error?: string;
}

export interface ProcessFormInput {
  filePath: string;
  publicUrl: string;
  collegeId: string;
  title: string;
  useOcr: boolean;
  fileType: string;
  fileSize: number;
}

/**
 * Create a signed upload URL for client-side upload
 * This bypasses RLS since it uses the admin client
 */
export async function createSignedUploadUrl(
  collegeId: string,
  fileName: string
): Promise<SignedUploadUrlResult> {
  try {
    const filePath = `${collegeId}/forms/${Date.now()}-${fileName}`;

    // Create signed upload URL (valid for 60 seconds)
    const { data, error } = await supabaseAdmin.storage
      .from("documents")
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      throw new Error(
        `Failed to create signed URL: ${error?.message || "Unknown error"}`
      );
    }

    // Get public URL for the file (will be accessible after upload)
    const { data: urlData } = supabaseAdmin.storage
      .from("documents")
      .getPublicUrl(filePath);

    return {
      success: true,
      signedUrl: data.signedUrl,
      token: data.token,
      filePath,
      publicUrl: urlData.publicUrl,
    };
  } catch (error: unknown) {
    console.error("Signed URL creation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Generate a summary of the document content for embedding
 * The summary captures key information to enable semantic search
 */
async function generateDocumentSummary(
  content: string,
  title: string,
  docType: "form" | "notice"
): Promise<string> {
  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    system: `You are a document summarizer for a college information system. 
Your task is to create concise, searchable summaries of official documents.
The summary should capture:
- The main purpose/subject of the document
- Key dates, deadlines, or time periods mentioned
- Important requirements, eligibility criteria, or conditions
- Any specific fees, amounts, or quantities
- Target audience (students, faculty, etc.)

Keep the summary under 500 words but include all critical information.
If the document is in Hindi, provide the summary in both Hindi and English.`,
    prompt: `Please summarize this ${docType} titled "${title}":

${content.slice(0, 15000)}`, // Limit content to avoid token limits
  });

  return text;
}

/**
 * Process an already-uploaded form from Supabase Storage
 * This is called after client-side upload to avoid server body size limits
 */
export async function processUploadedForm(
  input: ProcessFormInput
): Promise<UploadFormResult> {
  try {
    const {
      filePath,
      publicUrl,
      collegeId,
      title,
      useOcr,
      fileType,
      fileSize,
    } = input;

    console.log(`Processing form: ${title} for college: ${collegeId}`);
    console.log(`File path: ${filePath}`);

    // 1. Download the file from Supabase Storage to process
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("documents")
      .download(filePath);

    if (downloadError || !fileData) {
      throw new Error(
        `Failed to download file: ${downloadError?.message || "No data"}`
      );
    }

    // 2. Extract text from the document
    let extractedText: string;

    if (useOcr) {
      // Use Mistral OCR for Hindi PDFs and scanned documents
      console.log("Using Mistral OCR for text extraction...");
      extractedText = await extractTextWithOCR(publicUrl);
    } else {
      // Use standard parser for regular documents
      console.log("Using standard parser for text extraction...");
      // Convert Blob to File for the parser
      const file = new File([fileData], title, { type: fileType });
      extractedText = await parseFile(file);
    }

    console.log(`Extracted ${extractedText.length} characters`);

    if (!extractedText || extractedText.trim().length < 50) {
      throw new Error(
        "Could not extract sufficient text from the document. Try enabling OCR."
      );
    }

    // 3. Generate AI summary
    console.log("Generating document summary...");
    const summary = await generateDocumentSummary(extractedText, title, "form");
    console.log(`Generated summary: ${summary.slice(0, 200)}...`);

    // 4. Embed the summary (not the full content)
    console.log("Generating embedding for summary...");
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: summary,
    });

    // 5. Save to database
    // First, create the file record with document_type = 'form'
    const { data: fileRecord, error: fileError } = await supabaseAdmin
      .from("files")
      .insert({
        name: title,
        url: filePath,
        college_id: collegeId,
        size: fileSize,
        type: fileType,
        document_type: "form", // Mark as form/notice
        source_url: publicUrl, // Supabase public URL for citations
      })
      .select()
      .single();

    if (fileError) {
      throw new Error(`File record creation failed: ${fileError.message}`);
    }

    // Store the summary as a single document entry
    // The full extracted text is stored in content, but only summary is embedded
    const { error: dbError } = await supabaseAdmin.from("documents").insert({
      content: extractedText, // Store full text for retrieval
      embedding: embedding,
      file_id: fileRecord.id,
      metadata: {
        filename: title,
        college_id: collegeId,
        storage_path: filePath,
        is_summary: true, // Flag to indicate this is summary-embedded
        summary: summary, // Store summary separately for reference
        public_url: publicUrl, // Clickable citation link
        use_full_context: true, // Flag for RAG to use full content
      },
    });

    if (dbError) {
      // Rollback file record if document insert fails
      await supabaseAdmin.from("files").delete().eq("id", fileRecord.id);
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    console.log(`Form uploaded successfully: ${fileRecord.id}`);

    return {
      success: true,
      fileId: fileRecord.id,
      publicUrl: publicUrl,
    };
  } catch (error: unknown) {
    console.error("Form processing error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * @deprecated Use client-side upload with processUploadedForm instead
 * This function is kept for backwards compatibility but will hit body size limits
 */
export async function uploadForm(
  formData: FormData
): Promise<UploadFormResult> {
  try {
    const file = formData.get("file") as File;
    const collegeId = formData.get("collegeId") as string;
    const title = formData.get("title") as string | null;
    const useOcr = formData.get("useOcr") === "true";

    // TODO: Get college_id from logged-in admin's session
    // For now, collegeId is passed from the form

    if (!file || !collegeId) {
      throw new Error("Missing file or college ID");
    }

    const documentTitle = title || file.name;
    console.log(`Processing form: ${documentTitle} for college: ${collegeId}`);

    // 1. Upload to Supabase Storage
    const filePath = `${collegeId}/forms/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("documents")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL for the uploaded file
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("documents").getPublicUrl(filePath);

    console.log(`File uploaded to: ${publicUrl}`);

    // 2. Extract text from the document
    let extractedText: string;

    if (useOcr) {
      // Use Mistral OCR for Hindi PDFs and scanned documents
      console.log("Using Mistral OCR for text extraction...");
      extractedText = await extractTextWithOCR(publicUrl);
    } else {
      // Use standard parser for regular documents
      console.log("Using standard parser for text extraction...");
      extractedText = await parseFile(file);
    }

    console.log(`Extracted ${extractedText.length} characters`);

    if (!extractedText || extractedText.trim().length < 50) {
      throw new Error(
        "Could not extract sufficient text from the document. Try enabling OCR."
      );
    }

    // 3. Generate AI summary
    console.log("Generating document summary...");
    const summary = await generateDocumentSummary(
      extractedText,
      documentTitle,
      "form"
    );
    console.log(`Generated summary: ${summary.slice(0, 200)}...`);

    // 4. Embed the summary (not the full content)
    console.log("Generating embedding for summary...");
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: summary,
    });

    // 5. Save to database
    // First, create the file record with document_type = 'form'
    const { data: fileRecord, error: fileError } = await supabaseAdmin
      .from("files")
      .insert({
        name: documentTitle,
        url: filePath,
        college_id: collegeId,
        size: file.size,
        type: file.type,
        document_type: "form", // Mark as form/notice
        source_url: publicUrl, // Supabase public URL for citations
      })
      .select()
      .single();

    if (fileError) {
      throw new Error(`File record creation failed: ${fileError.message}`);
    }

    // Store the summary as a single document entry
    // The full extracted text is stored in content, but only summary is embedded
    const { error: dbError } = await supabaseAdmin.from("documents").insert({
      content: extractedText, // Store full text for retrieval
      embedding: embedding,
      file_id: fileRecord.id,
      metadata: {
        filename: documentTitle,
        college_id: collegeId,
        storage_path: filePath,
        is_summary: true, // Flag to indicate this is summary-embedded
        summary: summary, // Store summary separately for reference
        public_url: publicUrl, // Clickable citation link
        use_full_context: true, // Flag for RAG to use full content
      },
    });

    if (dbError) {
      // Rollback file record if document insert fails
      await supabaseAdmin.from("files").delete().eq("id", fileRecord.id);
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    console.log(`Form uploaded successfully: ${fileRecord.id}`);

    return {
      success: true,
      fileId: fileRecord.id,
      publicUrl: publicUrl,
    };
  } catch (error: unknown) {
    console.error("Form upload error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
