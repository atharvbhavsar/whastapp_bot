-- =================================================================================
-- CIVIC COMPLAINT SYSTEM - STEP 4: SPATIAL CLUSTERING (NO POSTGIS REQUIRED)
-- =================================================================================

-- 1. Create a pure PostgreSQL Haversine distance function (in meters)
CREATE OR REPLACE FUNCTION calculate_haversine_distance(
    lat1 FLOAT, lon1 FLOAT,
    lat2 FLOAT, lon2 FLOAT
) RETURNS FLOAT AS $$
DECLARE
    radius FLOAT := 6371000; -- Earth's radius in meters
    dLat FLOAT;
    dLon FLOAT;
    a FLOAT;
    c FLOAT;
BEGIN
    dLat := radians(lat2 - lat1);
    dLon := radians(lon2 - lon1);

    a := sin(dLat / 2) * sin(dLat / 2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dLon / 2) * sin(dLon / 2);
         
    c := 2 * atan2(sqrt(a), sqrt(1 - a));
    
    RETURN radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- 2. Create RPC to find the nearest OPEN master complaint for clustering
-- Accepts department_id to filter, clustering radius, and coordinates.
CREATE OR REPLACE FUNCTION find_nearby_master_complaint(
    p_department_id VARCHAR(255),
    p_lat FLOAT,
    p_lon FLOAT,
    p_radius_meters FLOAT
) RETURNS SETOF public.complaints_master AS $$
BEGIN
    RETURN QUERY
    SELECT m.*
    FROM public.complaints_master m
    WHERE m.status = 'filed'
      AND m.department_id = p_department_id
      AND m.latitude IS NOT NULL
      AND m.longitude IS NOT NULL
      AND calculate_haversine_distance(p_lat, p_lon, m.latitude, m.longitude) <= p_radius_meters
    ORDER BY calculate_haversine_distance(p_lat, p_lon, m.latitude, m.longitude) ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
