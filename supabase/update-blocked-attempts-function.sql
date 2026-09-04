-- Update get_blocked_content_attempts function to include warning_id
-- This should be run after add-warnings-system.sql

-- Drop existing function first
DROP FUNCTION IF EXISTS get_blocked_content_attempts(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT);

-- Recreate function with warning_id in return type
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

