-- Visitor Tracking System
-- Tracks all visitors (logged in and anonymous) with comprehensive analytics

-- Create visits table
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL, -- Unique session identifier
  user_id TEXT, -- Clerk ID if logged in, NULL for anonymous
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  entry_page BOOLEAN DEFAULT FALSE, -- First page in session
  exit_page BOOLEAN DEFAULT FALSE, -- Last page in session (updated on next visit)
  
  -- Device Information
  user_agent TEXT,
  browser_name TEXT,
  browser_version TEXT,
  os_name TEXT,
  os_version TEXT,
  device_type TEXT, -- mobile, tablet, desktop
  device_brand TEXT,
  device_model TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  
  -- Location Information
  ip_address INET,
  country TEXT,
  country_code TEXT,
  region TEXT, -- State/Province
  city TEXT,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  timezone TEXT,
  
  -- Visit Metrics
  time_on_page INTEGER, -- seconds spent on page
  scroll_depth INTEGER, -- percentage scrolled (0-100)
  is_bounce BOOLEAN DEFAULT FALSE, -- Single page visit
  
  -- Timestamps
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_visits_session_id ON visits(session_id);
CREATE INDEX IF NOT EXISTS idx_visits_user_id ON visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_page_path ON visits(page_path);
CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits(visited_at);
CREATE INDEX IF NOT EXISTS idx_visits_country ON visits(country);
CREATE INDEX IF NOT EXISTS idx_visits_device_type ON visits(device_type);
CREATE INDEX IF NOT EXISTS idx_visits_entry_page ON visits(entry_page) WHERE entry_page = TRUE;
CREATE INDEX IF NOT EXISTS idx_visits_exit_page ON visits(exit_page) WHERE exit_page = TRUE;

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_visits_session_visited ON visits(session_id, visited_at);

-- Create sessions summary table for faster analytics
CREATE TABLE IF NOT EXISTS visit_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT,
  first_visit_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_visit_at TIMESTAMP WITH TIME ZONE NOT NULL,
  page_count INTEGER DEFAULT 1,
  total_time INTEGER DEFAULT 0, -- total seconds
  entry_page TEXT,
  exit_page TEXT,
  referrer TEXT,
  country TEXT,
  country_code TEXT,
  city TEXT,
  device_type TEXT,
  browser_name TEXT,
  os_name TEXT,
  is_bounce BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_sessions_user_id ON visit_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_sessions_first_visit ON visit_sessions(first_visit_at);
CREATE INDEX IF NOT EXISTS idx_visit_sessions_country ON visit_sessions(country);
CREATE INDEX IF NOT EXISTS idx_visit_sessions_device_type ON visit_sessions(device_type);

-- Function to update exit page for previous visit in session
CREATE OR REPLACE FUNCTION update_exit_page()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark previous visit in same session as exit page
  UPDATE visits
  SET exit_page = TRUE
  WHERE id = (
    SELECT id
    FROM visits
    WHERE session_id = NEW.session_id
      AND id != NEW.id
      AND exit_page = FALSE
      AND visited_at < NEW.visited_at
    ORDER BY visited_at DESC
    LIMIT 1
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update exit page
DROP TRIGGER IF EXISTS trigger_update_exit_page ON visits;
CREATE TRIGGER trigger_update_exit_page
  AFTER INSERT ON visits
  FOR EACH ROW
  EXECUTE FUNCTION update_exit_page();

-- Function to update session summary
CREATE OR REPLACE FUNCTION update_session_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO visit_sessions (
    session_id,
    user_id,
    first_visit_at,
    last_visit_at,
    page_count,
    total_time,
    entry_page,
    exit_page,
    referrer,
    country,
    country_code,
    city,
    device_type,
    browser_name,
    os_name,
    is_bounce,
    updated_at
  )
  VALUES (
    NEW.session_id,
    NEW.user_id,
    NEW.visited_at,
    NEW.visited_at,
    1,
    COALESCE(NEW.time_on_page, 0),
    CASE WHEN NEW.entry_page THEN NEW.page_path ELSE NULL END,
    CASE WHEN NEW.exit_page THEN NEW.page_path ELSE NULL END,
    NEW.referrer,
    NEW.country,
    NEW.country_code,
    NEW.city,
    NEW.device_type,
    NEW.browser_name,
    NEW.os_name,
    TRUE,
    NOW()
  )
  ON CONFLICT (session_id) DO UPDATE SET
    last_visit_at = NEW.visited_at,
    page_count = visit_sessions.page_count + 1,
    total_time = visit_sessions.total_time + COALESCE(NEW.time_on_page, 0),
    exit_page = CASE WHEN NEW.exit_page THEN NEW.page_path ELSE visit_sessions.exit_page END,
    is_bounce = (visit_sessions.page_count + 1) = 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session summary
DROP TRIGGER IF EXISTS trigger_update_session_summary ON visits;
CREATE TRIGGER trigger_update_session_summary
  AFTER INSERT ON visits
  FOR EACH ROW
  EXECUTE FUNCTION update_session_summary();

-- RPC Functions for Analytics

-- Get active users (logged in users with visits in last X minutes)
CREATE OR REPLACE FUNCTION get_active_users(p_minutes INTEGER DEFAULT 5)
RETURNS TABLE (
  user_id TEXT,
  user_email TEXT,
  user_display_name TEXT,
  current_page TEXT,
  time_on_page INTEGER,
  visited_at TIMESTAMP WITH TIME ZONE,
  device_type TEXT,
  browser_name TEXT,
  country TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (v.user_id)
    v.user_id,
    p.email as user_email,
    p.display_name as user_display_name,
    v.page_path as current_page,
    v.time_on_page,
    v.visited_at,
    v.device_type,
    v.browser_name,
    v.country
  FROM visits v
  LEFT JOIN profiles p ON p.clerk_id = v.user_id
  WHERE v.user_id IS NOT NULL
    AND v.visited_at >= NOW() - (p_minutes || ' minutes')::INTERVAL
  ORDER BY v.user_id, v.visited_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get visitor statistics
CREATE OR REPLACE FUNCTION get_visitor_stats(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  total_visits BIGINT,
  unique_visitors BIGINT,
  unique_sessions BIGINT,
  logged_in_visits BIGINT,
  anonymous_visits BIGINT,
  avg_time_on_site NUMERIC,
  bounce_rate NUMERIC,
  avg_pages_per_session NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_visits,
    COUNT(DISTINCT COALESCE(v.user_id, v.session_id))::BIGINT as unique_visitors,
    COUNT(DISTINCT v.session_id)::BIGINT as unique_sessions,
    COUNT(*) FILTER (WHERE v.user_id IS NOT NULL)::BIGINT as logged_in_visits,
    COUNT(*) FILTER (WHERE v.user_id IS NULL)::BIGINT as anonymous_visits,
    COALESCE(AVG(vs.total_time), 0)::NUMERIC as avg_time_on_site,
    COALESCE(
      (COUNT(*) FILTER (WHERE vs.is_bounce = TRUE)::NUMERIC / 
       NULLIF(COUNT(DISTINCT vs.session_id), 0)) * 100,
      0
    )::NUMERIC as bounce_rate,
    COALESCE(AVG(vs.page_count), 0)::NUMERIC as avg_pages_per_session
  FROM visits v
  LEFT JOIN visit_sessions vs ON vs.session_id = v.session_id
  WHERE v.visited_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get top pages
CREATE OR REPLACE FUNCTION get_top_pages(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  page_path TEXT,
  page_title TEXT,
  visit_count BIGINT,
  unique_visitors BIGINT,
  avg_time_on_page NUMERIC,
  bounce_count BIGINT,
  entry_count BIGINT,
  exit_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.page_path,
    MAX(v.page_title) as page_title,
    COUNT(*)::BIGINT as visit_count,
    COUNT(DISTINCT COALESCE(v.user_id, v.session_id))::BIGINT as unique_visitors,
    COALESCE(AVG(v.time_on_page), 0)::NUMERIC as avg_time_on_page,
    COUNT(*) FILTER (WHERE v.is_bounce = TRUE)::BIGINT as bounce_count,
    COUNT(*) FILTER (WHERE v.entry_page = TRUE)::BIGINT as entry_count,
    COUNT(*) FILTER (WHERE v.exit_page = TRUE)::BIGINT as exit_count
  FROM visits v
  WHERE v.visited_at BETWEEN p_start_date AND p_end_date
  GROUP BY v.page_path
  ORDER BY visit_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get device breakdown
CREATE OR REPLACE FUNCTION get_device_breakdown(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  device_type TEXT,
  browser_name TEXT,
  os_name TEXT,
  visit_count BIGINT,
  unique_visitors BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(v.device_type, 'Unknown') as device_type,
    COALESCE(v.browser_name, 'Unknown') as browser_name,
    COALESCE(v.os_name, 'Unknown') as os_name,
    COUNT(*)::BIGINT as visit_count,
    COUNT(DISTINCT COALESCE(v.user_id, v.session_id))::BIGINT as unique_visitors
  FROM visits v
  WHERE v.visited_at BETWEEN p_start_date AND p_end_date
  GROUP BY v.device_type, v.browser_name, v.os_name
  ORDER BY visit_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get location breakdown
CREATE OR REPLACE FUNCTION get_location_breakdown(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  country TEXT,
  country_code TEXT,
  city TEXT,
  visit_count BIGINT,
  unique_visitors BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(v.country, 'Unknown') as country,
    COALESCE(v.country_code, '') as country_code,
    COALESCE(v.city, '') as city,
    COUNT(*)::BIGINT as visit_count,
    COUNT(DISTINCT COALESCE(v.user_id, v.session_id))::BIGINT as unique_visitors
  FROM visits v
  WHERE v.visited_at BETWEEN p_start_date AND p_end_date
  GROUP BY v.country, v.country_code, v.city
  ORDER BY visit_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get visit journey for a session
CREATE OR REPLACE FUNCTION get_visit_journey(p_session_id TEXT)
RETURNS TABLE (
  page_path TEXT,
  page_title TEXT,
  visited_at TIMESTAMP WITH TIME ZONE,
  time_on_page INTEGER,
  referrer TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.page_path,
    v.page_title,
    v.visited_at,
    v.time_on_page,
    v.referrer
  FROM visits v
  WHERE v.session_id = p_session_id
  ORDER BY v.visited_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get entry/exit pages
CREATE OR REPLACE FUNCTION get_entry_exit_pages(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  page_path TEXT,
  page_title TEXT,
  entry_count BIGINT,
  exit_count BIGINT,
  drop_off_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH page_stats AS (
    SELECT
      v.page_path,
      MAX(v.page_title) as page_title,
      COUNT(*) FILTER (WHERE v.entry_page = TRUE)::BIGINT as entry_count,
      COUNT(*) FILTER (WHERE v.exit_page = TRUE)::BIGINT as exit_count,
      COUNT(*)::BIGINT as total_visits
    FROM visits v
    WHERE v.visited_at BETWEEN p_start_date AND p_end_date
    GROUP BY v.page_path
  )
  SELECT
    ps.page_path,
    ps.page_title,
    ps.entry_count,
    ps.exit_count,
    CASE
      WHEN ps.total_visits > 0 THEN
        (ps.exit_count::NUMERIC / ps.total_visits::NUMERIC) * 100
      ELSE 0
    END as drop_off_rate
  FROM page_stats ps
  WHERE ps.entry_count > 0 OR ps.exit_count > 0
  ORDER BY ps.exit_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disable RLS for visits tables (admin only access)
ALTER TABLE visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE visit_sessions DISABLE ROW LEVEL SECURITY;

