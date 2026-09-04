-- Blocked Content Attempts Logging System
-- Records when users try to post content that gets blocked by moderation

CREATE TABLE IF NOT EXISTS blocked_content_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment', 'share_comment', 'other')),
  attempted_content TEXT NOT NULL,
  blocked_keyword_id UUID REFERENCES blocked_keywords(id) ON DELETE SET NULL,
  blocked_domain_id UUID REFERENCES blocked_domains(id) ON DELETE SET NULL,
  matched_keyword TEXT, -- Store the keyword that matched (in case keyword is deleted)
  matched_domain TEXT, -- Store the domain that matched (in case domain is deleted)
  category TEXT, -- Store the category for quick reference
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
  message_shown TEXT, -- The message that was shown to the user
  context_url TEXT, -- URL or context where the attempt was made (e.g., post ID, page)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blocked_attempts_user_id ON blocked_content_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_attempts_created_at ON blocked_content_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blocked_attempts_content_type ON blocked_content_attempts(content_type);
CREATE INDEX IF NOT EXISTS idx_blocked_attempts_category ON blocked_content_attempts(category);
CREATE INDEX IF NOT EXISTS idx_blocked_attempts_severity ON blocked_content_attempts(severity);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_blocked_attempts_user_date ON blocked_content_attempts(user_id, created_at DESC);

-- Function to get blocked attempts with user info
-- Drop existing function first if it exists
DROP FUNCTION IF EXISTS get_blocked_content_attempts(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_blocked_content_attempts(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_user_id TEXT DEFAULT NULL,
  p_content_type TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id TEXT,
  user_email TEXT,
  user_username TEXT,
  content_type TEXT,
  attempted_content TEXT,
  matched_keyword TEXT,
  matched_domain TEXT,
  category TEXT,
  severity TEXT,
  message_shown TEXT,
  context_url TEXT,
  warning_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bca.id,
    bca.user_id,
    p.email as user_email,
    COALESCE(p.display_name, p.email, bca.user_id) as user_username,
    bca.content_type,
    bca.attempted_content,
    bca.matched_keyword,
    bca.matched_domain,
    bca.category,
    bca.severity,
    bca.message_shown,
    bca.context_url,
    bca.warning_id,
    bca.created_at
  FROM blocked_content_attempts bca
  LEFT JOIN profiles p ON p.clerk_id = bca.user_id
  WHERE 
    (p_user_id IS NULL OR bca.user_id = p_user_id)
    AND (p_content_type IS NULL OR bca.content_type = p_content_type)
    AND (p_category IS NULL OR bca.category = p_category)
    AND (p_severity IS NULL OR bca.severity = p_severity)
  ORDER BY bca.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get attempt statistics
CREATE OR REPLACE FUNCTION get_blocked_attempts_stats()
RETURNS TABLE (
  total_attempts BIGINT,
  unique_users BIGINT,
  attempts_today BIGINT,
  attempts_this_week BIGINT,
  top_category TEXT,
  top_severity TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_attempts,
    COUNT(DISTINCT user_id)::BIGINT as unique_users,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::BIGINT as attempts_today,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::BIGINT as attempts_this_week,
    (SELECT category FROM blocked_content_attempts GROUP BY category ORDER BY COUNT(*) DESC LIMIT 1) as top_category,
    (SELECT severity FROM blocked_content_attempts GROUP BY severity ORDER BY COUNT(*) DESC LIMIT 1) as top_severity;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE blocked_content_attempts IS 'Logs all attempts by users to post content that gets blocked by moderation';
COMMENT ON FUNCTION get_blocked_content_attempts IS 'Retrieves blocked content attempts with filtering options';
COMMENT ON FUNCTION get_blocked_attempts_stats IS 'Returns statistics about blocked content attempts';

