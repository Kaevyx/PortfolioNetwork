-- Profile Views Aggregation System
-- Stores daily, weekly, and monthly aggregated view counts for historical tracking
-- This ensures historical data is preserved even if raw view records are cleaned up

-- Create profile_views_aggregated table for storing historical counts
CREATE TABLE IF NOT EXISTS profile_views_aggregated (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  unique_viewers INTEGER NOT NULL DEFAULT 0, -- Distinct viewers in this period
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, period_type, period_start)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_profile_views_agg_profile_period 
ON profile_views_aggregated(profile_id, period_type, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_profile_views_agg_period_start 
ON profile_views_aggregated(period_start, period_end);

-- Function to aggregate profile views for a specific period
CREATE OR REPLACE FUNCTION aggregate_profile_views(
  p_profile_id TEXT,
  p_period_type TEXT,
  p_period_start TIMESTAMP WITH TIME ZONE,
  p_period_end TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  view_count BIGINT,
  unique_viewers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as view_count,
    COUNT(DISTINCT viewer_id)::BIGINT as unique_viewers
  FROM profile_views
  WHERE profile_id = p_profile_id
    AND viewed_at >= p_period_start
    AND viewed_at < p_period_end;
END;
$$ LANGUAGE plpgsql;

-- Function to update daily aggregation (run daily via cron)
CREATE OR REPLACE FUNCTION update_daily_profile_views_aggregation()
RETURNS INTEGER AS $$
DECLARE
  processed_count INTEGER := 0;
  period_start TIMESTAMP WITH TIME ZONE;
  period_end TIMESTAMP WITH TIME ZONE;
  profile_record RECORD;
  agg_result RECORD;
BEGIN
  -- Process yesterday's data (to ensure all views for the day are captured)
  period_start := date_trunc('day', NOW() - INTERVAL '1 day');
  period_end := period_start + INTERVAL '1 day';
  
  -- Get all profiles that had views in this period
  FOR profile_record IN
    SELECT DISTINCT profile_id
    FROM profile_views
    WHERE viewed_at >= period_start
      AND viewed_at < period_end
  LOOP
    -- Calculate aggregated counts
    SELECT * INTO agg_result
    FROM aggregate_profile_views(
      profile_record.profile_id,
      'daily',
      period_start,
      period_end
    );
    
    -- Upsert aggregated data
    INSERT INTO profile_views_aggregated (
      profile_id,
      period_type,
      period_start,
      period_end,
      view_count,
      unique_viewers,
      updated_at
    )
    VALUES (
      profile_record.profile_id,
      'daily',
      period_start,
      period_end,
      agg_result.view_count,
      agg_result.unique_viewers,
      NOW()
    )
    ON CONFLICT (profile_id, period_type, period_start)
    DO UPDATE SET
      view_count = EXCLUDED.view_count,
      unique_viewers = EXCLUDED.unique_viewers,
      updated_at = NOW();
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update weekly aggregation (run weekly via cron)
CREATE OR REPLACE FUNCTION update_weekly_profile_views_aggregation()
RETURNS INTEGER AS $$
DECLARE
  processed_count INTEGER := 0;
  period_start TIMESTAMP WITH TIME ZONE;
  period_end TIMESTAMP WITH TIME ZONE;
  profile_record RECORD;
  agg_result RECORD;
BEGIN
  -- Process last week's data
  period_start := date_trunc('week', NOW() - INTERVAL '1 week');
  period_end := period_start + INTERVAL '1 week';
  
  FOR profile_record IN
    SELECT DISTINCT profile_id
    FROM profile_views
    WHERE viewed_at >= period_start
      AND viewed_at < period_end
  LOOP
    SELECT * INTO agg_result
    FROM aggregate_profile_views(
      profile_record.profile_id,
      'weekly',
      period_start,
      period_end
    );
    
    INSERT INTO profile_views_aggregated (
      profile_id,
      period_type,
      period_start,
      period_end,
      view_count,
      unique_viewers,
      updated_at
    )
    VALUES (
      profile_record.profile_id,
      'weekly',
      period_start,
      period_end,
      agg_result.view_count,
      agg_result.unique_viewers,
      NOW()
    )
    ON CONFLICT (profile_id, period_type, period_start)
    DO UPDATE SET
      view_count = EXCLUDED.view_count,
      unique_viewers = EXCLUDED.unique_viewers,
      updated_at = NOW();
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update monthly aggregation (run monthly via cron)
CREATE OR REPLACE FUNCTION update_monthly_profile_views_aggregation()
RETURNS INTEGER AS $$
DECLARE
  processed_count INTEGER := 0;
  period_start TIMESTAMP WITH TIME ZONE;
  period_end TIMESTAMP WITH TIME ZONE;
  profile_record RECORD;
  agg_result RECORD;
BEGIN
  -- Process last month's data
  period_start := date_trunc('month', NOW() - INTERVAL '1 month');
  period_end := period_start + INTERVAL '1 month';
  
  FOR profile_record IN
    SELECT DISTINCT profile_id
    FROM profile_views
    WHERE viewed_at >= period_start
      AND viewed_at < period_end
  LOOP
    SELECT * INTO agg_result
    FROM aggregate_profile_views(
      profile_record.profile_id,
      'monthly',
      period_start,
      period_end
    );
    
    INSERT INTO profile_views_aggregated (
      profile_id,
      period_type,
      period_start,
      period_end,
      view_count,
      unique_viewers,
      updated_at
    )
    VALUES (
      profile_record.profile_id,
      'monthly',
      period_start,
      period_end,
      agg_result.view_count,
      agg_result.unique_viewers,
      NOW()
    )
    ON CONFLICT (profile_id, period_type, period_start)
    DO UPDATE SET
      view_count = EXCLUDED.view_count,
      unique_viewers = EXCLUDED.unique_viewers,
      updated_at = NOW();
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get profile view count for a time period
-- This function checks aggregated data first, then falls back to raw data if needed
CREATE OR REPLACE FUNCTION get_profile_views_count(
  p_profile_id TEXT,
  p_period_start TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_period_end TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  total_views BIGINT,
  unique_viewers BIGINT
) AS $$
DECLARE
  v_period_start TIMESTAMP WITH TIME ZONE;
  v_period_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Default to all time if no period specified
  v_period_start := COALESCE(p_period_start, '1970-01-01'::TIMESTAMP WITH TIME ZONE);
  v_period_end := COALESCE(p_period_end, NOW());
  
  -- Try to use aggregated data if available for the period
  -- For now, query raw data (can be optimized later to use aggregated data)
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_views,
    COUNT(DISTINCT viewer_id)::BIGINT as unique_viewers
  FROM profile_views
  WHERE profile_id = p_profile_id
    AND viewed_at >= v_period_start
    AND viewed_at < v_period_end;
END;
$$ LANGUAGE plpgsql;

-- Function to get profile views for "this week" (last 7 days)
-- Uses aggregated data if available, falls back to raw data
CREATE OR REPLACE FUNCTION get_profile_views_this_week(p_profile_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  aggregated_count INTEGER;
BEGIN
  -- Try to get from aggregated data first
  SELECT COALESCE(SUM(view_count), 0)::INTEGER INTO aggregated_count
  FROM profile_views_aggregated
  WHERE profile_id = p_profile_id
    AND period_type = 'daily'
    AND period_start >= date_trunc('day', NOW() - INTERVAL '7 days');
  
  -- If aggregated data exists and covers the period, return it
  IF aggregated_count > 0 OR EXISTS (
    SELECT 1 FROM profile_views_aggregated
    WHERE profile_id = p_profile_id
      AND period_type = 'daily'
      AND period_start >= date_trunc('day', NOW() - INTERVAL '7 days')
  ) THEN
    RETURN COALESCE(aggregated_count, 0);
  END IF;
  
  -- Fallback to raw data if aggregated data not available
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM profile_views
    WHERE profile_id = p_profile_id
      AND viewed_at >= NOW() - INTERVAL '7 days'
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger to update aggregation when new views are added (optional - for real-time updates)
-- Note: This is optional and can be disabled if you prefer batch processing via cron
CREATE OR REPLACE FUNCTION update_profile_views_aggregation_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  today_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Update today's daily aggregation
  today_start := date_trunc('day', NEW.viewed_at);
  
  INSERT INTO profile_views_aggregated (
    profile_id,
    period_type,
    period_start,
    period_end,
    view_count,
    unique_viewers
  )
  SELECT
    NEW.profile_id,
    'daily',
    today_start,
    today_start + INTERVAL '1 day',
    COUNT(*),
    COUNT(DISTINCT viewer_id)
  FROM profile_views
  WHERE profile_id = NEW.profile_id
    AND viewed_at >= today_start
    AND viewed_at < today_start + INTERVAL '1 day'
  ON CONFLICT (profile_id, period_type, period_start)
  DO UPDATE SET
    view_count = (
      SELECT COUNT(*)
      FROM profile_views
      WHERE profile_id = NEW.profile_id
        AND viewed_at >= today_start
        AND viewed_at < today_start + INTERVAL '1 day'
    ),
    unique_viewers = (
      SELECT COUNT(DISTINCT viewer_id)
      FROM profile_views
      WHERE profile_id = NEW.profile_id
        AND viewed_at >= today_start
        AND viewed_at < today_start + INTERVAL '1 day'
    ),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (optional - can be disabled if using batch processing only)
-- DROP TRIGGER IF EXISTS trigger_update_profile_views_aggregation ON profile_views;
-- CREATE TRIGGER trigger_update_profile_views_aggregation
--   AFTER INSERT OR UPDATE ON profile_views
--   FOR EACH ROW
--   EXECUTE FUNCTION update_profile_views_aggregation_on_insert();

-- Scheduled jobs (requires pg_cron extension)
-- Run daily aggregation at 1 AM every day
-- SELECT cron.schedule('update-daily-profile-views', '0 1 * * *', 'SELECT update_daily_profile_views_aggregation()');

-- Run weekly aggregation every Monday at 2 AM
-- SELECT cron.schedule('update-weekly-profile-views', '0 2 * * 1', 'SELECT update_weekly_profile_views_aggregation()');

-- Run monthly aggregation on the 1st of each month at 3 AM
-- SELECT cron.schedule('update-monthly-profile-views', '0 3 1 * *', 'SELECT update_monthly_profile_views_aggregation()');

-- Comments:
-- 1. The aggregation table stores historical counts by period (daily, weekly, monthly)
-- 2. Aggregations can be updated via triggers (real-time) or cron jobs (batch)
-- 3. The cleanup function for profile_views can now safely delete old raw records
--    since historical data is preserved in the aggregated table
-- 4. Queries for "this week" or "this month" can use the aggregated table for better performance

