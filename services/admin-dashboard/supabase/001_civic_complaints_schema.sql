-- =================================================================================
-- CIVIC COMPLAINT SYSTEM - STEP 1: FOUNDATIONAL SCHEMA
-- =================================================================================

-- Enable PostGIS extension for accurate location support if needed, but we'll use simple lat/lng for MVP
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. ENUMS (Status, categories, severity)
CREATE TYPE complaint_status AS ENUM ('filed', 'assigned', 'in_progress', 'resolved', 'escalated', 'closed');
CREATE TYPE media_type AS ENUM ('photo', 'video', 'voice', 'text');
CREATE TYPE resolution_outcome AS ENUM ('pending', 'accepted', 'disputed');

-- 2. MASTER COMPLAINTS
-- The canonical source of truth for an issue. Citizen reports attach to this.
CREATE TABLE public.complaints_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(255) NOT NULL,
    description TEXT,
    severity INT NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 10),
    priority_score FLOAT NOT NULL DEFAULT 0.0,
    department_id VARCHAR(255) NOT NULL,
    zone_id VARCHAR(255),
    status complaint_status NOT NULL DEFAULT 'filed',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    sla_due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. COMPLAINT REPORTS (Citizen Submissions)
-- Every individual submission from a citizen.
CREATE TABLE public.complaint_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID REFERENCES public.complaints_master(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL, -- Could reference auth.users if auth is used
    media_type media_type NOT NULL,
    media_url TEXT,
    transcript_or_text TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    device_language VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. COMPLAINT EVENTS (Audit & Timeline)
-- Immutable timeline for tracking exactly what happened and when.
CREATE TABLE public.complaint_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID REFERENCES public.complaints_master(id) ON DELETE CASCADE,
    event_type VARCHAR(255) NOT NULL, -- e.g., 'STATUS_CHANGE', 'ASSIGNED', 'EVIDENCE_UPLOADED'
    actor_id UUID, -- Submitter, Officer, or System
    metadata JSONB, -- Context about the event
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ASSIGNMENTS
-- Which officer is working on which master complaint.
CREATE TABLE public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID REFERENCES public.complaints_master(id) ON DELETE CASCADE,
    officer_id UUID NOT NULL,
    zone_eligibility VARCHAR(255),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reassigned_at TIMESTAMP WITH TIME ZONE,
    reassignment_reason TEXT
);

-- 6. RESOLUTION EVIDENCE
-- Before/After photos to prove the work was done.
CREATE TABLE public.resolution_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID REFERENCES public.complaints_master(id) ON DELETE CASCADE,
    officer_id UUID NOT NULL,
    before_media_url TEXT,
    after_media_url TEXT NOT NULL,
    ai_verification_score FLOAT, -- Score given by AI comparing before/after
    geofence_validated BOOLEAN DEFAULT false,
    resolution_notes TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. DISPUTES
-- Citizen feedback if they claim it's "Not Fixed"
CREATE TABLE public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID REFERENCES public.complaints_master(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL,
    reason TEXT NOT NULL,
    reviewer_id UUID,
    outcome resolution_outcome DEFAULT 'pending',
    reopened_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. ESCALATION LOG
-- Automated escalations based on SLA breaches.
CREATE TABLE public.escalation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID REFERENCES public.complaints_master(id) ON DELETE CASCADE,
    trigger_level INT NOT NULL, -- e.g., 1 (Supervisor), 2 (Department Head)
    notified_role VARCHAR(255) NOT NULL,
    notified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT
);

-- 9. RECURRENCE FLAGS
-- Analytics/Warning for spots that break repeatedly.
CREATE TABLE public.recurrence_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID REFERENCES public.complaints_master(id) ON DELETE CASCADE,
    recurrence_count INT NOT NULL DEFAULT 1,
    time_window_days INT NOT NULL,
    recommended_action TEXT,
    flagged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================================
-- TRIGGERS & FUNCTIONS
-- =================================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_complaints_master_modtime
    BEFORE UPDATE ON public.complaints_master
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Function to dynamically recalculate priority score whenever a new report is added
CREATE OR REPLACE FUNCTION recalculate_master_priority()
RETURNS TRIGGER AS $$
DECLARE
    report_count INT;
    days_pending INT;
    base_severity INT;
BEGIN
    -- Get base variables
    SELECT severity, EXTRACT(DAY FROM (NOW() - created_at)) INTO base_severity, days_pending
    FROM public.complaints_master WHERE id = NEW.master_id;
    
    -- Get community count
    SELECT COUNT(*) INTO report_count 
    FROM public.complaint_reports WHERE master_id = NEW.master_id;

    -- Formula: Priority = Severity (1-10) + (Report Count * 0.5) + (Days Pending * 1.5)
    UPDATE public.complaints_master
    SET priority_score = base_severity + (report_count * 0.5) + (COALESCE(days_pending, 0) * 1.5)
    WHERE id = NEW.master_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_priority_on_report
    AFTER INSERT ON public.complaint_reports
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_master_priority();

-- Ensure row level security is enabled for all tables (best practice for Supabase)
ALTER TABLE public.complaints_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolution_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurrence_flags ENABLE ROW LEVEL SECURITY;

-- Note: RLS Policies should be defined per your specific auth provider requirements.
