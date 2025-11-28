"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

export interface TextContentResult {
  success: boolean;
  id?: string;
  error?: string;
}

export interface TextContentItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
  college_id: string;
}

/**
 * Add text content directly to the knowledge base
 * The text is embedded and stored for RAG search
 */
export async function addTextContent(
  collegeId: string,
  title: string,
  content: string
): Promise<TextContentResult> {
  try {
    if (!collegeId || !title || !content) {
      throw new Error("Missing required fields: collegeId, title, or content");
    }

    if (content.trim().length < 20) {
      throw new Error("Content must be at least 20 characters");
    }

    console.log(`Adding text content: "${title}" for college: ${collegeId}`);

    // 1. Generate embedding for the content
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: `${title}\n\n${content}`,
    });

    // 2. Create a virtual file record for consistency
    const { data: fileRecord, error: fileError } = await supabaseAdmin
      .from("files")
      .insert({
        name: title,
        url: `text-content/${collegeId}/${Date.now()}`, // Virtual path
        college_id: collegeId,
        size: content.length,
        type: "text/plain",
        document_type: "text", // New type for text content
        source_url: null, // No file to download
      })
      .select()
      .single();

    if (fileError) {
      throw new Error(`File record creation failed: ${fileError.message}`);
    }

    // 3. Store the content with embedding
    const { error: dbError } = await supabaseAdmin.from("documents").insert({
      content: content,
      embedding: embedding,
      file_id: fileRecord.id,
      metadata: {
        filename: title,
        college_id: collegeId,
        is_text_content: true, // Flag for text content
        chunk_index: 0,
      },
    });

    if (dbError) {
      // Rollback file record
      await supabaseAdmin.from("files").delete().eq("id", fileRecord.id);
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    console.log(`Text content added successfully: ${fileRecord.id}`);

    return {
      success: true,
      id: fileRecord.id,
    };
  } catch (error: unknown) {
    console.error("Text content error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Get all text content entries for a college
 */
export async function getTextContent(
  collegeId: string
): Promise<{ success: boolean; data?: TextContentItem[]; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from("files")
      .select("id, name, created_at, college_id")
      .eq("college_id", collegeId)
      .eq("document_type", "text")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    // Get content for each text entry
    const items: TextContentItem[] = [];
    for (const file of data || []) {
      const { data: docData } = await supabaseAdmin
        .from("documents")
        .select("content")
        .eq("file_id", file.id)
        .single();

      items.push({
        id: file.id,
        title: file.name,
        content: docData?.content || "",
        created_at: file.created_at,
        college_id: file.college_id,
      });
    }

    return { success: true, data: items };
  } catch (error: unknown) {
    console.error("Get text content error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Delete text content by ID
 */
export async function deleteTextContent(
  id: string
): Promise<TextContentResult> {
  try {
    // Delete documents first (cascade should handle this, but being explicit)
    const { error: docError } = await supabaseAdmin
      .from("documents")
      .delete()
      .eq("file_id", id);

    if (docError) {
      console.warn("Document deletion warning:", docError.message);
    }

    // Delete the file record
    const { error: fileError } = await supabaseAdmin
      .from("files")
      .delete()
      .eq("id", id);

    if (fileError) {
      throw new Error(`Delete failed: ${fileError.message}`);
    }

    console.log(`Text content deleted: ${id}`);
    return { success: true };
  } catch (error: unknown) {
    console.error("Delete text content error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
