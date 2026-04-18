-- ============================================================
-- PHASE 3: GOVERNMENT INTEGRATION & REALTIME SUPABASE
-- ============================================================

-- 1. Create Government ERP Tracking Table
CREATE TABLE IF NOT EXISTS public.ongoing_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    department_id VARCHAR(255) NOT NULL,
    work_type VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters FLOAT NOT NULL DEFAULT 150.0,
    expected_completion DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'in_progress',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Pre-validation RPC Check
-- Bounces incoming user coordinates against live government work
CREATE OR REPLACE FUNCTION check_ongoing_work(
    p_lat FLOAT,
    p_lon FLOAT,
    p_department VARCHAR(255)
) RETURNS SETOF public.ongoing_projects AS $$
BEGIN
    RETURN QUERY
    SELECT o.*
    FROM public.ongoing_projects o
    WHERE o.status = 'in_progress'
      AND o.department_id = p_department
      -- Using our previously defined haversine function from 004_clustering.sql!
      AND calculate_haversine_distance(p_lat, p_lon, o.latitude, o.longitude) <= o.radius_meters
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 3. Insert Dummy Mock Project to Test (e.g., Baner Area Pipe Repair)
-- (We'll use typical Pune coordinates ~18.5204/73.8567 or generic)
INSERT INTO public.ongoing_projects (title, department_id, work_type, latitude, longitude, radius_meters, expected_completion)
VALUES (
    'Main Pipeline Maintenance', 
    'water_dept', -- Assuming a categorization falls into water
    'infrastructure', 
    18.5590, -- Example coords (Baner area)
    73.7868, 
    500.0, -- Large 500m impact zone
    '2026-04-30'
) ON CONFLICT DO NOTHING;

-- 4. Enable Supabase Realtime (Pub/Sub Event Driven Updates)
-- Make sure the publication exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

-- Subscribe our key tables to the Websocket engine!
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints_master;
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaint_events;
