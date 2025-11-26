-- ============================================
-- SCHEMA FOR DOCUMENT STORAGE & RAG SYSTEM
-- Uses UUIDs for all primary keys
-- ============================================

-- Create the storage bucket for documents if it doesn't exist
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

-- Set up RLS policies for the storage bucket (Optional: adjust as needed)
-- Allow public read access (or restrict to authenticated users)
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'documents' );

-- Allow authenticated users to upload
create policy "Authenticated Upload"
on storage.objects for insert
with check ( bucket_id = 'documents' and auth.role() = 'authenticated' );

-- Enable required extensions
create extension if not exists vector;
create extension if not exists "uuid-ossp"; -- For uuid_generate_v4()

-- ============================================
-- FILES TABLE - Stores uploaded file metadata
-- ============================================
create table if not exists files (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  url text not null, -- Storage path
  college_id text not null,
  size bigint,
  type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for faster college lookups
create index if not exists files_college_id_idx on files(college_id);

-- ============================================
-- DOCUMENTS TABLE - Stores text chunks with embeddings
-- ============================================
create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  content text not null, -- The text chunk
  metadata jsonb, -- { filename: "policy.pdf", college_id: "...", chunk_index: 0 }
  embedding vector(1536), -- OpenAI embedding (1536 dimensions)
  file_id uuid references files(id) on delete cascade, -- Link to parent file
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for foreign key lookups
create index if not exists documents_file_id_idx on documents(file_id);

-- ============================================
-- VECTOR SEARCH FUNCTION
-- ============================================
-- Uses text parameter for embedding to avoid type casting issues
-- Includes filter parameter for college_id filtering
create or replace function match_documents (
  query_embedding_text text,
  match_threshold float,
  match_count int,
  filter jsonb default '{}'::jsonb
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql
as $$
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding_text::vector(1536)) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding_text::vector(1536)) >= match_threshold
  and documents.metadata @> filter
  limit match_count;
$$;

-- ============================================
-- VECTOR INDEX FOR FAST SIMILARITY SEARCH
-- ============================================
-- Note: You might need to have some data in the table before creating this index effectively, 
-- or use HNSW if supported by your Supabase tier.
create index if not exists documents_embedding_idx 
on documents using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- ============================================
-- MIGRATION HELPER (Run if you have existing data)
-- ============================================
-- If you need to migrate from bigserial to UUID, run this migration:
-- 
-- Step 1: Add new UUID columns
-- ALTER TABLE files ADD COLUMN new_id uuid DEFAULT uuid_generate_v4();
-- ALTER TABLE documents ADD COLUMN new_id uuid DEFAULT uuid_generate_v4();
-- ALTER TABLE documents ADD COLUMN new_file_id uuid;
-- 
-- Step 2: Create mapping and update references
-- UPDATE documents d SET new_file_id = f.new_id FROM files f WHERE d.file_id = f.id;
-- 
-- Step 3: Drop old columns and rename new ones
-- ALTER TABLE documents DROP CONSTRAINT documents_file_id_fkey;
-- ALTER TABLE documents DROP COLUMN file_id;
-- ALTER TABLE documents RENAME COLUMN new_file_id TO file_id;
-- ALTER TABLE files DROP COLUMN id;
-- ALTER TABLE files RENAME COLUMN new_id TO id;
-- ALTER TABLE files ADD PRIMARY KEY (id);
-- ALTER TABLE documents DROP COLUMN id;
-- ALTER TABLE documents RENAME COLUMN new_id TO id;
-- ALTER TABLE documents ADD PRIMARY KEY (id);
-- ALTER TABLE documents ADD FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE;
