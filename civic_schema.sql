-- ============================================
-- SCHEMA FOR SMART CIVIC INTELLIGENCE PLATFORM (Phase 4)
-- ============================================

create extension if not exists "uuid-ossp";
create extension if not exists vector; -- Requires pgvector in Supabase

-- ============================================
-- PHASE 4: MULTI-TENANT ARCHITECTURE
-- Every table is scoped to a tenant (city/municipality)
-- Tenant isolation enforced via tenant_id column + RLS
-- ============================================

-- ============================================
-- TENANTS TABLE (Cities / Municipalities)
-- ============================================
create table if not exists tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,          -- e.g. "Pune Municipal Corporation"
  slug text not null unique,          -- e.g. "pune" (used in API headers)
  contact_email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================
-- USERS TABLE (Scoped per tenant)
-- ============================================
create table if not exists civic_users (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('citizen', 'admin', 'officer', 'commissioner')) default 'citizen',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(tenant_id, email)
);
create index if not exists civic_users_tenant_idx on civic_users(tenant_id);
create index if not exists civic_users_email_idx on civic_users(tenant_id, email);

-- ============================================
-- COMPLAINTS TABLE (Multi-Tenant + Full Intelligence)
-- ============================================
create table if not exists complaints (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  public_id text not null unique,
  title text not null,
  description text,
  image_url text,
  video_url text,
  latitude double precision not null,
  longitude double precision not null,
  address text,
  category text not null default 'Uncategorized',
  severity text not null default 'low',
  status text not null check (status in ('Filed', 'Assigned', 'In Progress', 'Resolved', 'Escalated')) default 'Filed',
  assigned_to uuid references civic_users(id) on delete set null,
  citizen_email text,

  -- Phase 2: Clustering
  reports_count integer not null default 1,
  priority_score integer not null default 0,
  embedding vector(1536),

  -- Phase 3: AI Verification
  ai_verification_score integer,
  ai_verification_notes text,
  resolution_image_url text,

  -- Phase 4: SLA + Governance
  sla_deadline timestamp with time zone,
  escalation_level integer not null default 0,  -- 0=none, 1=dept head, 2=commissioner, 3=public
  is_recurring boolean not null default false,  -- Flagged by analytics engine

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Supabase realtime pub/sub
alter table complaints replica identity full;

create index if not exists complaints_tenant_idx on complaints(tenant_id);
create index if not exists complaints_status_idx on complaints(tenant_id, status);
create index if not exists complaints_public_id_idx on complaints(public_id);
create index if not exists complaints_priority_idx on complaints(tenant_id, priority_score desc);
create index if not exists complaints_embedding_idx on complaints using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ============================================
-- STATUS LOGS TABLE (Audit Trail per tenant)
-- ============================================
create table if not exists status_logs (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  complaint_id uuid not null references complaints(id) on delete cascade,
  status text not null,
  notes text,
  updated_by_email text,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);
create index if not exists status_logs_tenant_idx on status_logs(tenant_id);
create index if not exists status_logs_complaint_id_idx on status_logs(complaint_id);

-- ============================================
-- GOVERNMENT WORKS TABLE (ERP Integration, per tenant)
-- ============================================
create table if not exists government_works (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  department text not null,
  work_type text not null,
  status text not null default 'IN_PROGRESS',
  latitude double precision not null,
  longitude double precision not null,
  radius_meters double precision not null default 100,
  expected_completion date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create index if not exists govt_works_tenant_idx on government_works(tenant_id);

-- ============================================
-- PRIORITY TRIGGER: Priority = (reports_count * 20) + (days_pending * 5)
-- ============================================
create or replace function update_priority_score()
returns trigger language plpgsql as $$
declare
  days_pending float;
begin
  days_pending := extract(epoch from (now() - new.created_at)) / 86400;
  new.priority_score := (new.reports_count * 20) + ceil(days_pending * 5);
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create trigger tr_update_priority_score
before insert or update on complaints
for each row execute function update_priority_score();

-- ============================================
-- PHASE 4: SLA DEADLINE COMPUTATION
-- Severity-based SLA: critical=24h, high=48h, medium=72h, low=120h
-- Sets sla_deadline on INSERT if not provided
-- ============================================
create or replace function set_sla_deadline()
returns trigger language plpgsql as $$
begin
  if new.sla_deadline is null then
    case new.severity
      when 'critical' then new.sla_deadline := now() + interval '24 hours';
      when 'high'     then new.sla_deadline := now() + interval '48 hours';
      when 'medium'   then new.sla_deadline := now() + interval '72 hours';
      else                 new.sla_deadline := now() + interval '120 hours';
    end case;
  end if;
  return new;
end;
$$;

create trigger tr_set_sla_deadline
before insert on complaints
for each row execute function set_sla_deadline();

-- ============================================
-- HYBRID SEARCH (Phase 2 – Find Similar Complaints by Vector + Geo)
-- ============================================
create or replace function find_similar_complaints (
  query_embedding vector(1536),
  query_lat double precision,
  query_lon double precision,
  p_tenant_id uuid,
  match_threshold float default 0.8,
  max_distance float default 0.0005
)
returns table (id uuid, public_id text, similarity float, distance float)
language sql as $$
  select
    c.id, c.public_id,
    1 - (c.embedding <=> query_embedding) as similarity,
    sqrt(power(c.latitude - query_lat, 2) + power(c.longitude - query_lon, 2)) as distance
  from complaints c
  where c.tenant_id = p_tenant_id
  and 1 - (c.embedding <=> query_embedding) >= match_threshold
  and sqrt(power(c.latitude - query_lat, 2) + power(c.longitude - query_lon, 2)) <= max_distance
  and c.status != 'Resolved'
  order by similarity desc
  limit 1;
$$;

-- ============================================
-- PHASE 3: PRE-VALIDATION (Check Ongoing Govt Work)
-- ============================================
create or replace function check_ongoing_work (
  query_lat double precision,
  query_lon double precision,
  p_tenant_id uuid
)
returns table (id uuid, title text, expected_completion date, department text)
language sql as $$
  select g.id, g.title, g.expected_completion, g.department
  from government_works g
  where g.tenant_id = p_tenant_id
  and g.status = 'IN_PROGRESS'
  and sqrt(power(g.latitude - query_lat, 2) + power(g.longitude - query_lon, 2)) <= (g.radius_meters * 0.00001)
  limit 1;
$$;

-- ============================================
-- PHASE 4: ANALYTICS — Heatmap (GPS Cluster Counts)
-- Groups nearby complaints by rounding coordinates to 3 decimal places
-- ============================================
create or replace function get_heatmap_data(p_tenant_id uuid)
returns table (lat double precision, lon double precision, complaint_count bigint, avg_priority double precision)
language sql as $$
  select
    round(latitude::numeric, 3)::double precision as lat,
    round(longitude::numeric, 3)::double precision as lon,
    count(*) as complaint_count,
    avg(priority_score)::double precision as avg_priority
  from complaints
  where tenant_id = p_tenant_id and status != 'Resolved'
  group by round(latitude::numeric, 3), round(longitude::numeric, 3)
  order by complaint_count desc;
$$;

-- ============================================
-- PHASE 4: ANALYTICS — Recurring Issue Detection
-- Identifies categories reported more than 3 times in 30 days
-- ============================================
create or replace function get_recurring_issues(p_tenant_id uuid)
returns table (category text, occurrence_count bigint, avg_days_open double precision)
language sql as $$
  select
    category,
    count(*) as occurrence_count,
    avg(extract(epoch from (now() - created_at)) / 86400)::double precision as avg_days_open
  from complaints
  where tenant_id = p_tenant_id
  and created_at >= now() - interval '30 days'
  group by category
  having count(*) >= 3
  order by occurrence_count desc;
$$;

-- ============================================
-- PHASE 4: ANALYTICS — SLA Violations + Dept Performance
-- ============================================
create or replace function get_sla_violations(p_tenant_id uuid)
returns table (
  complaint_id uuid, public_id text, title text, category text,
  sla_deadline timestamp with time zone, days_overdue double precision,
  escalation_level integer
)
language sql as $$
  select
    id as complaint_id, public_id, title, category,
    sla_deadline,
    extract(epoch from (now() - sla_deadline)) / 86400 as days_overdue,
    escalation_level
  from complaints
  where tenant_id = p_tenant_id
  and status not in ('Resolved')
  and sla_deadline < now()
  order by days_overdue desc;
$$;
