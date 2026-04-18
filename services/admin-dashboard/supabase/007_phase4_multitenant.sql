-- ============================================================
-- PHASE 4: MULTI-TENANT ARCHITECTURE & ANALYTICS GOVERNANCE
-- ============================================================

-- 1. Create the canonical Tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Initial Municipal Corporations
INSERT INTO public.tenants (id, name, slug) VALUES 
('11111111-1111-1111-1111-111111111111', 'Pune Municipal Corporation', 'pune'),
('22222222-2222-2222-2222-222222222222', 'Mumbai Municipal Corporation', 'mumbai'),
('33333333-3333-3333-3333-333333333333', 'Nagpur Municipal Corporation', 'nagpur')
ON CONFLICT (slug) DO NOTHING;

-- 2. Alter existing core tables to add tenant isolation
-- (For MVP, we allow NULLs briefly to avoid breaking existing dev data, 
-- but in production, we would set DEFAULT '11111111-1111-1111-1111-111111111111' and NOT NULL)
ALTER TABLE public.complaints_master ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) DEFAULT '11111111-1111-1111-1111-111111111111';
ALTER TABLE public.ongoing_projects ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) DEFAULT '11111111-1111-1111-1111-111111111111';
ALTER TABLE public.status_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) DEFAULT '11111111-1111-1111-1111-111111111111';

-- Update matched schema index for scale
CREATE INDEX IF NOT EXISTS idx_complaints_tenant ON public.complaints_master(tenant_id);

-- ============================================================
-- ADVANCED ANALYTICS RPCs
-- ============================================================

-- A. Heatmap Data (Density of complaints)
CREATE OR REPLACE FUNCTION get_heatmap_data(p_tenant_id UUID)
RETURNS TABLE (latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, weight INT, category VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT c.latitude, c.longitude, (c.reports_count::INT), c.category::VARCHAR
    FROM public.complaints_master c
    WHERE c.tenant_id = p_tenant_id 
      AND c.latitude IS NOT NULL 
      AND c.longitude IS NOT NULL
      AND c.status != 'resolved';
END;
$$ LANGUAGE plpgsql;

-- B. Recurring Issues (Categories failing repeatedly)
CREATE OR REPLACE FUNCTION get_recurring_issues(p_tenant_id UUID)
RETURNS TABLE (category VARCHAR, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT c.category::VARCHAR, COUNT(*) as count
    FROM public.complaints_master c
    WHERE c.tenant_id = p_tenant_id
      AND c.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY c.category
    HAVING COUNT(*) >= 2
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- C. SLA Violations (For dashboards and public metrics)
CREATE OR REPLACE FUNCTION get_sla_violations(p_tenant_id UUID)
RETURNS TABLE (id UUID, public_id UUID, category VARCHAR, status public.complaint_status, sla_due_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.id as public_id, c.category::VARCHAR, c.status, c.sla_due_at
    FROM public.complaints_master c
    WHERE c.tenant_id = p_tenant_id
      AND c.status NOT IN ('resolved', 'closed')
      AND c.sla_due_at < NOW()
    ORDER BY c.sla_due_at ASC;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- GOVERNANCE: AUTO-ESCALATION ENGINE (Lazy-Evaluation)
-- ============================================================
-- Sweeps all open complaints past SLA and escalates them legally.
CREATE OR REPLACE FUNCTION escalate_slas()
RETURNS INT AS $$
DECLARE
    escalated_count INT := 0;
    r RECORD;
BEGIN
    FOR r IN 
        SELECT id FROM public.complaints_master 
        WHERE status IN ('filed', 'assigned', 'in_progress') 
          AND sla_due_at < NOW() 
    LOOP
        -- Flip status
        UPDATE public.complaints_master SET status = 'escalated' WHERE id = r.id;
        
        -- Add to audit trail
        INSERT INTO public.complaint_events (master_id, event_type, actor_id, metadata)
        VALUES (r.id, 'STATUS_CHANGE', '00000000-0000-0000-0000-000000000000', '{"new_status":"escalated", "reason": "SLA Auto-Breach"}');
        
        escalated_count := escalated_count + 1;
    END LOOP;
    
    RETURN escalated_count;
END;
$$ LANGUAGE plpgsql;
