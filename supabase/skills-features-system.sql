-- Skills-based features system
-- Includes skills matching, endorsements, and analytics

-- Skills Endorsements Table
CREATE TABLE IF NOT EXISTS skill_endorsements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endorser_id TEXT NOT NULL, -- Clerk ID of person giving endorsement
  endorsee_id TEXT NOT NULL, -- Clerk ID of person receiving endorsement
  skill_name TEXT NOT NULL, -- The skill being endorsed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (endorser_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  FOREIGN KEY (endorsee_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  UNIQUE(endorser_id, endorsee_id, skill_name), -- One endorsement per skill per person
  CHECK (endorser_id != endorsee_id) -- Prevent self-endorsement
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_skill_endorsements_endorsee ON skill_endorsements(endorsee_id);
CREATE INDEX IF NOT EXISTS idx_skill_endorsements_endorser ON skill_endorsements(endorser_id);
CREATE INDEX IF NOT EXISTS idx_skill_endorsements_skill ON skill_endorsements(skill_name);
CREATE INDEX IF NOT EXISTS idx_skill_endorsements_endorsee_skill ON skill_endorsements(endorsee_id, skill_name);

-- Skills Analytics/Stats Table (for tracking skill popularity)
CREATE TABLE IF NOT EXISTS skill_stats (
  skill_name TEXT PRIMARY KEY,
  user_count INTEGER DEFAULT 0, -- Number of users with this skill
  endorsement_count INTEGER DEFAULT 0, -- Total number of endorsements
  search_count INTEGER DEFAULT 0, -- How many times this skill has been searched
  trending_score NUMERIC DEFAULT 0, -- Calculated trending score
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to get users with similar skills
DROP FUNCTION IF EXISTS get_users_with_similar_skills(TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION get_users_with_similar_skills(
  p_user_id TEXT,
  p_limit INTEGER DEFAULT 10,
  p_min_common_skills INTEGER DEFAULT 1
)
RETURNS TABLE (
  clerk_id TEXT,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  common_skills TEXT[],
  common_skills_count INTEGER,
  total_skills_count INTEGER,
  is_verified BOOLEAN,
  subscription_plan TEXT,
  featured_priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH user_skills AS (
    -- Get all skills for the requesting user (from multiple sources)
    SELECT DISTINCT skill_name
    FROM (
      -- From profiles.skills array
      SELECT UNNEST(pu.skills) as skill_name
      FROM profiles pu
      WHERE pu.clerk_id = p_user_id AND pu.skills IS NOT NULL
      
      UNION
      
      -- From portfolio_skills table
      SELECT skill_name
      FROM portfolio_skills
      WHERE profile_id = p_user_id
      
      UNION
      
      -- From profile_skills table
      SELECT skill_name
      FROM profile_skills
      WHERE profile_id = p_user_id
    ) all_skills
    WHERE skill_name IS NOT NULL AND skill_name != ''
  ),
  other_users_skills AS (
    -- Get skills for all other users
    SELECT 
      p.clerk_id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.bio,
      p.is_verified,
      p.subscription_plan,
      COALESCE(p.featured_priority, 0) as featured_priority,
      ARRAY_AGG(DISTINCT ps.skill_name) FILTER (WHERE ps.skill_name IS NOT NULL AND ps.skill_name != '') as skills_array
    FROM profiles p
    LEFT JOIN (
      SELECT ps1.profile_id, ps1.skill_name
      FROM portfolio_skills ps1
      UNION
      SELECT ps2.profile_id, ps2.skill_name
      FROM profile_skills ps2
      UNION
      SELECT p3.clerk_id as profile_id, UNNEST(p3.skills) as skill_name
      FROM profiles p3
      WHERE p3.skills IS NOT NULL
    ) ps ON ps.profile_id = p.clerk_id
    WHERE p.clerk_id != p_user_id
      AND p.profile_status = 'approved'
      AND p.is_suspended = FALSE
      AND COALESCE((p.settings->'privacy'->>'allowSearch')::boolean, true) IS NOT FALSE
    GROUP BY p.clerk_id, p.username, p.display_name, p.avatar_url, p.bio, p.is_verified, p.subscription_plan, p.featured_priority
  )
  SELECT 
    ous.clerk_id,
    ous.username,
    ous.display_name,
    ous.avatar_url,
    ous.bio,
    ARRAY(
      SELECT skill FROM UNNEST(ous.skills_array) skill
      WHERE skill = ANY(SELECT skill_name FROM user_skills)
    ) as common_skills,
    (
      SELECT COUNT(*)::INTEGER
      FROM UNNEST(ous.skills_array) skill
      WHERE skill = ANY(SELECT skill_name FROM user_skills)
    ) as common_skills_count,
    ARRAY_LENGTH(ous.skills_array, 1)::INTEGER as total_skills_count,
    ous.is_verified,
    ous.subscription_plan,
    ous.featured_priority
  FROM other_users_skills ous
  WHERE (
    SELECT COUNT(*)::INTEGER
    FROM UNNEST(ous.skills_array) skill
    WHERE skill = ANY(SELECT skill_name FROM user_skills)
  ) >= p_min_common_skills
  ORDER BY 
    common_skills_count DESC, -- Most common skills first
    featured_priority DESC, -- Featured users first
    ous.display_name ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search users by skills
DROP FUNCTION IF EXISTS search_users_by_skills(TEXT[], INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION search_users_by_skills(
  p_skill_names TEXT[],
  p_limit INTEGER DEFAULT 50,
  p_min_matching_skills INTEGER DEFAULT 1
)
RETURNS TABLE (
  clerk_id TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  matching_skills TEXT[],
  matching_skills_count INTEGER,
  total_skills_count INTEGER,
  is_verified BOOLEAN,
  subscription_plan TEXT,
  featured_priority INTEGER,
  endorsement_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH user_skills AS (
    SELECT 
      p.clerk_id,
      p.display_name,
      p.avatar_url,
      p.bio,
      p.is_verified,
      p.subscription_plan,
      COALESCE(p.featured_priority, 0) as featured_priority,
      ARRAY_AGG(DISTINCT ps.skill_name) FILTER (WHERE ps.skill_name IS NOT NULL AND ps.skill_name != '') as skills_array
    FROM profiles p
    LEFT JOIN (
      SELECT ps1.profile_id, ps1.skill_name
      FROM portfolio_skills ps1
      UNION
      SELECT ps2.profile_id, ps2.skill_name
      FROM profile_skills ps2
      UNION
      SELECT p3.clerk_id as profile_id, UNNEST(p3.skills) as skill_name
      FROM profiles p3
      WHERE p3.skills IS NOT NULL
    ) ps ON ps.profile_id = p.clerk_id
    WHERE p.profile_status = 'approved'
      AND p.is_suspended = FALSE
      AND COALESCE((p.settings->'privacy'->>'allowSearch')::boolean, true) IS NOT FALSE
    GROUP BY p.clerk_id, p.display_name, p.avatar_url, p.bio, p.is_verified, p.subscription_plan, p.featured_priority
  ),
  matching_users AS (
    SELECT 
      us.clerk_id,
      us.display_name,
      us.avatar_url,
      us.bio,
      us.is_verified,
      us.subscription_plan,
      us.featured_priority,
      us.skills_array,
      ARRAY(
        SELECT skill FROM UNNEST(us.skills_array) skill
        WHERE skill = ANY(p_skill_names)
      ) as matching_skills,
      (
        SELECT COUNT(*)::INTEGER
        FROM UNNEST(us.skills_array) skill
        WHERE skill = ANY(p_skill_names)
      ) as matching_count
    FROM user_skills us
    WHERE (
      SELECT COUNT(*)::INTEGER
      FROM UNNEST(us.skills_array) skill
      WHERE skill = ANY(p_skill_names)
    ) >= p_min_matching_skills
  )
  SELECT 
    mu.clerk_id,
    mu.display_name,
    mu.avatar_url,
    mu.bio,
    mu.matching_skills,
    mu.matching_count,
    ARRAY_LENGTH(mu.skills_array, 1)::INTEGER as total_skills_count,
    mu.is_verified,
    mu.subscription_plan,
    mu.featured_priority,
    COALESCE((
      SELECT COUNT(*)::INTEGER
      FROM skill_endorsements se
      WHERE se.endorsee_id = mu.clerk_id
        AND se.skill_name = ANY(mu.matching_skills)
    ), 0) as endorsement_count
  FROM matching_users mu
  ORDER BY 
    mu.matching_count DESC, -- Most matching skills first
    mu.featured_priority DESC, -- Featured users first
    endorsement_count DESC, -- Most endorsed first
    mu.display_name ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get skill endorsements for a user
DROP FUNCTION IF EXISTS get_user_skill_endorsements(TEXT, TEXT);
CREATE OR REPLACE FUNCTION get_user_skill_endorsements(
  p_user_id TEXT,
  p_skill_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  skill_name TEXT,
  endorsement_count INTEGER,
  endorsers TEXT[] -- Array of endorser display names
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    se.skill_name,
    COUNT(*)::INTEGER as endorsement_count,
    ARRAY_AGG(p.display_name ORDER BY se.created_at DESC) as endorsers
  FROM skill_endorsements se
  JOIN profiles p ON p.clerk_id = se.endorser_id
  WHERE se.endorsee_id = p_user_id
    AND (p_skill_name IS NULL OR se.skill_name = p_skill_name)
  GROUP BY se.skill_name
  ORDER BY endorsement_count DESC, se.skill_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get popular/trending skills
DROP FUNCTION IF EXISTS get_trending_skills(INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION get_trending_skills(
  p_limit INTEGER DEFAULT 20,
  p_min_users INTEGER DEFAULT 2
)
RETURNS TABLE (
  skill_name TEXT,
  user_count INTEGER,
  endorsement_count INTEGER,
  search_count INTEGER,
  trending_score NUMERIC,
  growth_rate NUMERIC -- Percentage growth in last 30 days
) AS $$
BEGIN
  RETURN QUERY
  WITH skill_usage AS (
    SELECT 
      all_skills.skill_name,
      COUNT(DISTINCT all_skills.profile_id)::INTEGER as user_count
    FROM (
      SELECT p1.clerk_id as profile_id, UNNEST(p1.skills) as skill_name
      FROM profiles p1
      WHERE p1.skills IS NOT NULL
      
      UNION
      
      SELECT ps1.profile_id, ps1.skill_name
      FROM portfolio_skills ps1
      
      UNION
      
      SELECT ps2.profile_id, ps2.skill_name
      FROM profile_skills ps2
    ) all_skills
    WHERE all_skills.skill_name IS NOT NULL AND all_skills.skill_name != ''
    GROUP BY all_skills.skill_name
  ),
  skill_endorsements_count AS (
    SELECT 
      se1.skill_name,
      COUNT(*)::INTEGER as endorsement_count
    FROM skill_endorsements se1
    GROUP BY se1.skill_name
  ),
  recent_endorsements AS (
    SELECT 
      se2.skill_name,
      COUNT(*)::INTEGER as recent_count
    FROM skill_endorsements se2
    WHERE se2.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY se2.skill_name
  )
  SELECT 
    su.skill_name,
    su.user_count,
    COALESCE(sec.endorsement_count, 0)::INTEGER as endorsement_count,
    COALESCE(ss.search_count, 0)::INTEGER as search_count,
    (
      (su.user_count * 1.0) +
      (COALESCE(sec.endorsement_count, 0) * 2.0) +
      (COALESCE(ss.search_count, 0) * 0.5) +
      (COALESCE(re.recent_count, 0) * 3.0)
    ) as trending_score,
    CASE 
      WHEN COALESCE(sec.endorsement_count, 0) > 0 THEN
        (COALESCE(re.recent_count, 0)::NUMERIC / COALESCE(sec.endorsement_count, 0)::NUMERIC) * 100
      ELSE 0
    END as growth_rate
  FROM skill_usage su
  LEFT JOIN skill_endorsements_count sec ON sec.skill_name = su.skill_name
  LEFT JOIN skill_stats ss ON ss.skill_name = su.skill_name
  LEFT JOIN recent_endorsements re ON re.skill_name = su.skill_name
  WHERE su.user_count >= p_min_users
  ORDER BY trending_score DESC, su.user_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add/remove skill endorsement
DROP FUNCTION IF EXISTS toggle_skill_endorsement(TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION toggle_skill_endorsement(
  p_endorser_id TEXT,
  p_endorsee_id TEXT,
  p_skill_name TEXT
)
RETURNS JSON AS $$
DECLARE
  v_exists BOOLEAN;
  v_result JSON;
BEGIN
  -- Check if endorsement already exists
  SELECT EXISTS(
    SELECT 1 FROM skill_endorsements
    WHERE endorser_id = p_endorser_id
      AND endorsee_id = p_endorsee_id
      AND skill_name = p_skill_name
  ) INTO v_exists;

  IF v_exists THEN
    -- Remove endorsement
    DELETE FROM skill_endorsements
    WHERE endorser_id = p_endorser_id
      AND endorsee_id = p_endorsee_id
      AND skill_name = p_skill_name;
    
    v_result := json_build_object(
      'action', 'removed',
      'endorsement_count', (
        SELECT COUNT(*)::INTEGER
        FROM skill_endorsements
        WHERE endorsee_id = p_endorsee_id
          AND skill_name = p_skill_name
      )
    );
  ELSE
    -- Add endorsement
    INSERT INTO skill_endorsements (endorser_id, endorsee_id, skill_name)
    VALUES (p_endorser_id, p_endorsee_id, p_skill_name);
    
    v_result := json_build_object(
      'action', 'added',
      'endorsement_count', (
        SELECT COUNT(*)::INTEGER
        FROM skill_endorsements
        WHERE endorsee_id = p_endorsee_id
          AND skill_name = p_skill_name
      )
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update skill_stats when endorsements change
CREATE OR REPLACE FUNCTION update_skill_stats_on_endorsement()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO skill_stats (skill_name, endorsement_count, last_updated)
    VALUES (NEW.skill_name, 1, NOW())
    ON CONFLICT (skill_name) 
    DO UPDATE SET 
      endorsement_count = skill_stats.endorsement_count + 1,
      last_updated = NOW();
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE skill_stats
    SET endorsement_count = GREATEST(0, endorsement_count - 1),
        last_updated = NOW()
    WHERE skill_name = OLD.skill_name;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_skill_stats_on_endorsement ON skill_endorsements;
CREATE TRIGGER trigger_update_skill_stats_on_endorsement
AFTER INSERT OR DELETE ON skill_endorsements
FOR EACH ROW
EXECUTE FUNCTION update_skill_stats_on_endorsement();

-- Comments
COMMENT ON FUNCTION get_users_with_similar_skills IS 'Returns users with similar skills to the given user, ordered by number of common skills';
COMMENT ON FUNCTION search_users_by_skills IS 'Searches for users who have any of the specified skills';
COMMENT ON FUNCTION get_user_skill_endorsements IS 'Returns skill endorsements for a user, optionally filtered by skill name';
COMMENT ON FUNCTION get_trending_skills IS 'Returns trending/popular skills based on usage, endorsements, and search frequency';
COMMENT ON FUNCTION toggle_skill_endorsement IS 'Adds or removes a skill endorsement (toggles if exists)';

