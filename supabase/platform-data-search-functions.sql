-- Platform Data Search Functions
-- Comprehensive user search and filtering system for admin dashboard

-- Helper function to get user activity stats
CREATE OR REPLACE FUNCTION get_user_activity_stats(p_user_id TEXT)
RETURNS TABLE (
  total_posts BIGINT,
  total_comments BIGINT,
  total_reactions BIGINT,
  total_followers BIGINT,
  total_following BIGINT,
  last_post_date TIMESTAMP WITH TIME ZONE,
  last_login_date TIMESTAMP WITH TIME ZONE,
  days_since_last_post INTEGER,
  days_since_last_login INTEGER,
  profile_views_count BIGINT,
  portfolio_items_count BIGINT,
  drafts_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM posts WHERE profile_id = p_user_id)::BIGINT as total_posts,
    (SELECT COUNT(*) FROM post_comments WHERE user_id = p_user_id)::BIGINT as total_comments,
    (SELECT COUNT(*) FROM post_reactions WHERE user_id = p_user_id)::BIGINT as total_reactions,
    (SELECT COUNT(*) FROM follows WHERE following_id = p_user_id)::BIGINT as total_followers,
    (SELECT COUNT(*) FROM follows WHERE follower_id = p_user_id)::BIGINT as total_following,
    (SELECT MAX(created_at) FROM posts WHERE profile_id = p_user_id) as last_post_date,
    (SELECT MAX(visited_at) FROM visits WHERE user_id = p_user_id) as last_login_date,
    (SELECT EXTRACT(DAY FROM NOW() - MAX(created_at))::INTEGER FROM posts WHERE profile_id = p_user_id) as days_since_last_post,
    (SELECT EXTRACT(DAY FROM NOW() - MAX(visited_at))::INTEGER FROM visits WHERE user_id = p_user_id) as days_since_last_login,
    -- Profile views this week (last 7 days) - use aggregated data if available, fallback to raw data
    (
      SELECT COALESCE(
        (SELECT SUM(view_count) FROM profile_views_aggregated 
         WHERE profile_views_aggregated.profile_id = p_user_id 
         AND profile_views_aggregated.period_type = 'daily' 
         AND profile_views_aggregated.period_start >= date_trunc('day', NOW() - INTERVAL '7 days')),
        (SELECT COUNT(*) FROM profile_views 
         WHERE profile_views.profile_id = p_user_id 
         AND profile_views.viewed_at >= NOW() - INTERVAL '7 days')
      )
    )::BIGINT as profile_views_count,
    (SELECT COUNT(*) FROM portfolio_items WHERE profile_id = p_user_id)::BIGINT as portfolio_items_count,
    (SELECT COUNT(*) FROM post_drafts WHERE profile_id = p_user_id)::BIGINT as drafts_count;
END;
$$ LANGUAGE plpgsql;

-- Search users by activity criteria
CREATE OR REPLACE FUNCTION search_users_by_activity(
  p_min_days_active INTEGER DEFAULT NULL,
  p_max_days_inactive INTEGER DEFAULT NULL,
  p_min_posts INTEGER DEFAULT NULL,
  p_max_posts INTEGER DEFAULT NULL,
  p_min_days_since_last_post INTEGER DEFAULT NULL,
  p_max_days_since_last_post INTEGER DEFAULT NULL,
  p_never_posted BOOLEAN DEFAULT FALSE,
  p_has_drafts_no_posts BOOLEAN DEFAULT FALSE,
  p_weekend_only BOOLEAN DEFAULT FALSE,
  p_weekday_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  clerk_id TEXT,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  subscription_plan TEXT,
  is_suspended BOOLEAN,
  total_posts BIGINT,
  days_since_last_post INTEGER,
  days_since_last_login INTEGER,
  last_post_date TIMESTAMP WITH TIME ZONE,
  last_login_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT
      p.clerk_id,
      p.display_name,
      p.email,
      p.created_at,
      p.subscription_plan,
      p.is_suspended,
      get_user_activity_stats(p.clerk_id) as stats
    FROM profiles p
  )
  SELECT
    us.clerk_id,
    us.display_name,
    us.email,
    us.created_at,
    us.subscription_plan,
    us.is_suspended,
    (us.stats).total_posts,
    (us.stats).days_since_last_post,
    (us.stats).days_since_last_login,
    (us.stats).last_post_date,
    (us.stats).last_login_date
  FROM user_stats us
  WHERE
    (p_min_days_active IS NULL OR (us.stats).days_since_last_login <= p_min_days_active)
    AND (p_max_days_inactive IS NULL OR (us.stats).days_since_last_login >= p_max_days_inactive)
    AND (p_min_posts IS NULL OR (us.stats).total_posts >= p_min_posts)
    AND (p_max_posts IS NULL OR (us.stats).total_posts <= p_max_posts)
    AND (p_min_days_since_last_post IS NULL OR (us.stats).days_since_last_post >= p_min_days_since_last_post)
    AND (p_max_days_since_last_post IS NULL OR (us.stats).days_since_last_post <= p_max_days_since_last_post)
    AND (NOT p_never_posted OR (us.stats).total_posts = 0)
    AND (NOT p_has_drafts_no_posts OR ((us.stats).drafts_count > 0 AND (us.stats).total_posts = 0))
    AND (NOT p_weekend_only OR (
      EXISTS (
        SELECT 1 FROM posts 
        WHERE profile_id = us.clerk_id 
        AND EXTRACT(DOW FROM created_at) IN (0, 6)
      )
      AND NOT EXISTS (
        SELECT 1 FROM posts 
        WHERE profile_id = us.clerk_id 
        AND EXTRACT(DOW FROM created_at) NOT IN (0, 6)
      )
    ))
    AND (NOT p_weekday_only OR (
      EXISTS (
        SELECT 1 FROM posts 
        WHERE profile_id = us.clerk_id 
        AND EXTRACT(DOW FROM created_at) NOT IN (0, 6)
      )
      AND NOT EXISTS (
        SELECT 1 FROM posts 
        WHERE profile_id = us.clerk_id 
        AND EXTRACT(DOW FROM created_at) IN (0, 6)
      )
    ));
END;
$$ LANGUAGE plpgsql;

-- Search users by subscription criteria
CREATE OR REPLACE FUNCTION search_users_by_subscription(
  p_plan_name TEXT DEFAULT NULL,
  p_is_suspended BOOLEAN DEFAULT NULL,
  p_subscription_expires_days INTEGER DEFAULT NULL,
  p_near_usage_limit BOOLEAN DEFAULT FALSE,
  p_recently_downgraded BOOLEAN DEFAULT FALSE,
  p_recently_upgraded BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  clerk_id TEXT,
  display_name TEXT,
  email TEXT,
  subscription_plan TEXT,
  is_suspended BOOLEAN,
  subscription_status TEXT,
  current_period_end TIMESTAMP WITH TIME ZONE,
  days_until_expiry INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.clerk_id,
    p.display_name,
    p.email,
    p.subscription_plan,
    p.is_suspended,
    COALESCE(us.status, 'none') as subscription_status,
    us.current_period_end,
    CASE 
      WHEN us.current_period_end IS NOT NULL 
      THEN EXTRACT(DAY FROM us.current_period_end - NOW())::INTEGER
      ELSE NULL
    END as days_until_expiry
  FROM profiles p
  LEFT JOIN user_subscriptions us ON p.clerk_id = us.user_id
  WHERE
    (p_plan_name IS NULL OR p.subscription_plan = p_plan_name)
    AND (p_is_suspended IS NULL OR p.is_suspended = p_is_suspended)
    AND (p_subscription_expires_days IS NULL OR (
      us.current_period_end IS NOT NULL 
      AND EXTRACT(DAY FROM us.current_period_end - NOW())::INTEGER <= p_subscription_expires_days
      AND EXTRACT(DAY FROM us.current_period_end - NOW())::INTEGER >= 0
    ))
    AND (NOT p_near_usage_limit OR (
      -- Check if user is near their plan limits
      p.subscription_plan = 'free' AND (
        (SELECT COUNT(*) FROM posts WHERE profile_id = p.clerk_id AND created_at >= date_trunc('month', NOW())) >= 45
        OR (SELECT COUNT(*) FROM follows WHERE follower_id = p.clerk_id) >= 90
      )
    ))
    AND (NOT p_recently_downgraded OR (
      EXISTS (
        SELECT 1 FROM user_account_history uah
        WHERE uah.user_id = p.clerk_id
        AND uah.action_type = 'account_modified'
        AND uah.details->>'subscription_change' = 'downgrade'
        AND uah.created_at >= NOW() - INTERVAL '30 days'
      )
    ))
    AND (NOT p_recently_upgraded OR (
      EXISTS (
        SELECT 1 FROM user_account_history uah
        WHERE uah.user_id = p.clerk_id
        AND uah.action_type = 'account_modified'
        AND uah.details->>'subscription_change' = 'upgrade'
        AND uah.created_at >= NOW() - INTERVAL '30 days'
      )
    ));
END;
$$ LANGUAGE plpgsql;

-- Search users by engagement criteria
CREATE OR REPLACE FUNCTION search_users_by_engagement(
  p_min_profile_views INTEGER DEFAULT NULL,
  p_min_followers INTEGER DEFAULT NULL,
  p_max_followers INTEGER DEFAULT NULL,
  p_follows_many_few_followers BOOLEAN DEFAULT FALSE,
  p_likes_but_no_posts BOOLEAN DEFAULT FALSE,
  p_received_messages_no_response BOOLEAN DEFAULT FALSE,
  p_posting_spike_last_7_days BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  clerk_id TEXT,
  display_name TEXT,
  email TEXT,
  profile_views_count BIGINT,
  followers_count BIGINT,
  following_count BIGINT,
  posts_count BIGINT,
  reactions_given_count BIGINT,
  messages_received_count BIGINT,
  messages_sent_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_engagement AS (
    SELECT
      p.clerk_id,
      p.display_name,
      p.email,
      -- Profile views this week (last 7 days) - use aggregated data if available, fallback to raw data
      (
        SELECT COALESCE(
          (SELECT SUM(view_count) FROM profile_views_aggregated 
           WHERE profile_views_aggregated.profile_id = p.clerk_id 
           AND profile_views_aggregated.period_type = 'daily' 
           AND profile_views_aggregated.period_start >= date_trunc('day', NOW() - INTERVAL '7 days')),
          (SELECT COUNT(*) FROM profile_views 
           WHERE profile_views.profile_id = p.clerk_id 
           AND profile_views.viewed_at >= NOW() - INTERVAL '7 days')
        )
      ) as profile_views_count,
      (SELECT COUNT(*) FROM follows WHERE follows.following_id = p.clerk_id) as followers_count,
      (SELECT COUNT(*) FROM follows WHERE follows.follower_id = p.clerk_id) as following_count,
      (SELECT COUNT(*) FROM posts WHERE posts.profile_id = p.clerk_id) as posts_count,
      (SELECT COUNT(*) FROM post_reactions WHERE post_reactions.user_id = p.clerk_id) as reactions_given_count,
      (SELECT COUNT(*) FROM messages WHERE messages.recipient_id = p.clerk_id) as messages_received_count,
      (SELECT COUNT(*) FROM messages WHERE messages.sender_id = p.clerk_id) as messages_sent_count
    FROM profiles p
  )
  SELECT
    ue.clerk_id,
    ue.display_name,
    ue.email,
    ue.profile_views_count,
    ue.followers_count,
    ue.following_count,
    ue.posts_count,
    ue.reactions_given_count,
    ue.messages_received_count,
    ue.messages_sent_count
  FROM user_engagement ue
  WHERE
    (p_min_profile_views IS NULL OR ue.profile_views_count >= p_min_profile_views)
    AND (p_min_followers IS NULL OR ue.followers_count >= p_min_followers)
    AND (p_max_followers IS NULL OR ue.followers_count <= p_max_followers)
    AND (NOT p_follows_many_few_followers OR (ue.following_count > 50 AND ue.followers_count < 10))
    AND (NOT p_likes_but_no_posts OR (ue.reactions_given_count > 0 AND ue.posts_count = 0))
    AND (NOT p_received_messages_no_response OR (
      ue.messages_received_count > 0 
      AND NOT EXISTS (
        SELECT 1 FROM messages m
        WHERE m.recipient_id = ue.clerk_id
        AND EXISTS (
          SELECT 1 FROM messages m2
          WHERE m2.sender_id = ue.clerk_id
          AND m2.conversation_id = m.conversation_id
          AND m2.created_at > m.created_at
        )
      )
    ))
    AND (NOT p_posting_spike_last_7_days OR (
      (SELECT COUNT(*) FROM posts WHERE profile_id = ue.clerk_id AND created_at >= NOW() - INTERVAL '7 days') > 
      (SELECT AVG(weekly_posts) FROM (
        SELECT COUNT(*) / NULLIF(EXTRACT(WEEK FROM NOW() - created_at), 0) as weekly_posts
        FROM posts
        WHERE profile_id = ue.clerk_id
        AND created_at < NOW() - INTERVAL '7 days'
        GROUP BY EXTRACT(WEEK FROM created_at)
      ) sub) * 2
    ));
END;
$$ LANGUAGE plpgsql;

-- Search users by profile criteria
CREATE OR REPLACE FUNCTION search_users_by_profile(
  p_incomplete_profile BOOLEAN DEFAULT FALSE,
  p_no_portfolio_items BOOLEAN DEFAULT FALSE,
  p_portfolio_updated_days INTEGER DEFAULT NULL,
  p_outdated_projects_months INTEGER DEFAULT NULL,
  p_updated_portfolio_recently BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  clerk_id TEXT,
  display_name TEXT,
  email TEXT,
  bio TEXT,
  location TEXT,
  portfolio_items_count BIGINT,
  last_portfolio_update TIMESTAMP WITH TIME ZONE,
  profile_completeness_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH profile_data AS (
    SELECT
      p.clerk_id,
      p.display_name,
      p.email,
      p.bio,
      p.location,
      (SELECT COUNT(*) FROM portfolio_items WHERE profile_id = p.clerk_id) as portfolio_items_count,
      (SELECT MAX(created_at) FROM portfolio_items WHERE profile_id = p.clerk_id) as last_portfolio_update,
      (
        CASE WHEN p.display_name IS NOT NULL AND p.display_name != '' THEN 20 ELSE 0 END +
        CASE WHEN p.bio IS NOT NULL AND p.bio != '' THEN 20 ELSE 0 END +
        CASE WHEN p.location IS NOT NULL AND p.location != '' THEN 15 ELSE 0 END +
        CASE WHEN p.avatar_url IS NOT NULL AND p.avatar_url != '' THEN 15 ELSE 0 END +
        CASE WHEN p.skills IS NOT NULL AND array_length(p.skills, 1) > 0 THEN 15 ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM portfolio_items WHERE profile_id = p.clerk_id) THEN 15 ELSE 0 END
      ) as profile_completeness_score
    FROM profiles p
  )
  SELECT
    pd.clerk_id,
    pd.display_name,
    pd.email,
    pd.bio,
    pd.location,
    pd.portfolio_items_count,
    pd.last_portfolio_update,
    pd.profile_completeness_score
  FROM profile_data pd
  WHERE
    (NOT p_incomplete_profile OR pd.profile_completeness_score < 70)
    AND (NOT p_no_portfolio_items OR pd.portfolio_items_count = 0)
    AND (p_portfolio_updated_days IS NULL OR (
      pd.last_portfolio_update IS NOT NULL 
      AND pd.last_portfolio_update >= NOW() - (p_portfolio_updated_days || ' days')::INTERVAL
    ))
    AND (p_outdated_projects_months IS NULL OR (
      pd.last_portfolio_update IS NOT NULL 
      AND pd.last_portfolio_update < NOW() - (p_outdated_projects_months || ' months')::INTERVAL
    ))
    AND (NOT p_updated_portfolio_recently OR (
      pd.last_portfolio_update IS NOT NULL 
      AND pd.last_portfolio_update >= NOW() - INTERVAL '7 days'
    ));
END;
$$ LANGUAGE plpgsql;

-- Search users by moderation criteria
CREATE OR REPLACE FUNCTION search_users_by_moderation(
  p_min_flags INTEGER DEFAULT NULL,
  p_min_suspensions INTEGER DEFAULT NULL,
  p_posted_banned_content BOOLEAN DEFAULT FALSE,
  p_min_failed_logins INTEGER DEFAULT NULL
)
RETURNS TABLE (
  clerk_id TEXT,
  display_name TEXT,
  email TEXT,
  flags_count BIGINT,
  suspensions_count BIGINT,
  warnings_count BIGINT,
  failed_logins_count BIGINT,
  has_banned_content BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH moderation_data AS (
    SELECT
      p.clerk_id,
      p.display_name,
      p.email,
      (SELECT COUNT(*) FROM reports WHERE reported_type = 'profile' AND reported_id = p.clerk_id) as flags_count,
      (SELECT COUNT(*) FROM user_account_history 
       WHERE user_id = p.clerk_id AND action_type = 'user_suspended') as suspensions_count,
      (SELECT COUNT(*) FROM content_warnings WHERE user_id = p.clerk_id) as warnings_count,
      (SELECT COUNT(*) FROM blocked_content_attempts WHERE user_id = p.clerk_id) as failed_logins_count,
      EXISTS (
        SELECT 1 FROM blocked_content_attempts 
        WHERE user_id = p.clerk_id 
        AND severity IN ('high', 'critical')
      ) as has_banned_content
    FROM profiles p
  )
  SELECT
    md.clerk_id,
    md.display_name,
    md.email,
    md.flags_count,
    md.suspensions_count,
    md.warnings_count,
    md.failed_logins_count,
    md.has_banned_content
  FROM moderation_data md
  WHERE
    (p_min_flags IS NULL OR md.flags_count >= p_min_flags)
    AND (p_min_suspensions IS NULL OR md.suspensions_count >= p_min_suspensions)
    AND (NOT p_posted_banned_content OR md.has_banned_content)
    AND (p_min_failed_logins IS NULL OR md.failed_logins_count >= p_min_failed_logins);
END;
$$ LANGUAGE plpgsql;

-- Comprehensive user search combining all criteria
-- Drop all existing versions first to avoid function overloading conflicts
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all versions of search_users_comprehensive
  FOR r IN 
    SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
    FROM pg_proc
    WHERE proname = 'search_users_comprehensive'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS public.search_users_comprehensive(' || r.args || ') CASCADE';
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION search_users_comprehensive(
  -- Activity filters
  p_min_days_active INTEGER DEFAULT NULL,
  p_max_days_inactive INTEGER DEFAULT NULL,
  p_min_posts INTEGER DEFAULT NULL,
  p_max_posts INTEGER DEFAULT NULL,
  p_min_days_since_last_post INTEGER DEFAULT NULL,
  p_never_posted BOOLEAN DEFAULT FALSE,
  -- Subscription filters
  p_plan_name TEXT DEFAULT NULL,
  p_is_suspended BOOLEAN DEFAULT NULL,
  p_subscription_expires_days INTEGER DEFAULT NULL,
  -- Engagement filters
  p_min_profile_views INTEGER DEFAULT NULL,
  p_min_profile_views_operator TEXT DEFAULT '>=',
  p_min_profile_views_period_start TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_min_profile_views_period_end TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_min_followers INTEGER DEFAULT NULL,
  -- Profile filters
  p_incomplete_profile BOOLEAN DEFAULT FALSE,
  p_no_portfolio_items BOOLEAN DEFAULT FALSE,
  -- Moderation filters
  p_min_flags INTEGER DEFAULT NULL,
  p_min_suspensions INTEGER DEFAULT NULL,
  -- General filters
  p_joined_last_hours INTEGER DEFAULT NULL,
  p_returned_after_months INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  clerk_id TEXT,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  subscription_plan TEXT,
  is_suspended BOOLEAN,
  total_posts BIGINT,
  total_followers BIGINT,
  profile_views_count BIGINT,
  days_since_last_login INTEGER,
  flags_count BIGINT,
  suspensions_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH combined_data AS (
    SELECT
      p.clerk_id,
      p.display_name,
      p.email,
      p.created_at,
      p.subscription_plan,
      p.is_suspended,
      (SELECT COUNT(*) FROM posts WHERE posts.profile_id = p.clerk_id) as total_posts,
      (SELECT COUNT(*) FROM follows WHERE follows.following_id = p.clerk_id) as total_followers,
      -- Profile views for specified time period (or all time if not specified) - use aggregated data if available, fallback to raw data
      (
        SELECT COALESCE(
          (SELECT SUM(view_count) FROM profile_views_aggregated 
           WHERE profile_views_aggregated.profile_id = p.clerk_id 
           AND profile_views_aggregated.period_type = 'daily' 
           AND (p_min_profile_views_period_start IS NULL OR profile_views_aggregated.period_start >= date_trunc('day', p_min_profile_views_period_start))
           AND (p_min_profile_views_period_end IS NULL OR profile_views_aggregated.period_start < date_trunc('day', p_min_profile_views_period_end))),
          (SELECT COUNT(*) FROM profile_views 
           WHERE profile_views.profile_id = p.clerk_id 
           AND (p_min_profile_views_period_start IS NULL OR profile_views.viewed_at >= p_min_profile_views_period_start)
           AND (p_min_profile_views_period_end IS NULL OR profile_views.viewed_at < p_min_profile_views_period_end))
        )
      ) as profile_views_count,
      (SELECT EXTRACT(DAY FROM NOW() - MAX(visits.visited_at))::INTEGER FROM visits WHERE visits.user_id = p.clerk_id) as days_since_last_login,
      (SELECT COUNT(*) FROM reports WHERE reports.reported_type = 'profile' AND reports.reported_id = p.clerk_id) as flags_count,
      (SELECT COUNT(*) FROM user_account_history 
       WHERE user_account_history.user_id = p.clerk_id AND user_account_history.action_type = 'user_suspended') as suspensions_count
    FROM profiles p
  )
  SELECT
    cd.clerk_id,
    cd.display_name,
    cd.email,
    cd.created_at,
    cd.subscription_plan,
    cd.is_suspended,
    cd.total_posts,
    cd.total_followers,
    cd.profile_views_count,
    cd.days_since_last_login,
    cd.flags_count,
    cd.suspensions_count
  FROM combined_data cd
  WHERE
    -- Activity filters
    (p_min_days_active IS NULL OR cd.days_since_last_login <= p_min_days_active)
    AND (p_max_days_inactive IS NULL OR cd.days_since_last_login >= p_max_days_inactive)
    AND (p_min_posts IS NULL OR cd.total_posts >= p_min_posts)
    AND (p_max_posts IS NULL OR cd.total_posts <= p_max_posts)
    AND (p_min_days_since_last_post IS NULL OR (
      SELECT EXTRACT(DAY FROM NOW() - MAX(posts.created_at))::INTEGER 
      FROM posts WHERE posts.profile_id = cd.clerk_id
    ) >= p_min_days_since_last_post)
    AND (NOT p_never_posted OR cd.total_posts = 0)
    -- Subscription filters
    AND (p_plan_name IS NULL OR cd.subscription_plan = p_plan_name)
    AND (p_is_suspended IS NULL OR cd.is_suspended = p_is_suspended)
    AND (p_subscription_expires_days IS NULL OR EXISTS (
      SELECT 1 FROM user_subscriptions us
      WHERE us.user_id = cd.clerk_id
      AND us.current_period_end IS NOT NULL
      AND EXTRACT(DAY FROM us.current_period_end - NOW())::INTEGER <= p_subscription_expires_days
      AND EXTRACT(DAY FROM us.current_period_end - NOW())::INTEGER >= 0
    ))
    -- Engagement filters
    AND (p_min_profile_views IS NULL OR 
      CASE 
        WHEN p_min_profile_views_operator = '=' OR p_min_profile_views_operator = 'equals' THEN cd.profile_views_count = p_min_profile_views
        WHEN p_min_profile_views_operator = '>' OR p_min_profile_views_operator = 'greater_than' THEN cd.profile_views_count > p_min_profile_views
        WHEN p_min_profile_views_operator = '>=' OR p_min_profile_views_operator = 'greater_than_or_equal' THEN cd.profile_views_count >= p_min_profile_views
        WHEN p_min_profile_views_operator = '<' OR p_min_profile_views_operator = 'less_than' THEN cd.profile_views_count < p_min_profile_views
        WHEN p_min_profile_views_operator = '<=' OR p_min_profile_views_operator = 'less_than_or_equal' THEN cd.profile_views_count <= p_min_profile_views
        ELSE cd.profile_views_count >= p_min_profile_views
      END)
    AND (p_min_followers IS NULL OR cd.total_followers >= p_min_followers)
    -- Profile filters
    AND (NOT p_incomplete_profile OR (
      (SELECT COUNT(*) FROM portfolio_items WHERE portfolio_items.profile_id = cd.clerk_id) = 0
      OR (SELECT profiles.bio FROM profiles WHERE profiles.clerk_id = cd.clerk_id) IS NULL
    ))
    AND (NOT p_no_portfolio_items OR (SELECT COUNT(*) FROM portfolio_items WHERE portfolio_items.profile_id = cd.clerk_id) = 0)
    -- Moderation filters
    AND (p_min_flags IS NULL OR cd.flags_count >= p_min_flags)
    AND (p_min_suspensions IS NULL OR cd.suspensions_count >= p_min_suspensions)
    -- General filters
    AND (p_joined_last_hours IS NULL OR cd.created_at >= NOW() - (p_joined_last_hours || ' hours')::INTERVAL)
    AND (p_returned_after_months IS NULL OR EXISTS (
      SELECT 1 FROM visits v1
      WHERE v1.user_id = cd.clerk_id
      AND v1.visited_at >= NOW() - INTERVAL '7 days'
      AND EXISTS (
        SELECT 1 FROM visits v2
        WHERE v2.user_id = cd.clerk_id
        AND v2.visited_at < NOW() - (p_returned_after_months || ' months')::INTERVAL
        AND v2.visited_at > NOW() - (p_returned_after_months || ' months')::INTERVAL - INTERVAL '7 days'
      )
    ))
  ORDER BY cd.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_profile_created ON posts(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_user_visited ON visits(user_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_views_profile_id ON profile_views(profile_id);
-- Index already exists in reports-schema.sql: idx_reports_reported_id
CREATE INDEX IF NOT EXISTS idx_user_account_history_user_action ON user_account_history(user_id, action_type);

