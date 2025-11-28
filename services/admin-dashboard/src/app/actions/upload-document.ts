"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { parseFile } from "@/lib/parser";
import { chunkText } from "@/lib/utils";
import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";

export async function uploadDocument(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    const collegeId = formData.get("collegeId") as string;

    if (!file || !collegeId) {
      throw new Error("Missing file or college ID");
    }

    console.log(`Processing file: ${file.name} for college: ${collegeId}`);

    // 1. Upload to Supabase Storage
    const filePath = `${collegeId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("documents")
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // 2. Parse File
    const text = await parseFile(file);
    console.log(`Extracted ${text.length} characters`);

    // 3. Chunk Text
    const chunks = chunkText(text);
    console.log(`Created ${chunks.length} chunks`);

    // 4. Generate Embeddings
    const { embeddings } = await embedMany({
      model: openai.embedding("text-embedding-3-small"),
      values: chunks,
    });

    // Get public URL for clickable citations
    const { data: urlData } = supabaseAdmin.storage
      .from("documents")
      .getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    // 5. Save to Database (Files + Documents)
    // First, create the file record
    const { data: fileRecord, error: fileError } = await supabaseAdmin
      .from("files")
      .insert({
        name: file.name,
        url: filePath,
        college_id: collegeId,
        size: file.size,
        type: file.type,
        document_type: "info", // Mark as information document
        source_url: publicUrl, // Clickable citation link
      })
      .select()
      .single();

    if (fileError)
      throw new Error(`File record creation failed: ${fileError.message}`);

    // Then, insert chunks linked to the file
    const rows = chunks.map((chunk, i) => ({
      content: chunk,
      embedding: embeddings[i],
      file_id: fileRecord.id, // Link for cascade delete
      metadata: {
        filename: file.name,
        college_id: collegeId, // Keep for easy filtering in search
        chunk_index: i,
        storage_path: filePath,
        public_url: publicUrl, // Clickable citation link
      },
    }));

    const { error: dbError } = await supabaseAdmin
      .from("documents")
      .insert(rows);

    if (dbError) {
      // Rollback file record if chunks fail (optional but good practice)
      await supabaseAdmin.from("files").delete().eq("id", fileRecord.id);
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    return { success: true, message: "Document processed successfully" };
  } catch (error: unknown) {
    console.error("Upload error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
