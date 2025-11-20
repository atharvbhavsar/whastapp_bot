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

-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table to store your documents
create table if not exists documents (
  id bigserial primary key,
  content text, -- The text chunk
  metadata jsonb, -- { filename: "policy.pdf", page: 1, college_id: "..." }
  embedding vector(1536) -- OpenAI embedding (1536 dimensions)
);

-- Create a function to search for documents
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) >= match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Create an index for faster queries (IVFFlat)
-- Note: You might need to have some data in the table before creating this index effectively, 
-- or use HNSW if supported by your Supabase tier.
create index on documents using ivfflat (embedding vector_cosine_ops)
with (lists = 100);
