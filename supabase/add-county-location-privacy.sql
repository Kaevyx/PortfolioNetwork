-- Update location_privacy CHECK constraint to include all new privacy options
-- This allows users granular control over which location parts are visible

-- First, drop the existing constraint
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_location_privacy_check;

-- Add the constraint back with all privacy options
ALTER TABLE profiles
  ADD CONSTRAINT profiles_location_privacy_check 
  CHECK (location_privacy IN ('exact', 'city', 'city_country', 'county', 'county_country', 'city_county', 'country', 'hidden'));

-- Update default value to 'city_county' (Town/City + County/Region)
ALTER TABLE profiles
  ALTER COLUMN location_privacy SET DEFAULT 'city_county';

