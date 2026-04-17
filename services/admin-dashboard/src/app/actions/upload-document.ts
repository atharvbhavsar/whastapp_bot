"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { parseFile } from "@/lib/parser";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { RecursiveChunker } from "@chonkiejs/core";

// Types for duplicate detection
export interface SimilarChunk {
  id: string;
  content: string;
  file_id: string;
  filename: string;
  similarity: number;
  chunk_index?: number;
}

export interface DuplicateChunkMatch {
  newChunkIndex: number;
  newChunkContent: string;
  newChunkEmbedding: number[];
  similarChunks: SimilarChunk[];
}

export interface GroupedDuplicates {
  filename: string;
  fileId: string;
  totalMatches: number;
  avgSimilarity: number;
  chunkMatches: DuplicateChunkMatch[];
}

// Singleton chunker instance
let chunkerInstance: RecursiveChunker | null = null;

async function getChunker(): Promise<RecursiveChunker> {
  if (!chunkerInstance) {
    chunkerInstance = await RecursiveChunker.create({
      chunkSize: 256, // ~256 tokens per chunk
      minCharactersPerChunk: 24,
    });
  }
  return chunkerInstance;
}

/**
 * Find chunks that are similar to the provided chunks using vector similarity
 * Returns grouped results by file for UI display
 */
export async function findSimilarChunks(
  newChunksWithEmbeddings: Array<{
    content: string;
    embedding: number[];
    file_id: string;
  }>,
  collegeId: string,
  similarityThreshold: number = 0.85
): Promise<{
  foundDuplicates: boolean;
  allMatches: DuplicateChunkMatch[];
  groupedByFile: GroupedDuplicates[];
  totalSimilarChunks: number;
}> {
  try {
    console.log(
      `findSimilarChunks: Starting search for ${newChunksWithEmbeddings.length} chunks`
    );
    const allMatches: DuplicateChunkMatch[] = [];
    const fileMatches = new Map<string, GroupedDuplicates>();

    // For each new chunk, search for similar existing chunks
    for (let i = 0; i < newChunksWithEmbeddings.length; i++) {
      const chunk = newChunksWithEmbeddings[i];
      const vectorString = `[${chunk.embedding.join(",")}]`;

      // Use the existing match_documents RPC
      const { data: similarResults, error } = await supabaseAdmin.rpc(
        "match_documents",
        {
          query_embedding_text: vectorString,
          match_threshold: similarityThreshold,
          match_count: 100,
          filter: { college_id: collegeId },
        }
      );

      if (error) {
        console.error(`Error finding similar chunks for chunk ${i}:`, error);
        continue;
      }

      if (
        similarResults &&
        Array.isArray(similarResults) &&
        similarResults.length > 0
      ) {
        console.log(`Found ${similarResults.length} matches for chunk ${i}`);
        // Enrich results with file information
        const enrichedSimilarChunks: SimilarChunk[] = [];

        for (const result of similarResults) {
          const { data: fileData } = await supabaseAdmin
            .from("files")
            .select("name")
            .eq("id", result.file_id)
            .single();

          enrichedSimilarChunks.push({
            id: result.id,
            content: result.content,
            file_id: result.file_id,
            filename: fileData?.name || "Unknown File",
            similarity: result.similarity,
            chunk_index: result.metadata?.chunk_index,
          });
        }

        // Group by file
        for (const similarChunk of enrichedSimilarChunks) {
          const fileId = similarChunk.file_id;
          if (!fileMatches.has(fileId)) {
            fileMatches.set(fileId, {
              filename: similarChunk.filename,
              fileId,
              totalMatches: 0,
              avgSimilarity: 0,
              chunkMatches: [],
            });
          }

          const group = fileMatches.get(fileId)!;
          group.totalMatches += 1;
          group.chunkMatches.push({
            newChunkIndex: i,
            newChunkContent: chunk.content,
            newChunkEmbedding: chunk.embedding,
            similarChunks: [similarChunk],
          });
        }

        allMatches.push({
          newChunkIndex: i,
          newChunkContent: chunk.content,
          newChunkEmbedding: chunk.embedding,
          similarChunks: enrichedSimilarChunks,
        });
      }
    }

    // Calculate average similarity for each file group
    const groupedByFile = Array.from(fileMatches.values()).map((group) => {
      const avgSim =
        group.chunkMatches.reduce(
          (sum, match) =>
            sum + match.similarChunks.reduce((s, c) => s + c.similarity, 0),
          0
        ) / group.totalMatches || 0;
      return {
        ...group,
        avgSimilarity: Math.round(avgSim * 100) / 100,
      };
    });

    const totalSimilarChunks = allMatches.reduce(
      (sum, match) => sum + match.similarChunks.length,
      0
    );

    console.log(
      `findSimilarChunks: Found ${totalSimilarChunks} total similar chunks across ${groupedByFile.length} files`
    );

    return {
      foundDuplicates: allMatches.length > 0,
      allMatches,
      groupedByFile,
      totalSimilarChunks,
    };
  } catch (error) {
    console.error("Error in findSimilarChunks:", error);
    console.error("Error type:", typeof error);
    console.error("Error stringified:", JSON.stringify(error));
    return {
      foundDuplicates: false,
      allMatches: [],
      groupedByFile: [],
      totalSimilarChunks: 0,
    };
  }
}

/**
 * Delete similar chunks from the database
 */
export async function deleteSimilarChunks(
  chunkIdsToDelete: string[],
  collegeId: string
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    // Use the safe delete function
    const { data, error } = await supabaseAdmin.rpc("delete_similar_chunks", {
      p_chunk_ids: chunkIdsToDelete,
      p_college_id: collegeId,
    });

    if (error) {
      console.error("Delete error:", error);
      return {
        success: false,
        deletedCount: 0,
        error: error.message,
      };
    }

    if (data && data[0]) {
      return {
        success: data[0].success,
        deletedCount: data[0].deleted_count,
        error: data[0].message,
      };
    }

    return {
      success: false,
      deletedCount: 0,
      error: "No response from delete function",
    };
  } catch (error) {
    console.error("Unexpected error in deleteSimilarChunks:", error);
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function uploadDocument(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    const collegeId = formData.get("collegeId") as string;
    const chunkIdsToDeleteStr = formData.get("chunkIdsToDelete") as string;
    const chunkIdsToDelete = chunkIdsToDeleteStr
      ? JSON.parse(chunkIdsToDeleteStr)
      : [];

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

    // 2. Parse File to get text content
    const text = await parseFile(file);
    console.log(`Extracted ${text.length} characters`);

    // Get public URL for clickable citations
    const { data: urlData } = supabaseAdmin.storage
      .from("documents")
      .getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    // 3. Create the file record first
    const { data: fileRecord, error: fileError } = await supabaseAdmin
      .from("files")
      .insert({
        name: file.name,
        url: filePath,
        college_id: collegeId,
        size: file.size,
        type: file.type,
        document_type: "info",
        source_url: publicUrl,
      })
      .select()
      .single();

    if (fileError) {
      throw new Error(`File record creation failed: ${fileError.message}`);
    }

    // 4. Create parent document (full content)
    const { data: parentDoc, error: parentError } = await supabaseAdmin
      .from("parent_documents")
      .insert({
        file_id: fileRecord.id,
        content: text,
      })
      .select()
      .single();

    if (parentError) {
      await supabaseAdmin.from("files").delete().eq("id", fileRecord.id);
      throw new Error(
        `Parent document creation failed: ${parentError.message}`
      );
    }

    // 5. Chunk text using RecursiveChunker
    const chunker = await getChunker();
    const chunks = await chunker.chunk(text);
    console.log(`Created ${chunks.length} chunks using RecursiveChunker`);

    // 6. Generate embeddings with enrichment for each chunk
    const chunksWithEmbeddings = await Promise.all(
      chunks.map(async (chunk, index) => {
        try {
          // Enrichment: Prepend context for better retrieval
          const enrichedText = `Document: ${file.name}\nType: info\n\n${chunk.text}`;

          const { embedding } = await embed({
            model: openai.embedding("text-embedding-3-small"),
            value: enrichedText,
          });

          return {
            content: chunk.text,
            embedding,
            parent_document_id: parentDoc.id,
            file_id: fileRecord.id,
            metadata: {
              filename: file.name,
              college_id: collegeId,
              source_url: publicUrl,
              document_type: "info",
              chunk_index: index,
            },
          };
        } catch (embedError) {
          console.error(`Error embedding chunk ${index}:`, embedError);
          throw embedError;
        }
      })
    );

    // 7. DETECT DUPLICATES (NEW)
    const duplicateDetection = await findSimilarChunks(
      chunksWithEmbeddings,
      collegeId,
      0.85
    );

    // 7a. If duplicates found and no deletion confirmed, return early
    if (duplicateDetection.foundDuplicates && chunkIdsToDelete.length === 0) {
      // Clean up temporary records since we're asking for confirmation
      await supabaseAdmin.from("files").delete().eq("id", fileRecord.id);
      await supabaseAdmin
        .from("parent_documents")
        .delete()
        .eq("id", parentDoc.id);

      return {
        success: false,
        requiresConfirmation: true,
        duplicateData: {
          totalMatches: duplicateDetection.totalSimilarChunks,
          groupedByFile: duplicateDetection.groupedByFile,
          chunkData: chunksWithEmbeddings,
        },
      };
    }

    // 7b. If deletion confirmed, delete similar chunks first
    if (chunkIdsToDelete.length > 0) {
      try {
        const deleteResult = await deleteSimilarChunks(
          chunkIdsToDelete,
          collegeId
        );
        console.log(
          `Deleted ${deleteResult.deletedCount} similar chunks: ${deleteResult.success}`
        );
        if (!deleteResult.success) {
          throw new Error(
            deleteResult.error || "Failed to delete similar chunks"
          );
        }
      } catch (deleteError) {
        console.error("Error deleting similar chunks:", deleteError);
        throw new Error(
          `Failed to delete similar chunks: ${
            deleteError instanceof Error
              ? deleteError.message
              : String(deleteError)
          }`
        );
      }
    }

    // 8. Batch insert chunks
    const { error: dbError } = await supabaseAdmin
      .from("documents")
      .insert(chunksWithEmbeddings);

    if (dbError) {
      // Rollback
      await supabaseAdmin
        .from("parent_documents")
        .delete()
        .eq("id", parentDoc.id);
      await supabaseAdmin.from("files").delete().eq("id", fileRecord.id);
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    const deletedCount = chunkIdsToDelete.length;
    return {
      success: true,
      message: `Document processed: ${chunks.length} chunks created${
        deletedCount > 0 ? `, ${deletedCount} similar chunks deleted` : ""
      }`,
    };
  } catch (error: unknown) {
    console.error("Upload error:", error);
    console.error("Error type:", typeof error);
    console.error("Error stringified:", JSON.stringify(error));
    const message =
      error instanceof Error ? error.message : String(error) || "Unknown error";
    return { success: false, error: message };
  }
}
