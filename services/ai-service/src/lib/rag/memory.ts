
import { embed } from "ai";
import { mistral } from "@ai-sdk/mistral";
import { logger } from "../utils/logger.js";
import { getSupabase } from "./supabase.js";

export interface CitizenMemory {
  id: string;
  memory_text: string;
  similarity: number;
}

export async function storeCitizenMemory(
  tenantId: string,
  citizenIdentifier: string,
  memoryText: string
): Promise<boolean> {
  try {
    const { embedding } = await embed({
      model: mistral.textEmbeddingModel("mistral-embed"),
      value: memoryText,
    });

    const supabase = getSupabase();
    
    const { error } = await supabase.from("citizen_memories").insert({
      tenant_id: tenantId,
      citizen_identifier: citizenIdentifier,
      memory_text: memoryText,
      embedding: `[${embedding.join(",")}]`
    });

    if (error) {
      logger.error("Failed to store citizen memory:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error("Store citizen memory error:", error);
    return false;
  }
}

export async function recallCitizenMemories(
  query: string,
  tenantId: string,
  citizenIdentifier: string,
  matchThreshold = 0.3,
  matchCount = 5
): Promise<CitizenMemory[]> {
  try {
    const { embedding } = await embed({
      model: mistral.textEmbeddingModel("mistral-embed"),
      value: query,
    });

    const supabase = getSupabase();
    const vectorString = `[${embedding.join(",")}]`;

    const { data, error } = await supabase.rpc("match_citizen_memories", {
      query_embedding_text: vectorString,
      p_tenant_id: tenantId,
      p_citizen_identifier: citizenIdentifier,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) {
      logger.error("Supabase RPC error (match_citizen_memories):", error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error("Recall citizen memory error:", error);
    return [];
  }
}
