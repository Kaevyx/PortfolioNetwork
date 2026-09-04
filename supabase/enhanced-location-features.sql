-- Enhanced Location Features
-- Adds structured location data and enables location-based discovery

-- Add enhanced location fields to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state_region TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8),
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  ADD COLUMN IF NOT EXISTS location_privacy TEXT DEFAULT 'city' CHECK (location_privacy IN ('exact', 'city', 'country', 'hidden'));

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(city, state_region, country);
CREATE INDEX IF NOT EXISTS idx_profiles_coordinates ON profiles(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Function to calculate distance between two coordinates (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 NUMERIC,
  lon1 NUMERIC,
  lat2 NUMERIC,
  lon2 NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  earth_radius_km NUMERIC := 6371; -- Earth radius in kilometers
  dlat NUMERIC;
  dlon NUMERIC;
  a NUMERIC;
  c NUMERIC;
  distance_km NUMERIC;
BEGIN
  -- Convert degrees to radians
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  -- Haversine formula
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlon/2) * sin(dlon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  -- Calculate distance in kilometers
  distance_km := earth_radius_km * c;
  
  -- Convert to miles (1 km = 0.621371 miles)
  RETURN distance_km * 0.621371;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get users near a location
DROP FUNCTION IF EXISTS get_users_near_location(TEXT, NUMERIC, NUMERIC, NUMERIC, INTEGER);
CREATE OR REPLACE FUNCTION get_users_near_location(
  p_user_id TEXT,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_radius_miles NUMERIC DEFAULT 31,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  clerk_id TEXT,
  username TEXT,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  city TEXT,
  state_region TEXT,
  country TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  distance_miles NUMERIC,
  is_verified BOOLEAN,
  subscription_plan TEXT,
  featured_priority INTEGER,
  profile_type TEXT,
  location_privacy TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.clerk_id,
    p.username,
    p.display_name,
    p.bio,
    p.avatar_url,
    p.city,
    p.state_region,
    p.country,
    p.latitude,
    p.longitude,
    calculate_distance(p_latitude, p_longitude, p.latitude, p.longitude) as distance_miles,
    p.is_verified,
    p.subscription_plan,
    COALESCE(p.featured_priority, 0) as featured_priority,
    p.profile_type,
    COALESCE(p.location_privacy, 'city') as location_privacy
  FROM profiles p
  WHERE p.clerk_id != p_user_id
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND p.profile_status = 'approved'
    AND p.is_suspended = FALSE
    AND COALESCE((p.settings->'privacy'->>'allowSearch')::boolean, true) IS NOT FALSE
    AND COALESCE((p.settings->'privacy'->>'showInNearbyUsers')::boolean, true) IS NOT FALSE
    AND calculate_distance(p_latitude, p_longitude, p.latitude, p.longitude) <= p_radius_miles
  ORDER BY 
    calculate_distance(p_latitude, p_longitude, p.latitude, p.longitude) ASC,
    featured_priority DESC,
    p.display_name ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search users by location
DROP FUNCTION IF EXISTS search_users_by_location(TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, INTEGER);
CREATE OR REPLACE FUNCTION search_users_by_location(
  p_search_city TEXT DEFAULT NULL,
  p_search_state TEXT DEFAULT NULL,
  p_search_country TEXT DEFAULT NULL,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_radius_miles NUMERIC DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  clerk_id TEXT,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  city TEXT,
  state_region TEXT,
  country TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  distance_miles NUMERIC,
  is_verified BOOLEAN,
  subscription_plan TEXT,
  featured_priority INTEGER,
  profile_type TEXT,
  location_privacy TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.clerk_id,
    p.display_name,
    p.bio,
    p.avatar_url,
    p.city,
    p.state_region,
    p.country,
    p.latitude,
    p.longitude,
    CASE 
      WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
        calculate_distance(p_latitude, p_longitude, p.latitude, p.longitude)
      ELSE NULL
    END as distance_miles,
    p.is_verified,
    p.subscription_plan,
    COALESCE(p.featured_priority, 0) as featured_priority,
    p.profile_type,
    COALESCE(p.location_privacy, 'city') as location_privacy
  FROM profiles p
  WHERE p.profile_status = 'approved'
    AND p.is_suspended = FALSE
    AND COALESCE((p.settings->'privacy'->>'allowSearch')::boolean, true) IS NOT FALSE
    AND COALESCE((p.settings->'privacy'->>'showInNearbyUsers')::boolean, true) IS NOT FALSE
    AND (
      (p_search_city IS NULL OR p.city ILIKE '%' || p_search_city || '%')
      AND (p_search_state IS NULL OR p.state_region ILIKE '%' || p_search_state || '%')
      AND (p_search_country IS NULL OR p.country ILIKE '%' || p_search_country || '%')
      AND (
        p_radius_miles IS NULL 
        OR p_latitude IS NULL 
        OR p_longitude IS NULL
        OR calculate_distance(p_latitude, p_longitude, p.latitude, p.longitude) <= p_radius_miles
      )
    )
  ORDER BY 
    CASE 
      WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
        calculate_distance(p_latitude, p_longitude, p.latitude, p.longitude)
      ELSE 0
    END ASC,
    featured_priority DESC,
    p.display_name ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION calculate_distance IS 'Calculates distance between two coordinates using Haversine formula (returns miles)';
COMMENT ON FUNCTION get_users_near_location IS 'Returns users within specified radius (in miles) of given coordinates, sorted by distance and featured priority';
COMMENT ON FUNCTION search_users_by_location IS 'Searches users by location criteria (city, state, country) with optional radius filter (in miles)';

