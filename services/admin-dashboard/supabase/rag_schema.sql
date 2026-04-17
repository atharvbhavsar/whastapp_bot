-- ============================================================
-- SCIRP+ RAG Knowledge Base Schema
-- ============================================================
-- This schema powers the Civic RAG system:
-- Citizens and officers can query government policies, bylaws,
-- infrastructure PDFs, public notices via the AI chatbot.
--
-- Run this ALONGSIDE civic_schema.sql (not instead of it).
-- civic_schema.sql handles complaints, tenants, analytics.
-- This file handles the document/knowledge base infrastructure.
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- ============================================================
-- FILES TABLE — Uploaded Government Documents
-- Tracks all government PDFs, notices, bylaws uploaded per city
-- ============================================================
create table if not exists files (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  filename text not null,
  storage_path text not null,
  source_url text,                        -- Public URL of the document (if applicable)
  document_type text not null default 'info'
    check (document_type in ('info', 'structured', 'text', 'website', 'policy', 'notice', 'work_order')),
  description text,
  uploaded_by text,                        -- Officer email who uploaded
  created_at timestamp with time zone default timezone('utc', now()) not null
);

create index if not exists files_tenant_idx on files(tenant_id);

-- ============================================================
-- DOCUMENTS TABLE — Chunked document content for RAG
-- Each file is split into overlapping chunks for vector search
-- ============================================================
create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  file_id uuid references files(id) on delete cascade,
  content text not null,
  parent_content text,                    -- Full document content for LLM context window
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamp with time zone default timezone('utc', now()) not null
);

create index if not exists documents_tenant_idx on documents(tenant_id);
create index if not exists documents_file_id_idx on documents(file_id);
create index if not exists documents_embedding_idx on documents
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ============================================================
-- MATCH_DOCUMENTS RPC — Civic RAG Vector Similarity Search
-- Used by the AI chatbot to answer civic knowledge questions
-- ============================================================
create or replace function match_documents(
  query_embedding_text text,
  match_threshold float,
  match_count int,
  filter jsonb default '{}'::jsonb
)
returns table (
  id uuid,
  content text,
  parent_content text,
  metadata jsonb,
  similarity float,
  file_id uuid
)
language sql stable as $$
  select
    d.id,
    d.content,
    d.parent_content,
    d.metadata,
    1 - (d.embedding <=> query_embedding_text::vector) as similarity,
    d.file_id
  from documents d
  where
    1 - (d.embedding <=> query_embedding_text::vector) >= match_threshold
    and (
      filter = '{}'::jsonb
      or d.metadata @> filter
    )
  order by similarity desc
  limit match_count;
$$;

-- ============================================================
-- KNOWLEDGE_GAPS TABLE — Civic Knowledge Gap Tracking
-- When a citizen asks something the AI cannot answer,
-- it logs here so an admin can upload the relevant PDF
-- ============================================================
create table if not exists knowledge_gaps (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  query text not null,
  ai_comment text,
  user_email text,
  answer text,
  answered_at timestamp with time zone,
  cascaded_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

create index if not exists knowledge_gaps_tenant_idx on knowledge_gaps(tenant_id);

-- ============================================================
-- CHAT_SESSIONS TABLE — Civic Chatbot Interaction Logs
-- Stores chatbot / voice agent conversations for analytics
-- ============================================================
create table if not exists chat_sessions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  session_id text not null,
  channel text not null default 'chat'
    check (channel in ('chat', 'voice', 'widget', 'whatsapp')),
  citizen_email text,
  complaint_submitted boolean not null default false,
  complaint_public_id text,               -- Links to complaints.public_id if filed
  message_count integer not null default 0,
  started_at timestamp with time zone default timezone('utc', now()) not null,
  ended_at timestamp with time zone,
  unique(tenant_id, session_id)
);

create index if not exists chat_sessions_tenant_idx on chat_sessions(tenant_id);

-- ============================================================
-- OFFICER_PROFILES TABLE — Synced with Supabase Auth
-- Created automatically by trigger when officer signs up
-- ============================================================
create table if not exists officer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete set null,
  full_name text,
  email text not null,
  city_slug text,
  role text not null default 'officer'
    check (role in ('officer', 'admin', 'commissioner')),
  created_at timestamp with time zone default timezone('utc', now()) not null
);

create index if not exists officer_profiles_tenant_idx on officer_profiles(tenant_id);

-- ============================================================
-- TRIGGER: Auto-create officer_profile on auth signup
-- Reads city_slug and role from auth user metadata
-- ============================================================
create or replace function handle_new_officer()
returns trigger language plpgsql security definer as $$
declare
  v_tenant_id uuid;
begin
  -- Resolve tenant_id from city_slug
  select id into v_tenant_id
  from tenants
  where slug = new.raw_user_meta_data->>'city_slug'
  limit 1;

  insert into officer_profiles (id, tenant_id, full_name, email, city_slug, role)
  values (
    new.id,
    v_tenant_id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'city_slug',
    coalesce(new.raw_user_meta_data->>'role', 'officer')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace trigger on_officer_created
  after insert on auth.users
  for each row execute function handle_new_officer();
