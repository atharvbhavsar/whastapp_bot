
-- Citizen Memory Table for Personalized Context over Time
create table if not exists citizen_memories (
    id uuid primary key default uuid_generate_v4(),
    tenant_id uuid not null references tenants(id) on delete cascade,
    citizen_identifier text not null, -- email or session_id
    memory_text text not null,
    embedding vector(1536),
    created_at timestamp with time zone default timezone('utc', now()) not null
);

create index if not exists citizen_memories_tenant_identifier_idx on citizen_memories(tenant_id, citizen_identifier);
create index if not exists citizen_memories_embedding_idx on citizen_memories using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create or replace function match_citizen_memories(
    query_embedding_text text,
    p_tenant_id uuid,
    p_citizen_identifier text,
    match_threshold float,
    match_count int
) returns table (
    id uuid,
    memory_text text,
    similarity float
) language plpgsql stable as $$
begin
    return query
    select
        cm.id,
        cm.memory_text,
        1 - (cm.embedding <=> query_embedding_text::vector) as similarity
    from citizen_memories cm
    where
        cm.tenant_id = p_tenant_id
        and cm.citizen_identifier = p_citizen_identifier
        and 1 - (cm.embedding <=> query_embedding_text::vector) >= match_threshold
    order by cm.embedding <=> query_embedding_text::vector
    limit match_count;
end;
$$;
