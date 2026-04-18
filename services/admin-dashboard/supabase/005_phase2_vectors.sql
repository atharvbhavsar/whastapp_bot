-- ============================================================
-- PHASE 2: INTELLIGENCE LAYER (VECTOR EMBEDDINGS)
-- ============================================================
-- Adds vector capabilities directly to complaints to enable
-- semantic grouping of duplicate/similar issues.

-- 1. Enable pgvector (already done in rag_schema, but good for safety)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to master complaints
ALTER TABLE public.complaints_master
ADD COLUMN IF NOT EXISTS embedding vector(1536),
ADD COLUMN IF NOT EXISTS reports_count INT DEFAULT 1;

-- 3. Create index for fast vector searching
CREATE INDEX IF NOT EXISTS complaints_embedding_idx ON public.complaints_master
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 4. Hybrid Search RPC (Semantic + Spatial)
-- Finds complaints that mean the exact same thing AND are within the radius
CREATE OR REPLACE FUNCTION match_complaints(
    query_embedding vector(1536),
    p_department_id VARCHAR(255),
    p_lat FLOAT,
    p_lon FLOAT,
    p_radius_meters FLOAT,
    match_threshold FLOAT DEFAULT 0.85
) RETURNS SETOF public.complaints_master AS $$
BEGIN
    RETURN QUERY
    SELECT m.*
    FROM public.complaints_master m
    WHERE m.status = 'filed'
      AND m.department_id = p_department_id
      AND m.latitude IS NOT NULL
      AND m.longitude IS NOT NULL
      -- Semantic Match (Cosine distance is 1 - Cosine Similarity)
      AND (1 - (m.embedding <=> query_embedding)) > match_threshold
      -- Spatial Match
      AND calculate_haversine_distance(p_lat, p_lon, m.latitude, m.longitude) <= p_radius_meters
    ORDER BY (1 - (m.embedding <=> query_embedding)) DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql stable;
