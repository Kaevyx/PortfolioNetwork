-- Profile Views Tracking System
-- Tracks when users view profiles and provides real-time view counts

-- Create profile_views table
CREATE TABLE IF NOT EXISTS profile_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  viewer_id TEXT NOT NULL REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate views from same viewer
CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_views_unique 
ON profile_views(profile_id, viewer_id);

-- Create index for fast lookups of recent views
CREATE INDEX IF NOT EXISTS idx_profile_views_profile_viewed_at 
ON profile_views(profile_id, viewed_at DESC);

-- Create index for viewer lookups
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer 
ON profile_views(viewer_id);

-- Function to get active viewers (viewed in last 10 seconds)
CREATE OR REPLACE FUNCTION get_active_profile_viewers(p_profile_id TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT viewer_id)
    FROM profile_views
    WHERE profile_id = p_profile_id
      AND viewed_at >= NOW() - INTERVAL '10 seconds'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old view records (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_profile_views()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM profile_views
  WHERE viewed_at < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean up old views (optional - requires pg_cron extension)
-- SELECT cron.schedule('cleanup-profile-views', '0 * * * *', 'SELECT cleanup_old_profile_views()');

-- RLS Policies (if using Row Level Security)
-- Allow users to view their own profile view counts
-- Allow users to track views on profiles they visit

